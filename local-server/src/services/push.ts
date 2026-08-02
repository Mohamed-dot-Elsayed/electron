import axios from "axios";
import { getDB, saveDB } from "../db/db";
import { deserializeRow } from "../db/createModel";
import { getModelSchema } from "../db/model-registry";
import { isIncrementalField } from "../db/schemaHelpers";
import { getLastSyncAt, getOrCreateClientId } from "./appMeta";

const REMOTE_BASE = process.env.REMOTE_API_URL;
const SYNC_CURSOR_KEY = "_global";

type ChangeRow = {
  id: string;
  table_name: string;
  record_id: string;
  op: "insert" | "update" | "delete";
  old_payload: string | null;
  new_payload: string | null;
  created_at: string;
};

type FieldOp = { op: "set" | "inc"; value: any };

function buildPayload(
  tableName: string,
  op: ChangeRow["op"],
  oldRow: Record<string, any> | null,
  newRow: Record<string, any> | null
): string | null {
  if (op === "delete") return null;

  if (op === "insert") {
    const flatRow: Record<string, any> = {};
    const skip = new Set(["_id", "createdAt", "updatedAt"]);
    for (const [key, value] of Object.entries(newRow ?? {})) {
      if (skip.has(key)) continue;
      flatRow[key] = value;
    }
    return JSON.stringify(flatRow);
  }

  // op === "update"
  const fields: Record<string, FieldOp> = {};
  const skip = new Set(["_id", "createdAt"]);
  const keys = new Set([
    ...Object.keys(oldRow ?? {}),
    ...Object.keys(newRow ?? {}),
  ]);

  for (const key of keys) {
    if (skip.has(key)) continue;

    const oldVal = oldRow?.[key];
    const newVal = newRow?.[key];

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    if (
      isIncrementalField(tableName, key) &&
      typeof oldVal === "number" &&
      typeof newVal === "number"
    ) {
      const delta = newVal - oldVal;
      if (delta !== 0) fields[key] = { op: "inc", value: delta };
      continue;
    }

    fields[key] = { op: "set", value: newVal };
  }

  return JSON.stringify({ fields });
}

export async function pushAllChanges() {
  const db = getDB();
  const clientId = getOrCreateClientId();
  const lastSync = getLastSyncAt(SYNC_CURSOR_KEY)


  const res = db.exec(`
    SELECT id, table_name, record_id, op, old_payload, new_payload, created_at
    FROM change_log
    WHERE synced_at IS NULL
    ORDER BY seq ASC
  `);

  if (!res[0]) {
    console.log("No pending changes to push");
    return { pushed: 0, lastSync };
  }

  const columns = res[0].columns;
  const rawChanges: ChangeRow[] = res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });

  const outgoing = rawChanges.map((change) => {
    try {
      const schema = getModelSchema(change.table_name);

      let oldRow: Record<string, any> | null = null;
      let newRow: Record<string, any> | null = null;

      if (change.old_payload) {
        const raw = JSON.parse(change.old_payload);
        oldRow = schema ? deserializeRow(schema, raw) : raw;
      }
      if (change.new_payload) {
        const raw = JSON.parse(change.new_payload);
        newRow = schema ? deserializeRow(schema, raw) : raw;
      }

      const payload = buildPayload(
        change.table_name,
        change.op,
        oldRow,
        newRow
      );

      return {
        id: change.id,
        table_name: change.table_name,
        record_id: change.record_id,
        op: change.op,
        payload,
        created_at: change.created_at,
      };
    } catch (err) {
      console.error(`Failed to build payload for change ${change.id}`, err);
      // leave as a no-op-ish change so it fails clearly server-side and gets retried,
      // rather than silently corrupting data
      return {
        id: change.id,
        table_name: change.table_name,
        record_id: change.record_id,
        op: change.op,
        payload: null,
        created_at: change.created_at,
      };
    }
  });

  console.log(`Pushing ${outgoing.length} changes...`);
  console.log(JSON.stringify(outgoing, null, 2))
  const { data } = await axios.post(`${REMOTE_BASE}/api/sync/push`, {
    changes: outgoing,
    clientId,
  });

  if (data.data.applied?.length) {
    const placeholders = data.data.applied.map(() => "?").join(", ");
    db.run(
      `UPDATE change_log SET synced_at = datetime('now') WHERE id IN (${placeholders})`,
      data.data.applied
    );
    saveDB();
    console.log(`Marked ${data.data.applied.length} changes as synced`);
  }

  if (data.data.failed?.length) {
    console.error(
      `${data.data.failed.length} changes failed to push:`,
      data.data.failed
    );
    // left unsynced on purpose -> retried next push cycle
  }
  return { lastSync, pushed: (data.data.applied?.length ?? 0) };
}
