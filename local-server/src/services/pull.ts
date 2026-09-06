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
import { emitSyncProgress } from "../socket";

const REMOTE_BASE = process.env.REMOTE_API_URL;
const SYNC_CURSOR_KEY = "_global";

type FieldOp =
  | { op: "set"; value: any }
  | { op: "inc"; value: number }
  | {
      op: "arrayPatch";
      updated: {
        _id: any;
        deltas: Record<string, number>;
        set: Record<string, any>;
      }[];
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
  if (/^\d+$/.test(raw)) {
    const ms = parseInt(raw, 10);
    return new Date(ms).toISOString();
  }
  return raw;
}

export async function pullAllTables(): Promise<Record<string, number>> {
  const db = getDB();
  const knownTables = new Set(getAllTableNames());
  const clientId = getOrCreateClientId();

  emitSyncProgress({
    type: "pull",
    status: "started",
    percent: 10,
    message: "Connecting to server and fetching changes...",
  });

  const rawSince = getLastSyncAt(SYNC_CURSOR_KEY) ?? "1970-01-01T00:00:00.000Z";
  const since = normalizeCursor(rawSince);

  if (rawSince !== since) {
    setLastSyncAt(SYNC_CURSOR_KEY, since);
  }

  let responseData;
  try {
    const response = await axios.get(`${REMOTE_BASE}/api/sync/pull`, {
      params: { since, clientId },
    });
    responseData = response.data;
  } catch (error: any) {
    emitSyncProgress({
      type: "pull",
      status: "error",
      percent: 100,
      message: `Failed to fetch updates: ${error.response?.data?.message || error.message}`,
    });

    if (error.response) {
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2),
      );
      console.error("Server error:", error.response.data.error);
    }
    throw error;
  }

  const payload = responseData.data;
  const changes: RemoteChange[] = payload.changes ?? [];
  const serverTime: string = payload.serverTime;
  const results: Record<string, number> = {};
  console.log("changes ", changes);

  if (changes.length === 0) {
    setLastSyncAt(SYNC_CURSOR_KEY, serverTime);
    console.log("No changes on Server");
    emitSyncProgress({
      type: "pull",
      status: "completed",
      percent: 100,
      message: "Data is already up to date.",
    });
    return results;
  }

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
  const totalTables = byTable.size;
  let currentTableIndex = 0;

  for (const [table, tableChanges] of byTable) {
    currentTableIndex++;
    const progressPercent =
      20 + Math.round((currentTableIndex / totalTables) * 60);

    emitSyncProgress({
      type: "pull",
      status: "progress",
      table,
      current: currentTableIndex,
      total: totalTables,
      percent: progressPercent,
      message: `Syncing ${table} (${tableChanges.length} changes)...`,
    });

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
            const raw = (change.data ?? {}) as Record<string, any>;
            const row =
              raw.fields &&
              typeof raw.fields === "object" &&
              !Array.isArray(raw.fields)
                ? raw.fields
                : raw;

            if (Object.keys(row).length === 0) {
              console.warn(
                `Empty insert payload for ${table}/${change.record_id}, skipping`,
              );
              continue;
            }

            row[pk] = row[pk] ?? row.id ?? change.record_id;

            applyUpsert(db, table, row, localColumns, pk);
            enqueuePendingImages(extractImageUrls(table, row));
            continue;
          }

          const updatePayload = (change.data ?? {
            fields: {},
          }) as UpdatePayload;
          const changedValues = applyFieldOps(
            db,
            table,
            change.record_id,
            updatePayload,
            localColumns,
            pk,
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
    emitSyncProgress({
      type: "pull",
      status: "completed",
      percent: 100,
      message: `Successfully pulled all changes across ${totalTables} tables.`,
    });
  } else {
    emitSyncProgress({
      type: "pull",
      status: "error",
      percent: 100,
      message:
        "Sync partially completed. Some tables had conflicts and will retry.",
    });
    console.warn(
      "Some tables failed to sync — cursor not advanced, will retry next pull",
    );
  }

  return results;
}

function getLocalUpdatedAt(
  db: any,
  table: string,
  pk: string,
  recordId: string,
): string | undefined {
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
 * Insert path with robust conflict fallback to prevent UNIQUE constraint failure.
 */
function applyUpsert(
  db: any,
  table: string,
  row: Record<string, any>,
  localColumns: string[],
  pk: string,
) {
  const localUpdatedAt = getLocalUpdatedAt(db, table, pk, row[pk]);

  const remoteUpdatedAt = row.updatedAt ?? row.updated_at;
  if (
    localUpdatedAt &&
    remoteUpdatedAt &&
    new Date(localUpdatedAt) > new Date(remoteUpdatedAt)
  ) {
    console.log(`Skipping ${table}/${row[pk]} — local version is newer (LWW)`);
    return;
  }

  const columns = Object.keys(row).filter((c) => localColumns.includes(c));
  if (columns.length === 0) return;

  const placeholders = columns.map(() => "?").join(", ");
  const bindValues = sanitizeBindValues(columns.map((c) => row[c]));

  try {
    const updates = columns
      .filter((c) => c !== pk)
      .map((c) => `${c} = excluded.${c}`)
      .join(", ");

    db.run(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
       ON CONFLICT(${pk}) DO UPDATE SET ${updates}`,
      bindValues,
    );
  } catch (err: any) {
    if (String(err.message).includes("UNIQUE constraint failed")) {
      db.run(
        `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
        bindValues,
      );
    } else {
      throw err;
    }
  }
}

function applyFieldOps(
  db: any,
  table: string,
  recordId: string,
  payload: UpdatePayload,
  localColumns: string[],
  pk: string,
): Record<string, any> | null {
  const fields = payload.fields ?? {};
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;

  const localUpdatedAt = getLocalUpdatedAt(db, table, pk, recordId);
  if (!localUpdatedAt) {
    console.warn(
      `Update target ${table}/${recordId} not found locally — skipping`,
    );
    return null;
  }

  if (
    payload.updatedAt &&
    new Date(localUpdatedAt) > new Date(payload.updatedAt)
  ) {
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

    setClauses.push(`${key} = ?`);
    setValues.push(...sanitizeBindValues([fieldOp.value]));
    changedValues[key] = fieldOp.value;
  }

  if (payload.updatedAt) {
    setClauses.push(`updatedAt = ?`);
    setValues.push(...sanitizeBindValues([payload.updatedAt]));
  }

  if (setClauses.length > 0) {
    db.run(`UPDATE ${table} SET ${setClauses.join(", ")} WHERE ${pk} = ?`, [
      ...setValues,
      ...sanitizeBindValues([recordId]),
    ]);
  }

  return Object.keys(changedValues).length > 0 ? changedValues : null;
}

function applyArrayPatch(
  db: any,
  table: string,
  pk: string,
  recordId: string,
  column: string,
  patch: {
    updated: {
      _id: any;
      deltas: Record<string, number>;
      set: Record<string, any>;
    }[];
    added: any[];
    removed: any[];
  },
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
