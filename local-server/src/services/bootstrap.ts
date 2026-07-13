import axios from "axios";
import { getDB, saveDB } from "../db/db";
import {
  getAllTableNames,
  getPrimaryKeyColumn,
  getColumnNames,
} from "../db/introspect";
import {
  dropTriggersForTable,
  installTriggersForTable,
} from "../db/changeLogTrigger";
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

  const db = getDB();
  dropTriggersForTable(db, table); // don't pollute change_log with server-origin rows

  try {
    console.log(`Bootstrapping ${table}...`);
    const { data } = await axios.get(
      `${REMOTE_BASE}/api/sync/bootstrap/${table}`
    );

    if (!data.data.rows || data.data.rows.length === 0) {
      console.log(`No rows for ${table}, marking done`);
      setLastSyncAt(
        table,
        data.data.serverSnapshotAt ?? new Date().toISOString()
      );
      markTableBootstrapped(table);
      return;
    }

    const pk = getPrimaryKeyColumn(table);
    const localColumns = getColumnNames(table);

    db.run("BEGIN TRANSACTION");
    try {
      for (const row of data.data.rows) {
        insertRow(db, table, row, localColumns, pk);
      }
      db.run("COMMIT");
    } catch (err) {
      db.run("ROLLBACK");
      throw err; // table stays unmarked -> retried next launch
    }

    saveDB();
    setLastSyncAt(table, data.data.serverSnapshotAt);
    markTableBootstrapped(table);

    console.log(
      `Bootstrap complete for ${table}: ${data.data.rows.length} rows`
    );
  } finally {
    installTriggersForTable(db, table); // always restore, even on failure
  }
}

function insertRow(
  db: any,
  table: string,
  row: Record<string, any>,
  localColumns: string[],
  pk: string
) {
  // ---- 1. Determine the correct primary key value ----
  let pkValue = row[pk]; // exact match first
  if (pkValue === undefined) {
    // Common fallbacks: local pk is "id" but row has "_id", or vice versa
    if (pk === "id" && row["_id"] !== undefined) {
      pkValue = row["_id"];
    } else if (pk === "_id" && row["id"] !== undefined) {
      pkValue = row["id"];
    }
  }

  // ---- 2. Build the INSERT column & value arrays ----
  const columns: string[] = [];
  const bindValues: any[] = [];

  // Always include the primary key column first (if we have a value)
  columns.push(pk);
  bindValues.push(pkValue);

  // Process the remaining keys in the row
  for (const key of Object.keys(row)) {
    // Skip the key that matches the local pk column (already handled)
    if (key === pk) continue;

    // Skip the *alternative* primary key name that is not the local column
    // e.g. row has "_id" but local pk is "id" → ignore "_id"
    if ((key === "_id" && pk === "id") || (key === "id" && pk === "_id"))
      continue;

    // Only include columns that exist in the local schema
    if (!localColumns.includes(key)) continue;

    columns.push(key);

    let value = row[key];
    if (value === undefined) {
      value = null;
    } else if (typeof value === "object") {
      // sql.js rejects objects/arrays – convert to JSON string
      value = JSON.stringify(value);
    }
    bindValues.push(value);
  }

  // ---- 3. Execute the INSERT ----
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((c) => c !== pk)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  db.run(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(${pk}) DO UPDATE SET ${updates}`,
    bindValues
  );
}
