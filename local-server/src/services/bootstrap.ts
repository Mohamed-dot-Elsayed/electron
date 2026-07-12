// src/services/bootstrap.service.ts
import axios from "axios";
import { getDB, saveDB } from "../db/db";
import {
  getAllTableNames,
  getPrimaryKeyColumn,
  getColumnNames,
} from "../db/introspect";
import {
  isTableBootstrapped,
  markTableBootstrapped,
  setLastSyncAt,
  isBootstrapDone,
  markBootstrapComplete,
} from "./appMeta";

const REMOTE_BASE = process.env.REMOTE_API_URL;

export async function runBootstrapAll() {
  if (isBootstrapDone()) {
    console.log("Bootstrap already completed, skipping entirely");
    return;
  }

  const tables = getAllTableNames();
  console.log(`Bootstrap will run for tables: ${tables.join(", ")}`);

  for (const table of tables) {
    await bootstrapTable(table);
  }

  markBootstrapComplete();
  console.log("Bootstrap complete for all tables");
}

async function bootstrapTable(table: string) {
  if (isTableBootstrapped(table)) {
    console.log(`Skipping ${table}, already bootstrapped`);
    return;
  }

  console.log(`Bootstrapping ${table}...`);

  const { data } = await axios.get(`${REMOTE_BASE}/sync/bootstrap/${table}`);

  if (!data.rows || data.rows.length === 0) {
    console.log(`No rows for ${table}, marking done`);
    setLastSyncAt(table, data.serverSnapshotAt ?? new Date().toISOString());
    markTableBootstrapped(table);
    return;
  }

  const db = getDB();
  const pk = getPrimaryKeyColumn(table);
  const localColumns = getColumnNames(table);

  db.run("BEGIN TRANSACTION");
  try {
    for (const row of data.rows) {
      insertRow(db, table, row, localColumns, pk);
    }
    db.run("COMMIT");
  } catch (err) {
    db.run("ROLLBACK");
    throw err; // table stays unmarked -> retried next run
  }

  saveDB();
  setLastSyncAt(table, data.serverSnapshotAt);
  markTableBootstrapped(table);

  console.log(`Bootstrap complete for ${table}: ${data.rows.length} rows`);
}

function insertRow(
  db: any,
  table: string,
  row: Record<string, any>,
  localColumns: string[],
  pk: string
) {
  // only use columns that actually exist locally — protects against
  // remote sending extra fields your local schema doesn't have
  const columns = Object.keys(row).filter((c) => localColumns.includes(c));
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((c) => c !== pk)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  db.run(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(${pk}) DO UPDATE SET ${updates}`,
    columns.map((c) => row[c])
  );
}
