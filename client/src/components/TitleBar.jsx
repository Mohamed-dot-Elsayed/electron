import { useState, useRef, useEffect } from "react"; 
import { createPortal } from "react-dom";
import "./TitleBar.css"; 
import logo from "../assets/logo.png"; 
import { usePost } from "../Hooks/usePost"; 

// Helper function to extract only updated fields
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
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

// Added props to pass in the data you want to sync
export default function TitleBar({ currentLocalData, lastSyncedData }) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Tracks which phase of the sync we're in so we can show it to the user:
  // "idle" | "pulling" | "pushing" | "success" | "error"
  const [syncPhase, setSyncPhase] = useState("idle");
  const [syncError, setSyncError] = useState(null);
  const [pullSummary, setPullSummary] = useState(null);
  const [pushSummary, setPushSummary] = useState(null);

  // 1. Race Condition Guard: useRef acts as a synchronous lock
  // This prevents multiple API calls if the user double-clicks rapidly
  const isSyncingRef = useRef(false);

  // Ref on the sync button wrapper so we can measure its real screen
  // position and portal the popup out of the titlebar (which is usually
  // `overflow: hidden` and would otherwise clip it invisibly).
  const syncWrapRef = useRef(null);
  const [popupPos, setPopupPos] = useState(null);

  const { postData } = usePost();

  // Recompute the popup's screen position any time it should be visible.
  useEffect(() => {
    if (syncPhase !== "idle" && syncWrapRef.current) {
      const rect = syncWrapRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    } else {
      setPopupPos(null);
    }
  }, [syncPhase]);

  const handleSync = async () => {
    // Check the synchronous lock before proceeding[cite: 2]
    if (isSyncingRef.current) return;

    // Lock the function and set the UI loading state
    isSyncingRef.current = true;
    setIsSyncing(true); 
    setSyncError(null);
    setPullSummary(null);
    setPushSummary(null);

    try {
      // ---- STEP 1: PULL (confirmed POST endpoint, must finish before we push) ----
      setSyncPhase("pulling");

      const pulledData = await postData("api/sync/pull", {
        id: currentLocalData?.id,
      });

      // Build a human-readable summary of the pull response, e.g.
      // { "status": "done", "results": {} } -> "done — No data"
      const pullResults = pulledData?.results;
      const hasPullResults = pullResults && Object.keys(pullResults).length > 0;
      setPullSummary({
        status: pulledData?.status ?? "unknown",
        text: hasPullResults ? JSON.stringify(pullResults) : "No data",
      });

      // ---- STEP 2: PUSH (only starts once pull has fully resolved) ----
      setSyncPhase("pushing");

      // 2. Delta Updates: Get only the fields that have been modified,
      // comparing against whatever the pull just returned as the source of truth
      const updatedFields = getUpdatedFields(
        pulledData || lastSyncedData || {},
        currentLocalData || {},
      );
      const hasChanges = Object.keys(updatedFields).length > 0;

      // Construct the payload to only send the ID and the modified fields
      const payload = {
        id: currentLocalData?.id,
        ...(hasChanges && { updates: updatedFields }),
      };

      const pushResult = await postData("api/sync/push", payload);

      // Build a human-readable summary of the push response, e.g.
      // { "status": "done", "pushed": 0 } -> "done — 0 pushed"
      setPushSummary({
        status: pushResult?.status ?? "unknown",
        pushed: pushResult?.pushed ?? 0,
      });

      console.log("Sync payload sent:", payload, "Push result:", pushResult);
      setSyncPhase("success");
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncError(error.message || "Sync failed");
      setSyncPhase("error");
    } finally {
      // Release the lock and reset the UI loading state[cite: 2]
      isSyncingRef.current = false;
      setIsSyncing(false); 

      // Auto-dismiss the status popup after a short delay
      setTimeout(() => {
        setSyncPhase("idle");
        setSyncError(null);
        setPullSummary(null);
        setPushSummary(null);
      }, 4000);
    }
  };

  const syncStatusLabel = {
    pulling: "Pulling changes…",
    pushing: "Pushing changes…",
    success: "Sync complete",
    error: syncError ? `Sync failed: ${syncError}` : "Sync failed",
  }[syncPhase];

  return (
    <div className="titlebar">
      <div className="left">
        <div className="logo-wrap">
          <img src={logo} className="logo" alt="Logo" />
        </div>

        <span className="title">
          SysteGo
          <span className="spark" />
        </span>
      </div>

      <div className="right">
        {/* Sync Button */}
        <div
          ref={syncWrapRef}
          className="sync-wrap"
          style={{ position: "relative", display: "inline-flex" }}
        >
          <button
            className={`sync-btn ${isSyncing ? "syncing" : ""}`}
            aria-label="Sync Data"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <SyncIcon />
          </button>

          {syncPhase !== "idle" &&
            popupPos &&
            createPortal(
              <div
                className={`sync-popup sync-popup--${syncPhase}`}
                role="status"
                style={{
                  position: "fixed",
                  top: popupPos.top,
                  right: popupPos.right,
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  color: "#fff",
                  backgroundColor:
                    syncPhase === "error"
                      ? "#d33"
                      : syncPhase === "success"
                        ? "#2a9d5c"
                        : "#333",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  zIndex: 999999,
                }}
              >
                {syncPhase === "success" ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <span>
                      Pull: {pullSummary?.status} — {pullSummary?.results.length || 0} 
                    </span>
                    <span>
                      Push: {pushSummary?.status} — {pushSummary?.pushed} pushed
                    </span>
                  </div>
                ) : (
                  syncStatusLabel
                )}
              </div>,
              document.body,
            )}
        </div>

        <button className="menu" aria-label="Menu">
          <MenuIcon />
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
  ); 
}
