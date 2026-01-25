import { useState } from 'react';
import { Prism as ReactSyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Kysely } from 'kysely';
import { SqueelProvider, createSqueelClient, useQuery, useTransaction, sql, SqueelDialect } from "use-squeel";

/**
 * --- 0. THE DATABASE (Global Setup) ---
 * Initialize the Squeel client with a database name, storage type, and migrations.
 *
 * use-squeel uses SQLite WASM to provide a real relational database inside your browser.
 * The `storage` option can be "opfs" (fast, persistent), or "memory".
 */
const client = createSqueelClient({
  dbName: "landing-page-db",
  storage: "memory",
  migrations: [
    {
      id: 1,
      up: `
        -- 1. COUNTER DEMO
        CREATE TABLE counter (id INTEGER PRIMARY KEY, value INTEGER);
        INSERT INTO counter (id, value) VALUES (1, 0);

        -- 2. FILE SYSTEM DEMO
        CREATE TABLE folders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
        CREATE TABLE files (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            folder_id INTEGER, 
            name TEXT,
            size_bytes INTEGER, -- Stored as integer for SQL Math
            FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
        );
        INSERT INTO folders (name) VALUES ('src'), ('assets'), ('dist');
        INSERT INTO files (folder_id, name, size_bytes) VALUES 
          (1, 'App.tsx', 4096), (1, 'index.ts', 1024), 
          (2, 'logo.png', 124000), (3, 'bundle.js', 2500000);

        -- 3. INVENTORY DEMO
        CREATE TABLE items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            category TEXT,
            stock INTEGER,
            price INTEGER
        );
        INSERT INTO items (name, category, stock, price) VALUES
          ('Laptop', 'Electronics', 5, 1200),
          ('Mouse', 'Electronics', 45, 25),
          ('Desk Chair', 'Furniture', 0, 150),
          ('Coffee Mug', 'Kitchen', 100, 12),
          ('Monitor', 'Electronics', 12, 300);

        -- 4. TAGGING DEMO (Many-to-Many)
        CREATE TABLE todos (id INTEGER PRIMARY KEY, text TEXT);
        CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT, color TEXT);
        CREATE TABLE todo_tags (
            todo_id INTEGER, 
            tag_id INTEGER,
            PRIMARY KEY (todo_id, tag_id),
            FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        INSERT INTO todos VALUES (1, 'Fix production bug'), (2, 'Buy milk');
        INSERT INTO tags VALUES (1, 'Urgent', 'red'), (2, 'Home', 'green'), (3, 'Work', 'blue');
        INSERT INTO todo_tags VALUES (1, 1), (1, 3), (2, 2);

      `
    }
  ]
});

// --- 0b. KYSELY SETUP ---
interface Database {
  items: {
    id?: number;
    name: string;
    category: string;
    stock: number;
    price: number;
  }
}

const db = new Kysely<Database>({
  dialect: new SqueelDialect(client),
});

// Helper for code highlighting
const SyntaxHighlighter = ({ code }: { code: string }) => {
  return (
    <ReactSyntaxHighlighter
      language="typescript"
      style={vscDarkPlus}
      customStyle={{ margin: 0, padding: "1.5rem", background: "transparent", fontSize: "0.875rem", lineHeight: "1.5" }}
      wrapLongLines={true}
    >
      {code}
    </ReactSyntaxHighlighter>
  );
};

