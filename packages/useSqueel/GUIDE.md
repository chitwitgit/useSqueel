# useSqueel Documentation

`useSqueel` is a relational state management library for React that uses SQLite (WASM) as its core engine. It allows you to manage application state using SQL, providing ACID transactions, reactive queries, and persistent storage.

## Core Concepts

### 1. The Database is the Store
Instead of fragmented state objects or multiple stores, `useSqueel` uses a single SQLite database as the source of truth for your application state. This brings the power of relational data modeling (foreign keys, constraints, triggers) to the frontend.

### 2. Reactive Queries
Components subscribe to data using SQL `SELECT` statements via the `useQuery` hook. When the underlying data changes, only the components whose queries are affected will re-render.

### 3. ACID Transactions
All mutations are performed within transactions. This ensures that your state remains consistent even if complex multi-step updates are interrupted.

---

## API Reference

### `createSqueelClient(config: SqueelClientConfig)`
Initializes the Squeel client.

**Config Options:**
- `dbName`: string - The name of the database.
- `storage`: `"opfs" | "memory"` - Storage engine to use. `opfs` is recommended for performance.
- `migrations`: `Migration[]` - An array of schema migrations.
- `pragma`: `Record<string, string | number>` - SQLite pragmas (e.g., `{ foreign_keys: "ON" }`).
- `multiTab`: `{ enabled: boolean, channelName?: string }` - Enables cross-tab synchronization.

### `useQuery<T>(sql: string | SqlStatement, params?: SqlValue[], options?: UseQueryOptions<T>)`
Subscribes a component to a SQL query. Supports tagged template literals via `sql\``.

**Options:**
- `single`: boolean - If true, returns only the first row (or null).
- `default`: T - Initial data before the query first resolves.
- `dependsOn`: string[] - Explicit list of tables this query depends on (optional, usually auto-detected).
- `validate`: (data: unknown) => T - Validation function for the result.

**Returns:**
- `status`: `"loading" | "ready" | "error"`
- `data`: The query result (array or single row).
- `error`: Error object if the query failed.
- `refetch`: Function to manually trigger a re-run.

### `useTransaction()`
Returns a function to execute multiple SQL statements atomically.

```tsx
const tx = useTransaction();
await tx(async (db) => {
  // These run in a single BEGIN/COMMIT block in the worker
  await db.exec(sql`UPDATE items SET stock = stock - 1 WHERE id = ${id}`);
});
```

---

## Advanced Usage

### Migrations
Migrations ensure your schema is versioned and applied consistently.
```ts
const migrations = [
  {
    id: 1,
    up: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
    down: "DROP TABLE users"
  }
];
```

### Relational Integrity
Leverage SQL constraints to simplify your logic:
- `ON DELETE CASCADE`: Automatically clean up child records.
- `NOT NULL` & `CHECK`: Enforce data quality at the engine level.
- `UNIQUE`: Prevent duplicate state without manual checks.

### Persistence Strategy
- **OPFS:** Uses the Origin Private File System for near-native disk performance. Best for large datasets.

### Multi-Tab Sync
When enabled, updates in one browser tab are automatically broadcasted to other tabs using `BroadcastChannel`, keeping the entire application in sync.

### Kysely Integration
`useSqueel` provides a `SqueelDialect` for Kysely, allowing full type-safety.

```tsx
import { Kysely } from 'kysely';
import { SqueelDialect } from 'use-squeel';

const db = new Kysely<MyDatabase>({
  dialect: new SqueelDialect(client),
});

// Use Kysely to generate reactive queries
const query = db.selectFrom('users').selectAll().compile();
const { data } = useQuery(query.sql, query.parameters);
```
