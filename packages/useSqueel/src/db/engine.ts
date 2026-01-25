import { ExecResult, SqlValue } from "../client/types";

export interface EngineInit {
  dbName: string;
  storage: "opfs" | "memory";
}

export interface Engine {
  init(cfg: EngineInit): Promise<void>;
  query(sql: string, params: SqlValue[]): Promise<any[]>;
  exec(sql: string, params: SqlValue[]): Promise<ExecResult>;
  close(): Promise<void>;
  export?(): Promise<Uint8Array>;
  import?(bytes: Uint8Array): Promise<void>;
}
