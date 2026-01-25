import sqlite3InitModule, { Database, Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { ExecResult, SqlValue } from "../../client/types";
import { Engine, EngineInit } from "../engine";

export class SQLiteEngine implements Engine {
  private db!: Database;
  private sqlite3!: Sqlite3Static;
  private initPromise: Promise<void> | null = null;

  async init(cfg: EngineInit): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log("SQLiteEngine.init starting with cfg:", cfg);

      this.sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      });

      if (cfg.storage === "opfs") {
        if ("opfs" in this.sqlite3) {
          this.db = new this.sqlite3.oo1.OpfsDb(cfg.dbName);
        } else {
          console.warn("OPFS not supported, falling back to memory");
          this.db = new this.sqlite3.oo1.DB();
        }
      } else {
        this.db = new this.sqlite3.oo1.DB();
      }

      // Enforce foreign keys on init
      this.db.exec("PRAGMA foreign_keys = ON;");
    })();

    return this.initPromise;
  }

  async query(sql: string, params: SqlValue[]): Promise<any[]> {
    return this.db.exec(sql, {
      bind: params as any,
      returnValue: "resultRows",
      rowMode: "object",
    }) as any[];
  }

  async exec(sql: string, params: SqlValue[]): Promise<ExecResult> {
    this.db.exec(sql, { bind: params as any });
    return {
      changes: this.db.changes(),
      lastInsertRowid: Number(
        this.sqlite3.capi.sqlite3_last_insert_rowid(this.db)
      ),
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }

  async export(): Promise<Uint8Array> {
    return this.sqlite3.capi.sqlite3_js_db_export(this.db);
  }

  async import(bytes: Uint8Array): Promise<void> {
    // Re-opening with bytes is engine specific
    throw new Error("Import not implemented yet");
  }

}
