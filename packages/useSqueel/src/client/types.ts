export type SqlValue = null | number | string | Uint8Array | boolean | unknown;

export type StorageMode = "opfs" | "memory";

export interface Migration {
  id: number;
  up: string;
  down?: string;
}

export interface SqueelClientConfig {
  dbName: string;
  storage: StorageMode;
  migrations?: Migration[];
  pragma?: Record<string, string | number>;
  worker?: {
    enabled: boolean;
    url?: URL;
  };
  subscriptions?: {
    rowHash?: (row: any) => string;
    resultEqual?: (a: any, b: any) => boolean;
    defaultDependsOn?: "all" | "parsed";
  };
  multiTab?: {
    enabled: boolean;
    channelName?: string;
  };
}

export interface ExecResult {
  changes: number;
  lastInsertRowid?: number;
}

export interface Tx {
  exec(sql: string | { sql: string; params: readonly SqlValue[] }, params?: readonly SqlValue[]): Promise<ExecResult>;
  query<T = any>(sql: string | { sql: string; params: readonly SqlValue[] }, params?: readonly SqlValue[]): Promise<T[]>;
}

export interface SqueelClient {
  init(): Promise<void>;
  query<T = any>(sql: string | { sql: string; params: readonly SqlValue[] }, params?: readonly SqlValue[]): Promise<T[]>;
  exec(sql: string | { sql: string; params: readonly SqlValue[] }, params?: readonly SqlValue[]): Promise<ExecResult>;
  transaction<T>(fn: (db: Tx) => Promise<T>): Promise<T>;
  onInvalidate(handler: (tables: string[]) => void): () => void;
  close(): Promise<void>;
}

export interface UseQueryOptions<T> {
  single?: boolean;
  default?: T;
  dependsOn?: string[];
  validate?: (data: unknown) => T;
}

export interface UseQueryResult<T> {
  status: "loading" | "ready" | "error";
  data: T;
  error: unknown | null;
  refetch: () => void;
}
