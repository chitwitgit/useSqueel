import { Migration } from "../client/types";
import { applyMigrations } from "../db/migrations";
import { SQLiteEngine } from "../db/sqlite/sqliteEngine";
import { WorkerMessage } from "./protocol";

const engine = new SQLiteEngine();
let lastInitConfig: { dbName: string; storage: any; migrations?: Migration[] } | null = null;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, req } = event.data;
  if (!req) return;

  const respond = (res: any) => {
    self.postMessage({ id, res });
  };

  try {
    switch (req.type) {
      case "init":
        await engine.init({
          dbName: req.dbName,
          storage: req.storage
        });
        lastInitConfig = { dbName: req.dbName, storage: req.storage, migrations: req.migrations };
        if (req.migrations) {
          await applyMigrations(engine, req.migrations);
        }
        respond({ type: "ready" });
        break;
      case "query":
        const rows = await engine.query(req.sql, req.params);
        respond({ type: "queryResult", rows });
        break;
      case "exec":
        const result = await engine.exec(req.sql, req.params);
        respond({ type: "execResult", ...result });
        break;
      case "transaction":
        // Basic serial execution for now
        let totalChanges = 0;
        await engine.exec("BEGIN IMMEDIATE", []);
        try {
          for (const stmt of req.statements) {
            const r = await engine.exec(stmt.sql, stmt.params);
            totalChanges += r.changes;
          }
          await engine.exec("COMMIT", []);
          respond({ type: "execResult", changes: totalChanges });
        } catch (e) {
          await engine.exec("ROLLBACK", []);
          throw e;
        }
        break;
      case "close":
        await engine.close();
        respond({ type: "ready" });
        break;
      default:
        respond({ type: "error", error: { message: `Unknown request type: ${(req as any).type}` } });
    }
  } catch (e: any) {
    respond({ type: "error", error: { message: e.message, stack: e.stack } });
  }
};
