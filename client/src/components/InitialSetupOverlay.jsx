import React from "react";
import logo from "../assets/logo.png";
import "./InitialSetupOverlay.css";

export default function InitialSetupOverlay({ progressData, onDismiss }) {
  const percent = progressData?.percent || 0;
  const isError = progressData?.status === "error";
  const message = progressData?.message || "Preparing initial setup...";
  const table = progressData?.table;
  const current = progressData?.current;
  const total = progressData?.total;

  return (
    <div className="setup-overlay">
      <div className="setup-card">
        <div className="setup-logo-wrap">
          <img src={logo} alt="SysteGo Logo" className="setup-logo" />
        </div>

        <h2 className="setup-title">SysteGo POS Setup</h2>
        <p className="setup-subtitle">
          Initializing local offline database for the first time.
        </p>

        <div className="setup-progress-container">
          <div className="setup-progress-track">
            <div
              className={`setup-progress-bar ${isError ? "error" : ""}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="setup-stats">
            <span className="setup-message">{message}</span>
            <span className="setup-percent">
              {isError ? "Error" : `${percent}%`}
            </span>
          </div>
        </div>

        {total > 0 && table && (
          <div className="setup-table-badge">
            Table: <strong>{table}</strong> ({current}/{total})
          </div>
        )}

        {isError && (
          <button
            onClick={onDismiss}
            style={{
              marginTop: "16px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              padding: "10px 22px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
            }}
          >
            Skip & Open POS
          </button>
        )}
      </div>
    </div>
  );
}
