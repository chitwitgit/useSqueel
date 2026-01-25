import { Engine } from "./engine";
import { Migration } from "../client/types";

export async function applyMigrations(engine: Engine, migrations: Migration[]): Promise<void> {
  await engine.exec(`
    CREATE TABLE IF NOT EXISTS __use_squeel_migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `, []);

  const appliedRows = await engine.query("SELECT id FROM __use_squeel_migrations", []);
  const appliedIds = new Set(appliedRows.map((r) => r.id));

  const sortedMigrations = [...migrations].sort((a, b) => a.id - b.id);

  for (const migration of sortedMigrations) {
    if (!appliedIds.has(migration.id)) {
      await engine.exec("BEGIN", []);
      try {
        await engine.exec(migration.up, []);
        await engine.exec("INSERT INTO __use_squeel_migrations (id, applied_at) VALUES (?, datetime('now'))", [migration.id]);
        await engine.exec("COMMIT", []);
      } catch (e) {
        await engine.exec("ROLLBACK", []);
        throw e;
      }
    }
  }
}
