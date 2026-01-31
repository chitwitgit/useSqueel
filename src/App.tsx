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
      customStyle={{ margin: 0, padding: "1.25rem", background: "transparent", fontSize: "0.85rem", lineHeight: "1.6" }}
      wrapLongLines={true}
    >
      {code}
    </ReactSyntaxHighlighter>
  );
};

// Copyable code component with click-to-copy functionality
const CopyableCode = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-slate-200 shadow-lg hover:border-slate-500 hover:bg-slate-800 transition-all cursor-pointer"
      title="Click to copy"
    >
      <span className="text-purple-400 mr-2">$</span>
      <span>{code}</span>
      <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </span>
    </button>
  );
};

const TechSpecs = () => (
  <div className="border-y border-slate-800 bg-[#080808]">
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-3 divide-x divide-slate-800">
        {[
          {
            label: "INSTALLATION",
            val: "Standard NPM",
            sub: "Vite, Next, CRA"
          },
          {
            label: "BUNDLE SIZE",
            val: "~400KB",
            sub: "Gzipped w/ Engine"
          },
          {
            label: "PERFORMANCE",
            val: "Zero UI Lag",
            sub: "Web Worker Powered"
          }
        ].map((item, i) => (
          <div key={i} className="p-5 flex flex-col items-center justify-center text-center group hover:bg-slate-900 transition-colors cursor-default">
            <span className="text-[10px] font-bold font-mono text-slate-500 mb-1 tracking-widest uppercase group-hover:text-cyan-400 transition-colors">
              {item.label}
            </span>
            <span className="text-lg md:text-xl font-bold text-slate-200 tracking-tight mb-0.5">
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
 * --- DEMO COMPONENTS ---
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
    <div className="bg-[#0B0F19] rounded-xl border border-slate-800 p-8 flex flex-col items-center gap-6 shadow-2xl">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-10"></div>
        <div className="relative text-7xl font-black font-mono tracking-tighter text-white tabular-nums">
          {data[0]?.value.toString().padStart(2, '0')}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleUpdate(-1)}
          className="h-12 w-12 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500 hover:bg-slate-700 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/></svg>
        </button>
        <button
          onClick={() => handleUpdate(1)}
          className="h-12 w-12 flex items-center justify-center rounded-lg bg-cyan-600 border border-cyan-500 text-white hover:bg-cyan-500 transition-all active:scale-95 shadow-[0_0_20px_-5px_rgba(8,145,178,0.6)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
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
    <div className="h-64 flex flex-col items-center justify-center bg-[#0B0F19] border border-dashed border-slate-700 rounded-xl text-center p-6 gap-4">
      <div className="text-slate-400">Database State: Empty</div>
      <button onClick={reset} className="px-5 py-2.5 bg-slate-800 text-cyan-400 border border-slate-700 rounded-lg text-sm hover:bg-slate-700 transition-colors font-medium">Run Migration (Reset)</button>
    </div>
  )

  return (
    <div className="bg-[#0B0F19] rounded-xl border border-slate-800 overflow-hidden text-sm font-mono shadow-2xl flex flex-col h-80">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-xs text-slate-400 font-bold flex justify-between items-center tracking-wide">
        <span>EXPLORER</span>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">FK_CONSTRAINT: ON</span>
      </div>
      <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar flex-1">
        {folders.map((folder: any) => (
          <div key={folder.id} className="group">
            <div className="flex justify-between items-center text-slate-200 px-2 py-1.5 hover:bg-slate-800/80 rounded cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-amber-500">📁</span>
                <span className="font-medium">{folder.name}</span>
                <span className="text-[10px] text-slate-500 font-sans">({formatBytes(folder.total_size)})</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); nukeFolder(folder.id); }}
                className="opacity-0 group-hover:opacity-100 text-[10px] bg-red-950 text-red-400 border border-red-900/50 px-2 py-0.5 rounded hover:bg-red-900 transition-all"
              >DELETE</button>
            </div>
            <div className="pl-4 border-l border-slate-800 ml-3.5 mt-1 space-y-0.5">
              {files.filter((f: any) => f.folder_id === folder.id).map((file: any, i: number) => (
                <div key={i} className="flex justify-between text-slate-400 px-2 py-1 hover:text-slate-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-600 text-[10px]">TS</span>
                    <span>{file.name}</span>
                  </div>
                </div>
              ))}
              {files.filter((f: any) => f.folder_id === folder.id).length === 0 && (
                <div className="text-slate-600 italic px-2 py-1 text-xs">Empty</div>
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
          return <div key={f.id} style={{ width: `${width}%` }} className={`${colors[i % colors.length]} h-full`} />
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
    <div className="bg-[#0B0F19] rounded-xl border border-slate-800 p-5 shadow-2xl text-sm font-mono flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 items-center justify-between">
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-950 text-slate-200 border border-slate-700 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-cyan-500 outline-none min-w-[120px]"
        >
          <option value="All">All Categories</option>
          {stats.map((s: any) => <option key={s.category} value={s.category}>{s.category} ({s.count})</option>)}
        </select>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span>Min Stock: <span className="text-cyan-400 font-bold">{minStock}</span></span>
          <input type="range" min="0" max="50" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className="accent-cyan-500 cursor-pointer" />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/20">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-2.5 text-slate-200 font-medium">
                  {item.name}
                  <div className="text-[10px] text-slate-500 font-normal">{item.category}</div>
                </td>
                <td className={`px-4 py-2.5 font-bold ${item.stock < 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {item.stock}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => sell(item.id)} className="px-2.5 py-1 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900 rounded text-xs transition-colors">-1</button>
                    <button onClick={() => restock(item.id)} className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-900 rounded text-xs transition-colors">+10</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-slate-500 italic">No items match filters</td></tr>}
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
    <div className="bg-[#0B0F19] rounded-xl border border-slate-800 p-6 shadow-2xl font-mono text-sm">
      <div className="space-y-4">
        {todos.map((todo: any) => {
          const labels = todo.tag_labels ? todo.tag_labels.split(',') : [];
          const colors = todo.tag_colors ? todo.tag_colors.split(',') : [];

          return (
            <div key={todo.id} className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg flex flex-col gap-3 hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-slate-100 font-medium">{todo.text}</span>
              </div>

              {/* Active Tags */}
              <div className="flex gap-2 flex-wrap min-h-[24px]">
                {labels.length > 0 ? labels.map((lbl: string, i: number) => {
                  const colorMap: any = { red: 'text-red-300 bg-red-950/50 border-red-900/50', green: 'text-emerald-300 bg-emerald-950/50 border-emerald-900/50', blue: 'text-blue-300 bg-blue-950/50 border-blue-900/50' };
                  return (
                    <span key={i} className={`text-[10px] uppercase font-bold px-2 py-0.5 border rounded ${colorMap[colors[i]] || 'text-slate-400'}`}>
                      {lbl}
                    </span>
                  )
                }) : <span className="text-slate-600 text-xs italic">No tags selected</span>}
              </div>

              {/* Tag Toggler */}
              <div className="pt-3 border-t border-slate-800/50 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-slate-500 mr-1 uppercase tracking-wide font-bold">Manage:</span>
                {allTags.map((tag: any) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(todo.id, tag.id)}
                    className={`text-[10px] px-2.5 py-1 rounded border transition-all ${
                      labels.includes(tag.label) 
                        ? 'bg-slate-800 text-slate-500 border-slate-800 line-through decoration-slate-600' 
                        : 'bg-transparent text-slate-300 border-slate-700 hover:border-cyan-500 hover:text-cyan-400'
                    }`}
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
  <section className={`py-12 lg:py-16 border-t border-slate-900 ${reverse ? 'bg-[#050505]' : 'bg-transparent'}`}>
    <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div className={`space-y-6 ${reverse ? 'lg:order-2' : ''}`}>
        <div>
          <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">
            {title} <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400">{highlight}</span>
          </h3>
          <p className="text-slate-400 text-lg leading-relaxed">{desc}</p>
        </div>

        {/* Code Window */}
        <div className="rounded-xl overflow-hidden bg-[#0F1115] border border-slate-800 shadow-xl group hover:border-slate-700 transition-colors">
          <div className="bg-[#15171e] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider opacity-70">TYPESCRIPT</span>
          </div>
          <SyntaxHighlighter code={code} />
        </div>
      </div>

      <div className={`relative pt-4 ${reverse ? 'lg:order-1' : ''}`}>
        <div className="absolute -inset-4 bg-linear-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl opacity-50"></div>
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
      <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-purple-500/30 font-sans overflow-x-hidden">

        {/* HEADER */}
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/image.png" alt="useSqueel" className="w-6 h-6" />
            <span className="text-xl font-bold text-white tracking-tight font-mono">
              useSqueel
            </span>
          </div>
          <a
            href="https://github.com/chitwitgit/useSqueel"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </header>

        {/* HERO SECTION */}
        <div className="relative pt-24 pb-16 px-6">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.1] pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-tight">
              Ship a full SQL database<br />
              <span className="text-transparent bg-clip-text bg-linear-to-b from-slate-200 to-slate-500">
                as your React state manager.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              State management is a solved problem. It’s called a database.
              Manage your frontend state with <strong className="text-slate-200 font-medium">standard SQL queries</strong> and give your <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-cyan-300 text-sm font-mono">isModalOpen</code> boolean its well-deserved <strong className="text-slate-200 font-medium">ACID compliance</strong>.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
              <CopyableCode code="npm install use-squeel" />
              <a
                href="https://github.com/chitwitgit/useSqueel/blob/main/packages/useSqueel/GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-white text-slate-950 font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-[0_0_25px_-5px_rgba(255,255,255,0.2)]"
              >
                Read the Docs
              </a>
            </div>
          </div>
        </div>

        <TechSpecs />

        {/* FEATURE 1 */}
        <Feature
          title="Reactive by"
          highlight="Default"
          desc="Write to the database, and every component updates instantly. No reducers, no providers, just SQL."
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
        <footer className="border-t border-slate-900 bg-[#020202] py-16 text-center mt-8">
          <div className="max-w-xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to over-engineer your To-Do list?</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">Join the developers who realized local-first databases are just better state managers.</p>
            <a href="https://github.com/chitwitgit/useSqueel" className="inline-block px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
              View on GitHub
            </a>
            <div className="mt-12 text-xs text-slate-600 font-medium">
              MIT Licensed. Powered by SQLite WASM.
            </div>
          </div>
        </footer>
      </div>
    </SqueelProvider>
  );
}