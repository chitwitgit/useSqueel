import { Broadcaster } from "../multitabs/broadcast";
import { extractTables } from "../subscriptions/dependency";
import { RPC } from "../worker/rpc";
import { isSqlStatement } from "./sql";
import { ExecResult, SqlValue, SqueelClient, SqueelClientConfig, Tx } from "./types";

export class SqueelClientImpl implements SqueelClient {
  private rpc: RPC;
  private invalidationHandlers = new Set<(tables: string[]) => void>();
  private broadcaster: Broadcaster | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private config: SqueelClientConfig) {
    let worker: Worker;
    if (config.worker?.url) {
      worker = new Worker(config.worker.url, { type: "module" });
    } else {
      worker = new Worker(
        new URL("./worker.mjs", import.meta.url),
        {
          type: "module",
        }
      );
    }
    console.log("Creating worker...");
    worker.onerror = (e) => {
      console.error("Worker error:", e);
      if (e instanceof ErrorEvent) {
        console.error("Worker error details:", {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          error: e.error,
        });
      }
    };
    this.rpc = new RPC(worker);

    if (config.multiTab?.enabled !== false) {
      const channelName = config.multiTab?.channelName || `use-squeel:${config.dbName}`;
      this.broadcaster = new Broadcaster(channelName, (tables) => {
        this.notifyInvalidation(tables, false);
      });
    }
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log("Initializing SqueelClient...");
      await this.rpc.request({
        type: "init",
        dbName: this.config.dbName,
        storage: this.config.storage,
        migrations: this.config.migrations,
        pragma: this.config.pragma,
      });
    })();

    return this.initPromise;
  }

  async query<T = any>(
    sqlOrStmt: string | { sql: string; params: readonly any[] },
    params: readonly any[] = []
  ): Promise<T[]> {
    const sql = isSqlStatement(sqlOrStmt) ? sqlOrStmt.sql : (sqlOrStmt as string);
    const finalParams = isSqlStatement(sqlOrStmt) ? sqlOrStmt.params : params;

    const res = await this.rpc.request({ type: "query", sql, params: finalParams as any[] });
    if (res.type === "queryResult") {
      return res.rows;
    }
    throw new Error("Unexpected response type");
  }

  async exec(
    sqlOrStmt: string | { sql: string; params: readonly any[] },
    params: readonly any[] = []
  ): Promise<ExecResult> {
    const sql = isSqlStatement(sqlOrStmt) ? sqlOrStmt.sql : (sqlOrStmt as string);
    const finalParams = isSqlStatement(sqlOrStmt) ? sqlOrStmt.params : params;

    const res = await this.rpc.request({ type: "exec", sql, params: finalParams as any[] });
    if (res.type === "execResult") {
      const tables = extractTables(sql);
      this.notifyInvalidation(tables ? Array.from(tables) : ["*"]);
      return { changes: res.changes, lastInsertRowid: res.lastInsertRowid };
    }
    throw new Error("Unexpected response type");
  }

  async transaction<T>(fn: (db: Tx) => Promise<T>): Promise<T> {
    const statements: { sql: string; params: any[] }[] = [];
    const self = this;
    
    // We need to keep track of query results during the transaction
    // and also allow nested .transaction() calls to collect statements.
    const tx: Tx = {
      async exec(sqlOrStmt, params = []) {
        const sql = isSqlStatement(sqlOrStmt) ? sqlOrStmt.sql : (sqlOrStmt as string);
        const finalParams = isSqlStatement(sqlOrStmt) ? sqlOrStmt.params : params;
        statements.push({ sql, params: finalParams as any[] });
        return { changes: 0 };
      },
      async query(sqlOrStmt, params = []) {
        // Querying during a transaction builder is tricky because
        // the statements haven't been flushed to the DB yet.
        // For now, we query the current state of the DB.
        return self.query(sqlOrStmt, params);
      },
    };

    const result = await fn(tx);
    
    if (statements.length === 0) return result;

    const res = await this.rpc.request({ type: "transaction", statements });
    if (res.type === "execResult") {
      const allTables = new Set<string>();
      for (const stmt of statements) {
        const tables = extractTables(stmt.sql);
        if (tables) {
          tables.forEach(t => allTables.add(t));
        } else {
          allTables.add("*");
        }
      }
      this.notifyInvalidation(Array.from(allTables));
      return result;
    }
    throw new Error("Transaction failed");
  }

  onInvalidate(handler: (tables: string[]) => void): () => void {
    this.invalidationHandlers.add(handler);
    return () => this.invalidationHandlers.delete(handler);
  }

  notifyInvalidation(tables: string[], broadcast = true) {
    for (const handler of this.invalidationHandlers) {
      handler(tables);
    }
    if (broadcast && this.broadcaster) {
      this.broadcaster.broadcast(tables);
    }
  }

  async close(): Promise<void> {
    this.broadcaster?.close();
    await this.rpc.request({ type: "close" });
  }
}