const TechSpecs = () => (
  <div className="border-y border-slate-900 bg-[#050505]">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-3 divide-x divide-slate-900">
        {[
          { 
            label: "INSTALLATION", 
            val: "Standard NPM", 
            sub: "Works with Vite, Next, CRA" 
          },
          { 
            label: "BUNDLE SIZE", 
            val: "~400KB", 
            sub: "Gzipped (Engine Included)" 
          },
          { 
            label: "PERFORMANCE", 
            val: "Zero UI Lag", 
            sub: "Runs inside a Web Worker" 
          }
        ].map((item, i) => (
          <div key={i} className="p-6 flex flex-col items-center justify-center text-center group hover:bg-slate-900/40 transition-colors cursor-default">
            <span className="text-[10px] font-bold font-mono text-slate-600 mb-2 tracking-widest uppercase group-hover:text-cyan-500 transition-colors">
              {item.label}
            </span>
            <span className="text-xl md:text-2xl font-black text-slate-200 tracking-tight mb-1">
              {item.val}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {item.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * --- DEMO 1: COUNTER ---
 * A simple reactive counter demonstrating basic SQL updates and real-time UI synchronization.
 *
 * - `useQuery`: Automatically re-renders the component when the query result changes.
 * - `useTransaction`: Ensures the update is atomic and notifies all subscribers.
 */
const CounterDemo = () => {
  const userId = 1;
  const { data } = useQuery(
    sql`SELECT value FROM counter WHERE id = ${userId}`,
    [],
    { default: [{ value: 0 }] }
  );
  const tx = useTransaction();

  const handleUpdate = (delta: number) => {
    tx(async (db) => {
      await db.exec(
        sql`UPDATE counter SET value = value + ${delta} WHERE id = ${userId}`
      );
    });
  };

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 p-6 flex flex-col items-center gap-6 shadow-xl">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20"></div>
        <div className="relative text-6xl font-black font-mono tracking-tighter text-white">
          {data[0]?.value.toString().padStart(2, '0')}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleUpdate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500 transition-all active:scale-95"
        >
          -
        </button>
        <button
          onClick={() => handleUpdate(1)}
          className="h-10 w-10 flex items-center justify-center rounded bg-cyan-600 border border-cyan-500 text-white font-bold hover:bg-cyan-500 transition-all active:scale-95 shadow-[0_0_15px_-3px_rgba(8,145,178,0.5)]"
        >
          +
        </button>
      </div>
    </div>
  );
};

/**
 * --- DEMO 2: FILE SYSTEM ---
 * Demonstrates relational integrity and cascading deletes.
 *
 * - SQL Constraints: `FOREIGN KEY(...) REFERENCES ... ON DELETE CASCADE` allows you to
 *   delete a folder and let the database handle cleaning up the files.
 * - Aggregations: SQL `SUM` and `LEFT JOIN` calculate folder sizes efficiently
 *   without bringing all file data into React memory.
 */
const FileSystemDemo = () => {
  const tx = useTransaction();

  // Query 1: Get folders with a calculated total size using a subquery or join
  const { data: folders } = useQuery(`
    SELECT 
      folders.id, 
      folders.name,
      COALESCE(SUM(files.size_bytes), 0) as total_size 
    FROM folders 
    LEFT JOIN files ON files.folder_id = folders.id 
    GROUP BY folders.id
  `, [], { default: [] });

  // Query 2: Get all files for the list view
  const { data: files } = useQuery(`SELECT * FROM files`, [], { default: [] });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const nukeFolder = (id: number) => {
    tx(async db => await db.exec("DELETE FROM folders WHERE id = ?", [id]));
  };

  const reset = () => {
    tx(async db => {
      await db.exec("DELETE FROM folders");
      await db.exec("DELETE FROM files");
      // Reset autoincrement counters so IDs start at 1 again
      await db.exec("DELETE FROM sqlite_sequence WHERE name IN ('folders', 'files')");
      await db.exec("INSERT INTO folders (name) VALUES ('src'), ('assets'), ('dist')");
      await db.exec("INSERT INTO files (folder_id, name, size_bytes) VALUES (1, 'App.tsx', 4096), (1, 'index.ts', 1024), (2, 'logo.png', 124000), (3, 'bundle.js', 2500000)");
    });
  };

  if (folders.length === 0) return (
    <div className="h-64 flex flex-col items-center justify-center bg-slate-950 border border-dashed border-slate-800 rounded-lg text-center p-6 gap-4">
      <div className="text-slate-600">State Destroyed.</div>
      <button onClick={reset} className="px-4 py-2 bg-slate-800 text-cyan-400 rounded text-sm hover:bg-slate-700">Run Migration (Reset)</button>
    </div>
  )

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden text-sm font-mono shadow-xl flex flex-col h-80">
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 text-xs text-slate-500 flex justify-between items-center">
        <span>EXPLORER</span>
        <span className="text-[10px] bg-slate-800 px-1 rounded">PRAGMA foreign_keys = ON</span>
      </div>
      <div className="p-2 overflow-y-auto space-y-2 custom-scrollbar flex-1">
        {folders.map((folder: any) => (
          <div key={folder.id} className="group">
            <div className="flex justify-between items-center text-slate-300 px-2 py-1 hover:bg-slate-900 rounded cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-amber-500">📁</span>
                <span>{folder.name}</span>
                <span className="text-[10px] text-slate-600 ml-2">({formatBytes(folder.total_size)})</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); nukeFolder(folder.id); }}
                className="opacity-0 group-hover:opacity-100 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-all"
              >DELETE</button>
            </div>
            <div className="pl-6 border-l border-slate-800 ml-3 mt-1 space-y-1">
              {files.filter((f: any) => f.folder_id === folder.id).map((file: any, i: number) => (
                <div key={i} className="flex justify-between text-slate-500 px-2 py-0.5 hover:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-600">ts</span>
                    <span>{file.name}</span>
                  </div>
                </div>
              ))}
              {files.filter((f: any) => f.folder_id === folder.id).length === 0 && (
                <div className="text-slate-700 italic px-2 text-xs">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Footer Visualization */}
      <div className="h-2 bg-slate-900 flex w-full">
        {folders.map((f: any, i: number) => {
          // Visualize relative size of folders
          const total = folders.reduce((acc: number, cur: any) => acc + cur.total_size, 0) || 1;
          const width = (f.total_size / total) * 100;
          const colors = ['bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'];
          return <div key={f.id} style={{ width: `${width}%` }} className={`${colors[i % colors.length]} opacity-50`} />
        })}
      </div>
    </div>
  );
};


/**
 * --- DEMO 3: INVENTORY ---
 * Demonstrates dynamic SQL filtering and analytics.
 *
 * - Performance: Instead of `array.filter().sort()`, the database handles
 *   complex conditions and ordering.
 * - Analytics: `GROUP BY` queries provide real-time stats (counts per category)
 *   using the same reactive engine.
 */
const InventoryDemo = () => {
  const [minStock, setMinStock] = useState(0);
  const [category, setCategory] = useState("All");

  // Dynamic Query Construction
  // In a real app, you might use a query builder, but strings work fine here.
  const query = `
      SELECT * FROM items 
      WHERE stock >= ? 
      ${category !== "All" ? "AND category = ?" : ""}
      ORDER BY stock ASC
    `;

  const params = category !== "All" ? [minStock, category] : [minStock];
  const { data: items } = useQuery(query, params, { default: [] });

  // Analytic Query (Group By) - Using Kysely for demonstration
  const statsQuery = db
    .selectFrom('items')
    .select(['category', (eb: any) => eb.fn.countAll().as('count')])
    .groupBy('category')
    .compile();

  const { data: stats } = useQuery(statsQuery.sql, statsQuery.parameters, { default: [] });

  const tx = useTransaction();
  const restock = (id: number) => tx(async (conn) => {
    // We can use Kysely to generate the SQL and parameters
    const query = db.updateTable('items')
      .set({ stock: (eb: any) => eb('stock', '+', 10) })
      .where('id', '=', id)
      .compile();
    
    await conn.exec(query.sql, query.parameters);
  });

  const sell = (id: number) => tx(async db => await db.exec("UPDATE items SET stock = MAX(0, stock - 1) WHERE id = ?", [id]));

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 shadow-xl text-sm font-mono flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 p-3 bg-slate-900 rounded border border-slate-800">
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          className="bg-black text-slate-300 border border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
        >
          <option value="All">All Categories</option>
          {stats.map((s: any) => <option key={s.category} value={s.category}>{s.category} ({s.count})</option>)}
        </select>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Min Stock: {minStock}</span>
          <input type="range" min="0" max="50" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className="accent-cyan-500" />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-900/50">
                <td className="px-3 py-2 text-slate-300">
                  {item.name}
                  <div className="text-[10px] text-slate-600">{item.category}</div>
                </td>
                <td className={`px-3 py-2 font-bold ${item.stock < 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {item.stock}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => sell(item.id)} className="px-2 py-1 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded text-xs">-1</button>
                    <button onClick={() => restock(item.id)} className="px-2 py-1 bg-slate-800 hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-400 rounded text-xs">+10</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-600">No items match filters</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * --- DEMO 4: TAGGING (Many-to-Many) ---
 * Showcases handling of complex many-to-many relationships using join tables.
 *
 * - GROUP_CONCAT: A SQLite feature to aggregate many rows into one string,
 *   perfect for fetching items and their tags in a single efficient query.
 * - Transaction Safety: Adding or removing tags is handled within a transaction,
 *   ensuring no partial state updates if something goes wrong.
 */
const TaggingDemo = () => {
  // This query is where SQL shines. Fetching todos + their tags in one shot.
  // We use GROUP_CONCAT to merge tags into a string for display, handling the M:N join.
  const { data: todos } = useQuery(`
        SELECT 
            t.id, 
            t.text,
            GROUP_CONCAT(tags.label) as tag_labels,
            GROUP_CONCAT(tags.color) as tag_colors
        FROM todos t
        LEFT JOIN todo_tags tt ON t.id = tt.todo_id
        LEFT JOIN tags ON tt.tag_id = tags.id
        GROUP BY t.id
    `, [], { default: [] });

  const { data: allTags } = useQuery("SELECT * FROM tags", [], { default: [] });
  const tx = useTransaction();

  const toggleTag = (todoId: number, tagId: number) => {
    tx(async db => {
      // Check if exists
      const existing = await db.query("SELECT * FROM todo_tags WHERE todo_id = ? AND tag_id = ?", [todoId, tagId]);
      if (existing.length > 0) {
        await db.exec("DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?", [todoId, tagId]);
      } else {
        await db.exec("INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)", [todoId, tagId]);
      }
    });
  }

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 shadow-xl font-mono text-sm">
      <div className="space-y-3">
        {todos.map((todo: any) => {
          const labels = todo.tag_labels ? todo.tag_labels.split(',') : [];
          const colors = todo.tag_colors ? todo.tag_colors.split(',') : [];

          return (
            <div key={todo.id} className="bg-slate-900/50 border border-slate-800 p-3 rounded flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-slate-200">{todo.text}</span>
              </div>

              {/* Active Tags */}
              <div className="flex gap-1 flex-wrap">
                {labels.map((lbl: string, i: number) => {
                  const colorMap: any = { red: 'text-red-400 bg-red-950 border-red-900', green: 'text-emerald-400 bg-emerald-950 border-emerald-900', blue: 'text-blue-400 bg-blue-950 border-blue-900' };
                  return (
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 border rounded ${colorMap[colors[i]] || 'text-slate-400'}`}>
                      #{lbl}
                    </span>
                  )
                })}
              </div>

              {/* Tag Toggler */}
              <div className="pt-2 border-t border-slate-800 flex gap-2 overflow-x-auto">
                <span className="text-[10px] text-slate-600 py-1">Toggle:</span>
                {allTags.map((tag: any) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(todo.id, tag.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-700 transition-colors ${labels.includes(tag.label) ? 'opacity-50 line-through' : ''}`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}

// --- UI SECTIONS ---

const Feature = ({ title, highlight, desc, code, demo, reverse = false }: any) => (
  <section className={`py-20 lg:py-24 border-t border-slate-900/50 ${reverse ? 'bg-slate-950/30' : ''}`}>
    <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start">
      <div className={`space-y-6 ${reverse ? 'lg:order-2' : ''}`}>
        <div>
          <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {title} <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400">{highlight}</span>
          </h3>
          <p className="text-slate-400 text-lg leading-relaxed">{desc}</p>
        </div>

        {/* Code Window */}
        <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-slate-800 shadow-2xl">
          <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">demo.tsx</span>
          </div>
          <SyntaxHighlighter code={code} />
        </div>
      </div>

      <div className={`relative pt-8 ${reverse ? 'lg:order-1' : ''}`}>
        <div className="absolute -inset-4 bg-linear-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl opacity-30"></div>
        <div className="relative z-10">
          {demo}
        </div>
      </div>
    </div>
  </section>
);

// --- MAIN PAGE ---

export default function LandingPage() {
  return (
    <SqueelProvider client={client}>
      <div className="min-h-screen bg-[#030304] text-slate-200 selection:bg-purple-500/30 font-sans overflow-x-hidden">

        {/* HERO SECTION */}
        <div className="relative pt-32 pb-24 px-6">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15] pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-8 leading-[0.9]">
              Ship a full SQL database<br />
              <span className="text-transparent bg-clip-text bg-linear-to-b from-slate-200 to-slate-500">
                as your React state manager.
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              State management is a solved problem. It’s called a database.<br/>
              Stop duct‑taping <span className="text-white font-bold">state</span> together. Start using the same model that runs your <span className="text-white font-bold">real</span> systems.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-slate-300 shadow-lg">
                <span className="text-purple-400 mr-2">$</span> npm install use-squeel
              </div>
              <button className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                Read the Docs
              </button>
            </div>
          </div>
        </div>

        <TechSpecs />

        {/* FEATURE 1 */}
        <Feature
          title="Reactive by"
          highlight="Default"
          desc="Write to the database, and every component updates instantly. No reducers, no providers."
          code={`// 1. Subscribe
const { data } = useQuery(
  "SELECT value FROM counter WHERE id = 1"
);

// 2. Mutate (ACID Safe)
const tx = useTransaction();
const inc = () => tx(async db => {
  await db.exec(
    "UPDATE counter SET value = value + 1"
  );
});`}
          demo={<CounterDemo />}
        />

        {/* FEATURE 2 */}
        <Feature
          reverse={true}
          title="Relational"
          highlight="Integrity"
          desc="Stop writing cleanup logic. Define constraints in SQL. When you delete a folder, the database deletes the files automatically."
          code={`// SCHEMA:
// FOREIGN KEY(folder_id) ... ON DELETE CASCADE

const FileExplorer = () => {
  // Calculated fields in SQL, not JS
  const { data } = useQuery(\`
    SELECT folders.name, SUM(files.size) as total 
    FROM folders 
    JOIN files ON ...
    GROUP BY folders.id
  \`);
}`}
          demo={<FileSystemDemo />}
        />

        {/* FEATURE 3 */}
        <Feature
          title="Complex"
          highlight="Filtering"
          desc="Stop writing array.filter() chains. Pass your form state directly into a SQL WHERE clause."
          code={`const Inventory = ({ minStock, category }) => {
  // Reactivity checks params automatically
  const { data } = useQuery(\`
      SELECT * FROM items 
      WHERE stock >= ? 
      AND category = ?
      ORDER BY stock ASC
    \`, 
    [minStock, category]
  );
}`}
          demo={<InventoryDemo />}
        />

        {/* FEATURE 4 */}
        <Feature
          reverse={true}
          title="Many-to-Many"
          highlight="Made Easy"
          desc="Relational data is hard in Redux. It's trivial in SQL. Join tables just work."
          code={`// Fetch Tasks AND their Tags in one go
const { data } = useQuery(\`
  SELECT 
    t.text,
    GROUP_CONCAT(tags.label) as labels
  FROM todos t
  LEFT JOIN todo_tags tt ON t.id = tt.todo_id
  LEFT JOIN tags ON tt.tag_id = tags.id
  GROUP BY t.id
\`);`}
          demo={<TaggingDemo />}
        />

        {/* FOOTER */}
        <footer className="border-t border-slate-900 bg-[#020202] py-20 text-center mt-20">
          <div className="max-w-xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-white mb-6">Relational databases solved state management in 1970. Stop telling yourself it's hard.</h2>
            <div className="mt-12 text-xs text-slate-700">
              MIT Licensed. Powered by SQLite WASM.
            </div>
          </div>
        </footer>
      </div>
    </SqueelProvider>
  );
}