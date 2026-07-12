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
export const isTableBootstrapped = (t: string) => getMeta(`bootstrap_${t}_done`) === "true";
export const markTableBootstrapped = (t: string) => setMeta(`bootstrap_${t}_done`, "true");
export const getLastSyncAt = (t: string) => getMeta(`last_sync_at_${t}`);
export const setLastSyncAt = (t: string, iso: string) => setMeta(`last_sync_at_${t}`, iso);