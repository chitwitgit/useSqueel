# useSqueel

### Relational State Management for React

`useSqueel` is the last state management library you will need for React, powered by SQLite in the browser.

[![npm](https://img.shields.io/npm/v/use-squeel)](https://npmjs.com/use-squeel)
[![size](https://img.shields.io/badge/gzip-worker_included-blue )]()
[![license](https://img.shields.io/badge/license-MIT-green )]()

> **"Your frontend state is a junk drawer. Use a SQL database instead of your useState and useReducers."**

---

**You've built real systems.** Whether you spent years on the backend or you've been wrestling with React state across a large frontend codebase, you've hit the same wall:

Frontend state management is chaos.

You're juggling `useState`, `useReducer`, `useContext`. You've suffered through Redux boilerplate, Zustand's "simple" stores that grow into unmaintainable monsters, and Jotai's atomic model that requires a PhD to debug. You've written `useEffect` chains that resemble Rube Goldberg machines just to keep two pieces of state in sync. You're chasing race conditions that shouldn't be possible. You add memoization on top of memoization to stop render cascades that your tools created in the first place.

**We spent a decade reinventing the wheel. Badly.**

**Relational databases solved state management in 1970.** Schemas, ACID transactions, foreign keys, constraints that make bad state literally impossible—those aren't "backend-only" ideas. They're the only model we've ever had that actually scales with complexity.

So instead of pretending your JSON blob is a "store", `useSqueel` gives you what you actually want:

A real SQLite database in the browser, running in a Web Worker via WASM, wired into React with hooks. You subscribe to **queries**, mutate through **transactions**, and let the database do the only job it was ever built to do: keep your data correct.

Stop duct‑taping state together. Start using the same model that runs your real systems.

### What you get:

- ✅ **ACID Transactions:** Updates are Atomic, Consistent, Isolated, and Durable—enforced by SQLite, not library promises.
- ✅ **Query-Driven Rendering:** Components subscribe to *queries*, not stores. An update to `user.settings` won't re-render your entire component tree.
- ✅ **Real Persistence:** Uses **OPFS** (Origin Private File System) for near-native disk performance. Your state survives page reloads and browser restarts.
- ✅ **Multi-Tab Sync:** Write in one tab, queries update instantly in others via `BroadcastChannel`.
- ✅ **No Learning Curve (If You Know SQL):** If you can write a `JOIN`, you're done learning. No atoms, no reducers, no abstractions designed to hide SQL from you.
- ✅ **Type Safety via Kysely:** First-class support for the Kysely query builder, giving you end-to-end type safety for your database schema and queries.

### Is This a Joke?

**"You're shipping a database to the client? What about bundle size?"**

The SQLite WASM engine + the worker is **~400KB gzipped**.

That is smaller than your hero image.
That is smaller than the analytics script you didn't think twice about adding.
That is smaller than the combination of Redux + Immer + Normalizr + Lodash you're currently using to poorly replicate a database.

You've been mass-installing worse dependencies for years. This one actually does something.

---

### For the Frontend Dev Who Is Done with the Grind

**You're told "state management is hard" like it's a law of physics. It's not.**

This is for you if:
- Your state management is spread across five different libraries and you're still not sure which component owns what.
- You're manually denormalizing data and writing "sync" functions that feel fragile.
- You've spent an hour debugging a race condition that a database would have prevented in 10 seconds.
- You're adding `useMemo`, `useCallback`, and memoization strategies just to keep renders under control.
- You want a state solution that *scales* as your app grows, not one that gets messier with every new feature.

**This is your permission slip to stop pretending stores are a good idea.**

### For the Backend Engineer Forced to Write Frontend

**We understand your pain.**

This is for you if:
- You've stared at Redux boilerplate and thought, "Why can't I just write a `JOIN`?"
- You cringe at storing denormalized data in a "store" and manually keeping it in sync.
- You miss `FOREIGN KEY` constraints that *actually* prevent bad data.
- You don't understand why a "simple" state update needs five hooks and a memoization function.
- You want to think in terms of migrations, schemas, and queries—not reducers and actions.

**This is your library. Welcome home.**

---

## Documentation

- [Full Guide & API Reference](./GUIDE.md)

## Installation

```bash
npm install use-squeel
# Or yarn add use-squeel
# Or pnpm add use-squeel
# Or bun add use-squeel
```

---

## Quickstart

```tsx
import React from "react";
import { SqueelProvider, createSqueelClient, useQuery, useTransaction, sql } from "use-squeel";

const client = createSqueelClient({
  dbName: "app",
  storage: "opfs", // "opfs" | "memory"
  migrations: [
    {
      id: 1,
      up: `
        CREATE TABLE IF NOT EXISTS session_state (
          id INTEGER PRIMARY KEY,
          active INTEGER NOT NULL DEFAULT 0,
          name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY,
          event TEXT NOT NULL,
          ts TEXT NOT NULL
        );
      `,
      down: `
        DROP TABLE IF EXISTS logs;
        DROP TABLE IF EXISTS session_state;
      `
    }
  ],
  audit: { enabled: true }
});

export function App() {
  return (
    <SqueelProvider client={client}>
      <UserProfile />
    </SqueelProvider>
  );
}

function UserProfile() {
  const user = useQuery<{ id: number; active: 0 | 1; name: string }>(
    sql`SELECT id, active, name FROM session_state WHERE active=1 LIMIT 1`,
    [],
    { single: true, default: null }
  );

  const tx = useTransaction();

  return (
    <button
      onClick={() =>
        tx(async (db) => {
          // Both succeed, or both roll back. No partial commits. Ever.
          await db.exec("DELETE FROM session_state WHERE active=1");
          await db.exec("INSERT INTO logs(event, ts) VALUES (?, datetime('now'))", ["logout"]);
        })
      }
    >
      Log out {user.data?.name ?? "—"}
    </button>
  );
}
```

---

## Hooks

### **`useQuery(sql, params?, options?)`**
*Subscribes to a SELECT. Re-renders *only* when your result changes.*

```ts
// Use tagged templates for safety and DX
const { status, data, error, refetch } = useQuery<T>(
  sql`SELECT * FROM posts WHERE author_id = ${authorId} ORDER BY created_at DESC`,
  [],
  {
    single: false,
    default: [],
    dependsOn: ["posts", "authors"], // For complex subqueries
    suspense: true, // Let React handle loading states properly
    validate: zodSchema.parse, // Runtime safety because types lie
  }
);
```

**Returns:**
```ts
{
  status: "loading" | "ready" | "error";
  data: T; // Your rows. Not a promise. Not a proxy. Just data.
  error: unknown | null;
  refetch(): void; // Manual refresh when you need it
}
```

---

### **`useTransaction()`**
*Returns a function that runs statements atomically. If you can write a callback, you can have transactional integrity.*

```ts
const tx = useTransaction();

await tx(async (db) => {
  // These are guaranteed to run in a single transaction.
  // Power goes out mid-commit? SQLite rolls back. Automatically.
  await db.exec("UPDATE counters SET n = n + 1 WHERE id = ?", [id]);
});

// If the callback throws, *everything* rolls back. No try/catch required.
```

---

## Guarantees (The "We Actually Mean It" Section)

- **All mutations** inside a `useTransaction()` callback run in a **single SQLite transaction** with `BEGIN` and `COMMIT`.
- Subscribers are notified **only after commit**. You will *never* see a component render with partial transaction data. This is not a best-effort promise; it's enforced by the database engine.
- Component re-renders are triggered **only when query results change**. We use SQLite's `changes()` and logical table tracking. You don't need `React.memo`—the library *is* the memoization.
- **Foreign key constraints are enforced by default**. No need to run `PRAGMA foreign_keys = ON` manually. Try to insert a bad ID—SQLite will stop you. Your app state cannot become inconsistent.

---

## Non-Goals (What We Won't Pretend to Do)

- **This is NOT a client-server sync engine.** It's local state with a real database. If you need replication, build it with triggers and web sockets. We're not Firebase.
- **We won't guess your SQL dependencies.** Complex subqueries? Use `dependsOn`. We'll keep it explicit and correct instead of magically wrong.
- **Bundle size matters.** SQLite WASM adds bundle weight and init cost. Lazy-load the provider or accept that correctness has a size. We choose correctness.

---

## Browser Support

- Web Workers are required for non-blocking operation. (MDN Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API )
- Cross-tab sync uses `BroadcastChannel` when available. (MDN BroadcastChannel: https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel )
- OPFS requires a modern Chromium-based browser or Safari 15.4+.

---
