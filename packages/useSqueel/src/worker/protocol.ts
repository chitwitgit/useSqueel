import { Migration, SqlValue, StorageMode } from "../client/types";

export type Req =
  | { type: "init"; dbName: string; storage: StorageMode; pragma?: Record<string, any>; migrations?: Migration[] }
  | { type: "query"; sql: string; params: SqlValue[] }
  | { type: "exec"; sql: string; params: SqlValue[] }
  | { type: "transaction"; statements: { sql: string; params: SqlValue[] }[] }
  | { type: "close" }
  | { type: "export" }
  | { type: "import"; bytes: Uint8Array };

export type Res =
  | { type: "ready" }
  | { type: "queryResult"; rows: any[] }
  | { type: "execResult"; changes: number; lastInsertRowid?: number }
  | { type: "error"; error: { message: string; stack?: string } }
  | { type: "exportResult"; bytes: Uint8Array };

export interface WorkerMessage {
  id: string;
  req?: Req;
  res?: Res;
}
