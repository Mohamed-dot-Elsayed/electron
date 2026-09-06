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
  getOrCreateClientId,
} from "./appMeta";
import { enqueuePendingImages } from "../db/imageCache";
import { extractImageUrls } from "./imageExtract";
import { runImageDownloadPass } from "./imageDownloader";
import { emitSyncProgress } from "../socket";

const REMOTE_BASE = process.env.REMOTE_API_URL || "https://bcknd.systego.net";
let isBootstrapRunning = false;

export async function runBootstrapAll() {
  if (isBootstrapRunning) {
    console.log(
      "⚠️ Bootstrap is already running, ignoring concurrent request.",
    );
    return;
  }

  if (isBootstrapDone()) {
    console.log("Bootstrap already completed, skipping entirely");
    return;
  }

  isBootstrapRunning = true;

  try {
    const clientId = getOrCreateClientId();
    console.log(`Bootstrapping with client id: ${clientId}`);

    const tables = getAllTableNames();
    const totalTables = tables.length;
    console.log(`Bootstrap will run for tables: ${tables.join(", ")}`);

    emitSyncProgress({
      type: "bootstrap",
      status: "started",
      message: "Starting bootstrap for all tables...",
      percent: 0,
      total: totalTables,
      current: 0,
    });

    for (let i = 0; i < totalTables; i++) {
      const table = tables[i];
      const percent = Math.round(((i + 1) / totalTables) * 85);

      emitSyncProgress({
        type: "bootstrap",
        status: "progress",
        table,
        current: i + 1,
        total: totalTables,
        percent,
        message: `Bootstrapping table ${table} (${i + 1}/${totalTables})...`,
      });

      await bootstrapTable(table);
    }

    emitSyncProgress({
      type: "bootstrap",
      status: "progress",
      percent: 90,
      message: "Downloading local product & category images...",
    });

    try {
      await runImageDownloadPass();
    } catch (imgErr: any) {
      console.warn(
        "Non-fatal image download error during bootstrap:",
        imgErr.message,
      );
    }

    markBootstrapComplete();
    setLastSyncAt("_global", new Date().toISOString());

    emitSyncProgress({
      type: "bootstrap",
      status: "completed",
      percent: 100,
      message: "Bootstrap complete for all tables and images!",
    });
  } catch (err: any) {
    emitSyncProgress({
      type: "bootstrap",
      status: "error",
      percent: 100,
      message: `Bootstrap failed: ${err.message}`,
    });
    throw err;
  } finally {
    isBootstrapRunning = false;
  }
}

async function bootstrapTable(table: string) {
  if (isTableBootstrapped(table)) {
    console.log(`Skipping ${table}, already bootstrapped`);
    return;
  }

  const db = getDB();
  dropTriggersForTable(db, table);

  try {
    console.log(`Bootstrapping ${table}...`);
    const { data } = await axios.get(
      `${REMOTE_BASE}/api/sync/bootstrap/${table}`,
    );

    if (!data.data.rows || data.data.rows.length === 0) {
      console.log(`No rows for ${table}, marking done`);
      setLastSyncAt(
        table,
        data.data.serverSnapshotAt ?? new Date().toISOString(),
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
        enqueuePendingImages(extractImageUrls(table, row));
      }
      db.run("COMMIT");
    } catch (err) {
      db.run("ROLLBACK");
      throw err;
    }

    saveDB();
    setLastSyncAt(table, data.data.serverSnapshotAt);
    markTableBootstrapped(table);

    console.log(
      `Bootstrap complete for ${table}: ${data.data.rows.length} rows`,
    );
  } catch (err: any) {
    if (
      err.response &&
      (err.response.status === 500 || err.response.status === 404)
    ) {
      console.warn(
        `Server returned ${err.response.status} for ${table}, skipping this table.`,
      );
      markTableBootstrapped(table);
      return;
    }
    throw err;
  } finally {
    installTriggersForTable(db, table);
  }
}

function insertRow(
  db: any,
  table: string,
  row: Record<string, any>,
  localColumns: string[],
  pk: string,
) {
  let pkValue = row[pk];
  if (pkValue === undefined) {
    if (pk === "id" && row["_id"] !== undefined) {
      pkValue = row["_id"];
    } else if (pk === "_id" && row["id"] !== undefined) {
      pkValue = row["id"];
    }
  }

  const columns: string[] = [];
  const bindValues: any[] = [];

  columns.push(pk);
  bindValues.push(pkValue);

  for (const key of Object.keys(row)) {
    if (key === pk) continue;

    if ((key === "_id" && pk === "id") || (key === "id" && pk === "_id"))
      continue;

    if (!localColumns.includes(key)) continue;

    columns.push(key);

    let value = row[key];
    if (value === undefined) {
      value = null;
    } else if (typeof value === "object") {
      value = JSON.stringify(value);
    }
    bindValues.push(value);
  }

  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((c) => c !== pk)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  db.run(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(${pk}) DO UPDATE SET ${updates}`,
    bindValues,
  );
}
