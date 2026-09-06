import axios from "axios";
import { pullAllTables } from "./pull";
import { pushAllChanges } from "./push";
import { isBootstrapDone } from "./appMeta";
import { runBootstrapAll } from "./bootstrap";
import { emitSyncProgress } from "../socket";

const REMOTE_BASE = process.env.REMOTE_API_URL || "https://bcknd.systego.net";
let syncTimeoutTimer: NodeJS.Timeout | null = null;
let configuredIntervalMinutes = 30;
let isSyncRunning = false;

async function isOnline(): Promise<boolean> {
  try {
    await axios.get(`${REMOTE_BASE}/api/sync/pull`, {
      params: { since: "1970-01-01T00:00:00.000Z", clientId: "ping" },
      timeout: 3000,
    });
    return true;
  } catch (err: any) {
    return Boolean(err.response);
  }
}

export function resetAutoSyncTimer() {
  if (syncTimeoutTimer) clearTimeout(syncTimeoutTimer);

  const ms = configuredIntervalMinutes * 60 * 1000;
  console.log(
    `⏱️ Next auto-sync scheduled in ${configuredIntervalMinutes} minute(s).`,
  );

  syncTimeoutTimer = setTimeout(async () => {
    await runFullSync();
  }, ms);
}

export async function runFullSync() {
  if (isSyncRunning) {
    console.log("Sync already in progress, skipping auto-sync tick.");
    return;
  }

  isSyncRunning = true;
  console.log("🚀 [AUTO-SYNC TRIGGERED] Running scheduled sync...");

  try {
    if (!isBootstrapDone()) {
      console.log(
        "Bootstrap not complete, running bootstrap instead of sync...",
      );
      try {
        await runBootstrapAll();
      } catch (err: any) {
        console.error("Bootstrap error in sync runner:", err);
      }
      return;
    }

    const online = await isOnline();
    if (!online) {
      console.log("Device is offline, delaying next sync attempt...");
      return;
    }

    let pullSummaryText = "No data";
    let hasPulledData = false;
    try {
      const pullRes = await pullAllTables();
      const results = pullRes?.results;
      if (results && Object.keys(results).length > 0) {
        pullSummaryText = `${Object.keys(results).length} tables`;
        hasPulledData = true;
      }
    } catch (pullErr: any) {
      pullSummaryText = "failed";
      console.error("Auto pull failed:", pullErr.message);
    }

    let pushedCount = 0;
    try {
      const pushRes = await pushAllChanges();
      pushedCount = pushRes?.pushed ?? 0;
    } catch (pushErr: any) {
      console.error("Auto push failed:", pushErr.message);
    }

    emitSyncProgress({
      type: "summary",
      status: "completed",
      percent: 100,
      message: "Sync completed successfully.",
      summary: {
        pull: `done — ${pullSummaryText}`,
        push: `done — ${pushedCount} pushed`,
      },
    });
  } catch (err: any) {
    console.error("Auto-sync error:", err.message);
    emitSyncProgress({
      type: "error",
      status: "error",
      percent: 100,
      message: `Auto-sync failed: ${err.message}`,
    });
  } finally {
    isSyncRunning = false;
    resetAutoSyncTimer();
  }
}

export function startAutoSyncCron(intervalMinutes = 30) {
  configuredIntervalMinutes = intervalMinutes;
  resetAutoSyncTimer();
}
