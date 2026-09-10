import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./TitleBar.css";
import logo from "../assets/logo.png";
import { usePost } from "../Hooks/usePost";
import { io } from "socket.io-client";

function getUpdatedFields(baseData, currentData) {
  const updates = {};
  for (const key in currentData) {
    if (Object.prototype.hasOwnProperty.call(currentData, key)) {
      if (JSON.stringify(baseData[key]) !== JSON.stringify(currentData[key])) {
        updates[key] = currentData[key];
      }
    }
  }
  return updates;
}

function SyncIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8a5.5 5.5 0 0 1 8-4.5l-1.5 1.5" />
      <path d="M13.5 8a5.5 5.5 0 0 1-8 4.5l1.5-1.5" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <line x1="4" y1="11" x2="12" y2="11" strokeLinecap="round" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="4" y="4" width="8" height="8" rx="1.2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <line x1="4" y1="4" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="4" x2="4" y2="12" strokeLinecap="round" />
    </svg>
  );
}

export default function TitleBar({ currentLocalData, lastSyncedData }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveProgress, setLiveProgress] = useState(null);
  const [isConnected, setIsConnected] = useState(navigator.onLine);

  // استعادة آخر وقت مزامنة من التخزين المحلي حتى لا يضيع عند عمل Refresh
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    const cached = localStorage.getItem("last_sync_time");
    if (!cached) return null;
    try {
      const d = new Date(cached);
      return !isNaN(d.getTime()) ? d.toLocaleString() : cached;
    } catch {
      return cached;
    }
  });

  const isSyncingRef = useRef(false);
  const hideTimerRef = useRef(null);
  const { postData } = usePost();

  useEffect(() => {
    let active = true;

    // جلب آخر وقت مزامنة مسجل في السيرفر المحلي فور فتح التطبيق أو عمل ريفرش
    fetch("http://localhost:3001/api/sync/last-sync")
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.lastSyncAt) {
          const d = new Date(data.lastSyncAt);
          if (!isNaN(d.getTime())) {
            setLastSyncTime(d.toLocaleString());
            localStorage.setItem("last_sync_time", data.lastSyncAt);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch last sync time:", err);
      });

    const socket = io("http://localhost:3001");

    // استلام آخر وقت سينك فور الاتصال بالسوكت
    socket.on("sync-status", (data) => {
      if (data?.lastSyncAt) {
        const d = new Date(data.lastSyncAt);
        if (!isNaN(d.getTime())) {
          setLastSyncTime(d.toLocaleString());
          localStorage.setItem("last_sync_time", data.lastSyncAt);
        }
      }
    });

    socket.on("sync-progress", (data) => {
      if (data.type === "bootstrap") return;

      // عند اكتمال أول مزامنة تلقائية (Summary) يتم تحديث الوقت فوراً
      if (data.type === "summary") {
        setLiveProgress(data);
        const iso = data.completedAt || new Date().toISOString();
        const d = new Date(iso);
        const formatted = !isNaN(d.getTime()) ? d.toLocaleString() : iso;
        setLastSyncTime(formatted);
        localStorage.setItem("last_sync_time", iso);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setLiveProgress(null);
        }, 6000);
        return;
      }

      const msg = data.message?.toLowerCase() || "";
      if (
        msg.includes("already up to date") ||
        msg.includes("no pending changes") ||
        msg.includes("no local changes")
      ) {
        return;
      }

      const isZeroActivity =
        msg.includes("pushed 0 changes") || msg.includes("0 tables");
      if (isZeroActivity && !isSyncingRef.current) {
        return;
      }

      setLiveProgress(data);

      if (data.status === "completed") {
        const iso = data.completedAt || new Date().toISOString();
        const d = new Date(iso);
        const formatted = !isNaN(d.getTime()) ? d.toLocaleString() : iso;
        setLastSyncTime(formatted);
        localStorage.setItem("last_sync_time", iso);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setLiveProgress(null);
        }, 6000);
      } else if (data.status === "error") {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setLiveProgress(null);
        }, 6000);
      }
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      if (!navigator.onLine) {
        if (active) setIsConnected(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch("https://bcknd.systego.net", {
          mode: "no-cors",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (active) setIsConnected(true);
      } catch (err) {
        if (active) setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);

    const handleOnline = () => checkConnection();
    const handleOffline = () => {
      if (active) setIsConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncingRef.current) return;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    isSyncingRef.current = true;
    setIsSyncing(true);

    setLiveProgress({
      type: "pull",
      status: "started",
      percent: 30,
      message: "Pulling updates from server...",
    });

    try {
      const pulledData = await postData("api/sync/pull", {
        id: currentLocalData?.id,
      });

      const pullResults = pulledData?.results;
      const pullSummaryText =
        pullResults && Object.keys(pullResults).length > 0
          ? `${Object.keys(pullResults).length} tables`
          : "No data";

      setLiveProgress({
        type: "push",
        status: "started",
        percent: 65,
        message: "Pushing local changes...",
      });

      const updatedFields = getUpdatedFields(
        pulledData || lastSyncedData || {},
        currentLocalData || {},
      );
      const hasChanges = Object.keys(updatedFields).length > 0;

      const payload = {
        id: currentLocalData?.id,
        ...(hasChanges && { updates: updatedFields }),
      };

      const pushResult = await postData("api/sync/push", payload);
      const pushedCount = pushResult?.pushed ?? 0;
      // ضبط الوقت على توقيت الجهاز المحلي الحالي فور اكتمال السينك وتخزينه
      const isoTime = pushResult?.syncTime || pulledData?.syncTime || new Date().toISOString();
      const d = new Date(isoTime);
      const formattedTime = !isNaN(d.getTime()) ? d.toLocaleString() : isoTime;
      setLastSyncTime(formattedTime);
      localStorage.setItem("last_sync_time", isoTime);

      setLiveProgress({
        type: "summary",
        status: "completed",
        percent: 100,
        message: "Sync completed successfully.",
        summary: {
          pull: `done — ${pullSummaryText}`,
          push: `done — ${pushedCount} pushed`,
        },
      });
    } catch (error) {
      console.error("Sync failed:", error);
      setLiveProgress({
        type: "error",
        status: "error",
        percent: 100,
        message: `Sync failed: ${error.message || "Unknown error"}`,
      });
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);

      hideTimerRef.current = setTimeout(() => {
        setLiveProgress(null);
      }, 6000);
    }
  };

  return (
    <>
      <div className="titlebar">
        <div className="left">
          <div className="logo-wrap">
            <img src={logo} className="logo" alt="Logo" />
          </div>

          <span className="title">
            SysteGo
            <span className={`spark ${isConnected ? "online" : "offline"}`} />
          </span>
        </div>

        <div className="right">
          <span className="last-sync-time">
            Last Sync: {lastSyncTime || "Not Synced"}
          </span>

          <button
            className={`sync-btn ${isSyncing ? "syncing" : ""}`}
            aria-label="Sync Data"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <SyncIcon />
          </button>

          <button
            aria-label="Minimize"
            onClick={() => window.electronAPI.minimize()}
          >
            <MinimizeIcon />
          </button>
          <button
            aria-label="Maximize"
            onClick={() => window.electronAPI.maximize()}
          >
            <MaximizeIcon />
          </button>
          <button
            className="close"
            aria-label="Close"
            onClick={() => window.electronAPI.close()}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* كارت الإشعار الأبيض الموحد في أعلى اليمين */}
      {liveProgress &&
        createPortal(
          <div className="sync-floating-card">
            <div className="sync-card-header">
              <div className="sync-badge-title">
                <span className={`sync-pulse-dot ${liveProgress.status}`} />
                <span className="sync-op-type">
                  {liveProgress.type === "summary"
                    ? "SYNC STATUS"
                    : liveProgress.type === "pull"
                      ? "PULL SYNC"
                      : "PUSH SYNC"}
                </span>
              </div>
              <span className="sync-card-percent">
                {liveProgress.percent || 0}%
              </span>
            </div>

            <p className="sync-card-msg">{liveProgress.message}</p>

            {/* تفاصيل المزامنة (Pull / Push) المدمجة داخل الكارت */}
            {liveProgress.summary && (
              <div className="sync-card-summary">
                <div className="summary-row">
                  <span className="summary-label">Pull:</span>
                  <span className="summary-val">
                    {liveProgress.summary.pull}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Push:</span>
                  <span className="summary-val">
                    {liveProgress.summary.push}
                  </span>
                </div>
              </div>
            )}

            <div className="sync-card-track">
              <div
                className={`sync-card-bar ${liveProgress.status === "error" ? "error" : ""}`}
                style={{ width: `${liveProgress.percent || 0}%` }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
