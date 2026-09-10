import axios from "axios";
import { pullAllTables } from "./pull";
import { pushAllChanges } from "./push";
import { isBootstrapDone, getLastSyncCompletedAt, setLastSyncCompletedAt } from "./appMeta";
import { runBootstrapAll } from "./bootstrap";
import { emitSyncProgress } from "../socket";

const REMOTE_BASE = process.env.REMOTE_API_URL || "https://bcknd.systego.net";
let syncTimeoutTimer: NodeJS.Timeout | null = null;
let configuredIntervalMinutes = 30;
let isSyncRunning = false;
let lastAttemptFailed = false;

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

  const intervalMs = configuredIntervalMinutes * 60 * 1000;
  const lastSyncStr = getLastSyncCompletedAt();
  let delayMs = intervalMs;

  if (lastSyncStr) {
    const lastSyncTime = new Date(lastSyncStr).getTime();
    if (!isNaN(lastSyncTime)) {
      const elapsedMs = Date.now() - lastSyncTime;
      if (elapsedMs >= intervalMs) {
        // More than 30 minutes have already passed since last sync!
        // If last attempt failed, retry in 1 minute; otherwise run in 5s
        delayMs = lastAttemptFailed ? 60000 : 5000;
      } else {
        // Run after the actual remaining time
        delayMs = Math.max(1000, intervalMs - elapsedMs);
      }
    }
  }

  const minutesRemaining = Math.max(1, Math.round(delayMs / 60000));
  console.log(
    `⏱️ Next auto-sync scheduled in ${minutesRemaining} minute(s) (${Math.round(delayMs / 1000)}s).`,
  );

  syncTimeoutTimer = setTimeout(async () => {
    await runFullSync();
  }, delayMs);
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
      lastAttemptFailed = true;
      return;
    }

    let pullSummaryText = "No data";
    let hasPulledData = false;
    let pullFailed = false;
    try {
      const pullRes = await pullAllTables();
      const results = pullRes?.results;
      if (results && Object.keys(results).length > 0) {
        pullSummaryText = `${Object.keys(results).length} tables`;
        hasPulledData = true;
      }
    } catch (pullErr: any) {
      pullSummaryText = "failed";
      pullFailed = true;
      console.error("Auto pull failed:", pullErr.message);
    }

    let pushedCount = 0;
    let pushFailed = false;
    try {
      const pushRes = await pushAllChanges();
      pushedCount = pushRes?.pushed ?? 0;
    } catch (pushErr: any) {
      pushFailed = true;
      console.error("Auto push failed:", pushErr.message);
    }

    if (pullFailed && pushFailed) {
      lastAttemptFailed = true;
    } else {
      lastAttemptFailed = false;
      const now = new Date().toISOString();
      setLastSyncCompletedAt(now);

      emitSyncProgress({
        type: "summary",
        status: "completed",
        percent: 100,
        message: "Sync completed successfully.",
        summary: {
          pull: `done — ${pullSummaryText}`,
          push: `done — ${pushedCount} pushed`,
        },
        completedAt: now,
      });
    }
  } catch (err: any) {
    lastAttemptFailed = true;
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
