import { getDB, saveDB } from "../db/db";

export function getMeta(key: string): string | null {
  const res = getDB().exec("SELECT value FROM app_meta WHERE key = ?", [key]);
  return (res[0]?.values[0]?.[0] as string) ?? null;
}

export function setMeta(key: string, value: string) {
  getDB().run(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value]
  );
  saveDB();
}

export const isBootstrapDone = () => getMeta("bootstrap_completed") === "true";
export const markBootstrapComplete = () => setMeta("bootstrap_completed", "true");

// per-table bootstrap flags — key must include the table name or every table
// shares the same "bootstrap_done" row
export const isTableBootstrapped = (table: string) =>
  getMeta(`bootstrap_done:${table}`) === "true";
export const markTableBootstrapped = (table: string) =>
  setMeta(`bootstrap_done:${table}`, "true");

// sync cursor — call with a table name for per-table cursors, or a fixed key
// like "_global" if the remote feed isn't scoped by table (current setup)
export function getLastSyncAt(scope: string): string | null {
  return getMeta(`last_sync_at:${scope}`);
}

export function setLastSyncAt(scope: string, isoTime: string) {
  setMeta(`last_sync_at:${scope}`, isoTime);
}