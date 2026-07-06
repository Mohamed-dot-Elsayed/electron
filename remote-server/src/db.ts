import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'remote.db');

let db: Database;

// sql.js is SQLite compiled to WebAssembly - no native compilation step,
// which means no electron-rebuild headaches when this gets packaged later.
// Trade-off: it's an in-memory DB that we manually persist to a file after writes.
export async function initDb(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
  });

  db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
  `);
  persist();
}

export function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

export function all(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Use for INSERT/UPDATE/DELETE - runs the statement and persists to disk
export function run(sql: string, params: any[] = []) {
  db.run(sql, params);
  persist();
}

// Use for a batch of statements that should persist once at the end
export function runMany(fn: () => void) {
  fn();
  persist();
}

export function runNoPersist(sql: string, params: any[] = []) {
  db.run(sql, params);
}
