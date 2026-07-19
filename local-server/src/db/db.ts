import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";
import { installChangeLogTriggers } from "./changeLogTrigger";

const DB_PATH =
  process.env.LOCAL_DB_PATH ?? path.join(__dirname, "../../data/app.sqlite");

let db: Database | null = null;
const pendingTableSql: string[] = [];

// models call this at import time — before initDb() ever runs
export function registerTable(sql: string) {
  pendingTableSql.push(sql);
}

export async function initDb() {
  if (db) return db;

  const sqlJsWasmDir = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"));

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsWasmDir, file),
  });

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run("PRAGMA foreign_keys = ON;");

  // run every CREATE TABLE IF NOT EXISTS queued up by your model imports
  for (const sql of pendingTableSql) {
    db.run(sql);
  }
  installChangeLogTriggers(db);
  saveDB();
  console.log(
    `🗄️  SQLite ready (${pendingTableSql.length} tables) -> ${DB_PATH}`
  );
  return db;
}

export function getDB(): Database {
  if (!db)
    throw new Error("DB not initialized — call initDb() before querying");
  return db;
}

export function saveDB() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}
