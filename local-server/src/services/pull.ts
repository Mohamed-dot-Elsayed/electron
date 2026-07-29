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

type FieldOp =
  | { op: "set"; value: any }
  | { op: "inc"; value: number }
  | {
      op: "arrayPatch";
      updated: { _id: any; deltas: Record<string, number>; set: Record<string, any> }[];
      added: any[];
      removed: any[];
    };

type UpdatePayload = {
  fields: Record<string, FieldOp>;
  updatedAt?: string;
};

type RemoteChange = {
  table_name: string;
  op: "insert" | "update" | "delete";
  record_id: string;
  data?: Record<string, any> | UpdatePayload;
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
            continue;
          }

          if (change.op === "insert") {
            const row = (change.data ?? {}) as Record<string, any>;
            applyUpsert(db, table, row, localColumns, pk);
            enqueuePendingImages(extractImageUrls(table, row));
            continue;
          }

          // change.op === "update"
          const updatePayload = (change.data ?? { fields: {} }) as UpdatePayload;
          const changedValues = applyFieldOps(
            db,
            table,
            change.record_id,
            updatePayload,
            localColumns,
            pk
          );
          if (changedValues) {
            enqueuePendingImages(extractImageUrls(table, changedValues));
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

function getLocalUpdatedAt(db: any, table: string, pk: string, recordId: string): string | undefined {
  const stmt = db.prepare(`SELECT updatedAt FROM ${table} WHERE ${pk} = ?`);
  stmt.bind(sanitizeBindValues([recordId]));
  let updatedAt: string | undefined = undefined;
  if (stmt.step()) {
    updatedAt = stmt.getAsObject().updatedAt;
  }
  stmt.free();
  return updatedAt;
}

/**
 * Insert path only (remote sends a full flat row on insert, no diffing needed).
 */
function applyUpsert(
  db: any,
  table: string,
  row: Record<string, any>,
  localColumns: string[],
  pk: string
) {
  const localUpdatedAt = getLocalUpdatedAt(db, table, pk, row[pk]);

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

/**
 * Update path — applies { fields: { col: {op:"set"|"inc"|"arrayPatch", value} } }
 * against the local row. Returns a flat { col: value } map of what changed
 * (for image-url extraction) or null if nothing was applied.
 */
function applyFieldOps(
  db: any,
  table: string,
  recordId: string,
  payload: UpdatePayload,
  localColumns: string[],
  pk: string
): Record<string, any> | null {
  const fields = payload.fields ?? {};
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;

  const localUpdatedAt = getLocalUpdatedAt(db, table, pk, recordId);
  if (!localUpdatedAt) {
    console.warn(`Update target ${table}/${recordId} not found locally — skipping`);
    return null;
  }

  if (payload.updatedAt && new Date(localUpdatedAt) > new Date(payload.updatedAt)) {
    console.log(`Skipping ${table}/${recordId} — local version is newer (LWW)`);
    return null;
  }

  const setClauses: string[] = [];
  const setValues: any[] = [];
  const changedValues: Record<string, any> = {};

  for (const key of keys) {
    if (!localColumns.includes(key)) continue;
    const fieldOp = fields[key];

    if (fieldOp.op === "arrayPatch") {
      applyArrayPatch(db, table, pk, recordId, key, fieldOp);
      continue;
    }

    if (fieldOp.op === "inc") {
      setClauses.push(`${key} = ${key} + ?`);
      setValues.push(...sanitizeBindValues([fieldOp.value]));
      continue;
    }

    // "set"
    setClauses.push(`${key} = ?`);
    setValues.push(...sanitizeBindValues([fieldOp.value]));
    changedValues[key] = fieldOp.value;
  }

  if (payload.updatedAt) {
    setClauses.push(`updatedAt = ?`);
    setValues.push(...sanitizeBindValues([payload.updatedAt]));
  }

  if (setClauses.length > 0) {
    db.run(
      `UPDATE ${table} SET ${setClauses.join(", ")} WHERE ${pk} = ?`,
      [...setValues, ...sanitizeBindValues([recordId])]
    );
  }

  return Object.keys(changedValues).length > 0 ? changedValues : null;
}

/**
 * Mirrors remote's applyArrayPatch: applies per-item numeric deltas / field
 * sets against a JSON array column, plus whole-item add/remove.
 */
function applyArrayPatch(
  db: any,
  table: string,
  pk: string,
  recordId: string,
  column: string,
  patch: {
    updated: { _id: any; deltas: Record<string, number>; set: Record<string, any> }[];
    added: any[];
    removed: any[];
  }
) {
  const stmt = db.prepare(`SELECT ${column} FROM ${table} WHERE ${pk} = ?`);
  stmt.bind(sanitizeBindValues([recordId]));
  let raw: string | null = null;
  if (stmt.step()) {
    raw = stmt.getAsObject()[column];
  }
  stmt.free();

  let arr: any[] = [];
  if (raw) {
    try {
      arr = JSON.parse(raw);
    } catch {
      arr = [];
    }
  }

  const byId = new Map(arr.map((item: any) => [item._id, item]));

  for (const { _id, deltas, set } of patch.updated ?? []) {
    const item = byId.get(_id);
    if (!item) continue;
    for (const [k, delta] of Object.entries(deltas ?? {})) {
      item[k] = (item[k] ?? 0) + (delta as number);
    }
    for (const [k, v] of Object.entries(set ?? {})) {
      item[k] = v;
    }
  }

  for (const id of patch.removed ?? []) {
    byId.delete(id);
  }

  let nextArr = Array.from(byId.values());

  for (const item of patch.added ?? []) {
    nextArr.push(item);
  }

  db.run(`UPDATE ${table} SET ${column} = ? WHERE ${pk} = ?`, [
    JSON.stringify(nextArr),
    recordId,
  ]);
}