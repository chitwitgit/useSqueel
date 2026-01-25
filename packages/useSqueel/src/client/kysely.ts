import {
  DatabaseConnection,
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
  QueryResult,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  CompiledQuery,
} from "kysely";
import { SqueelClient, SqlValue } from "./types";

export class SqueelDialect implements Dialect {
  constructor(private client: SqueelClient) {}

  createDriver(): Driver {
    return new SqueelDriver(this.client);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}

class SqueelDriver implements Driver {
  constructor(private client: SqueelClient) {}

  async init(): Promise<void> {
    await this.client.init();
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return new SqueelConnection(this.client);
  }

  async beginTransaction(
    connection: DatabaseConnection,
    _settings: any
  ): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("BEGIN", []));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("COMMIT", []));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("ROLLBACK", []));
  }

  async releaseConnection(_connection: DatabaseConnection): Promise<void> {
    // No-op
  }

  async destroy(): Promise<void> {
    await this.client.close();
  }
}

class SqueelConnection implements DatabaseConnection {
  constructor(private client: SqueelClient) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const { sql, parameters } = compiledQuery;
    const params = parameters as SqlValue[];

    // Kysely distinguishes between SELECT and other queries usually by the result,
    // but in Squeel we have query() and exec().
    // We'll use a simple heuristic or just use the response type.
    
    const isRead = sql.trim().toUpperCase().startsWith("SELECT") || 
                   sql.trim().toUpperCase().startsWith("WITH") ||
                   sql.trim().toUpperCase().startsWith("PRAGMA");

    if (isRead) {
      const rows = await this.client.query<R>(sql, params);
      return {
        rows,
      };
    } else {
      const result = await this.client.exec(sql, params);
      return {
        rows: [],
        numAffectedRows: BigInt(result.changes),
        insertId: result.lastInsertRowid !== undefined ? BigInt(result.lastInsertRowid) : undefined,
      };
    }
  }

  async *streamQuery<R>(
    _compiledQuery: CompiledQuery,
    _chunkSize: number
  ): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("SqueelDialect does not support streaming");
  }
}
