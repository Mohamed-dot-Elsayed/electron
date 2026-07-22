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
import { getLastSyncAt, setLastSyncAt, getOrCreateClientId } from "./appMeta";
import { sanitizeBindValues } from "../db/createModel";
import { enqueuePendingImages } from "../db/imageCache";
import { extractImageUrls } from "./imageExtract";
import { triggerImageDownload } from "./imageDownloader";

const REMOTE_BASE = process.env.REMOTE_API_URL;
const SYNC_CURSOR_KEY = "_global";

type RemoteChange = {
  table_name: string;
  op: "insert" | "update" | "delete";
  record_id: string;
  data?: Record<string, any>;
};

/**
 * Normalize a sync cursor to an ISO‑8601 string.
 * Accepts a numeric Unix timestamp (ms) or an already valid date string.
 */
function normalizeCursor(raw: string): string {
  // If it's all digits, treat as milliseconds since epoch
  if (/^\d+$/.test(raw)) {
    const ms = parseInt(raw, 10);
    return new Date(ms).toISOString();
  }
  // Otherwise assume it's already an ISO string (or fallback)
  // You could add more validation here if needed.
  return raw;
}

export async function pullAllTables(): Promise<Record<string, number>> {
  const db = getDB();
  const knownTables = new Set(getAllTableNames());
  const clientId = getOrCreateClientId();

  // Get the cursor, fallback to epoch start, then normalize it
  const rawSince = getLastSyncAt(SYNC_CURSOR_KEY) ?? "1970-01-01T00:00:00.000Z";
  const since = normalizeCursor(rawSince);

  // If we had to convert from numeric, permanently fix the stored value
  if (rawSince !== since) {
    setLastSyncAt(SYNC_CURSOR_KEY, since);
  }

  let responseData; // will hold the parsed response body
  try {
    const response = await axios.get(`${REMOTE_BASE}/api/sync/pull`, {
      params: { since, clientId },
    });
    responseData = response.data; // { success: true, data: { changes, serverTime } }
  } catch (error: any) {
    // Log the server's error message for debugging
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Server error:', error.response.data.error);
    }
    throw error; // rethrow to be handled by the caller
  }

  // The server responds with { success: true, data: { changes: [...], serverTime: "..." } }
  const payload = responseData.data;
  const changes: RemoteChange[] = payload.changes ?? [];
  const serverTime: string = payload.serverTime;
  const results: Record<string, number> = {};

  if (changes.length === 0) {
    setLastSyncAt(SYNC_CURSOR_KEY, serverTime);
    console.log("No changes on Server");
    return results;
  }

  // Group remote changes by table to reduce trigger work
  const byTable = new Map<string, RemoteChange[]>();
  for (const change of changes) {
    if (!knownTables.has(change.table_name)) {
      console.warn(`Skipping change for unknown table "${change.table_name}"`);
      continue;
    }
    if (!byTable.has(change.table_name)) byTable.set(change.table_name, []);
    byTable.get(change.table_name)!.push(change);
  }

  let allSucceeded = true;

  for (const [table, tableChanges] of byTable) {
    dropTriggersForTable(db, table);
    try {
      const pk = getPrimaryKeyColumn(table);
      const localColumns = getColumnNames(table);

      db.run("BEGIN TRANSACTION");
      try {
        for (const change of tableChanges) {
          if (change.op === "delete") {
            db.run(`DELETE FROM ${table} WHERE ${pk} = ?`, [change.record_id]);
          } else {
            applyUpsert(db, table, change.data!, localColumns, pk);
            enqueuePendingImages(extractImageUrls(table, change.data!));
          }
        }
        db.run("COMMIT");
        results[table] = tableChanges.length;
        console.log(`Pulled ${tableChanges.length} changes for ${table}`);
      } catch (err) {
        db.run("ROLLBACK");
        allSucceeded = false;
        results[table] = 0;
        console.error(`Failed applying changes for ${table}:`, err);
      }
    } finally {
      installTriggersForTable(db, table);
    }
  }

  saveDB();
  triggerImageDownload();
  if (allSucceeded) {
    setLastSyncAt(SYNC_CURSOR_KEY, serverTime);
  } else {
    console.warn("Some tables failed to sync — cursor not advanced, will retry next pull");
  }

  return results;
}

function applyUpsert(
  db: any,
  table: string,
  row: Record<string, any>,
  localColumns: string[],
  pk: string
) {
  const stmt = db.prepare(`SELECT updatedAt FROM ${table} WHERE ${pk} = ?`);
  stmt.bind(sanitizeBindValues([row[pk]]));
  let localUpdatedAt: string | undefined = undefined;
  if (stmt.step()) {
    localUpdatedAt = stmt.getAsObject().updatedAt;
  }
  stmt.free();

  const remoteUpdatedAt = row.updatedAt ?? row.updated_at;
  if (localUpdatedAt && remoteUpdatedAt && new Date(localUpdatedAt) > new Date(remoteUpdatedAt)) {
    console.log(`Skipping ${table}/${row[pk]} — local version is newer (LWW)`);
    return;
  }

  const columns = Object.keys(row).filter((c) => localColumns.includes(c));
  if (columns.length === 0) return;

  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((c) => c !== pk)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  db.run(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(${pk}) DO UPDATE SET ${updates}`,
    sanitizeBindValues(columns.map((c) => row[c]))
  );
}