const { app, BrowserWindow, dialog, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
app.setName("SyncDemo");

// REMOTE_API_URL points at your "cloud" server. In this demo it's the
// remote-server folder running locally on port 4000. In real life this
// would be your deployed backend URL (e.g. your EC2 instance).
process.env.REMOTE_API_URL =
  process.env.REMOTE_API_URL || "http://localhost:4000";

process.env.LOCAL_DB_PATH = path.join(app.getPath("userData"), "local.db");

const { initDb } = require("../local-server/dist/db");
const { createServer } = require("../local-server/dist/app");

const PORT = 3001;
let mainWindow;
let serverInstance;
let isQuitting = false;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

// ⭐ IMPROVED: Force-kill any existing server connections
function stopServer() {
  return new Promise((resolve) => {
    if (!serverInstance) {
      console.log("No server instance to stop");
      resolve();
      return;
    }
    
    console.log("Stopping server...");
    const server = serverInstance;
    serverInstance = null;
    
    // Force close all connections immediately
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
    
    // Set a timeout to force close
    const forceTimeout = setTimeout(() => {
      console.log("Force closing server after timeout");
      server.close();
      resolve();
    }, 2000);
    
    server.close(() => {
      clearTimeout(forceTimeout);
      console.log("Server stopped gracefully");
      resolve();
    });
  });
}

async function startServer() {
  await initDb();
  const expressApp = createServer();
  return new Promise((resolve, reject) => {
    serverInstance = expressApp.listen(PORT, () => {
      console.log(`Local server listening on http://localhost:${PORT}`);
      resolve(serverInstance);
    });
    serverInstance.on("error", reject);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.on("closed", () => (mainWindow = null));

  mainWindow.webContents.on(
    "did-fail-load",
    (_e, errorCode, errorDescription) => {
      dialog.showErrorBox(
        "Failed to load app",
        `Could not load http://localhost:${PORT}\n\n${errorDescription} (${errorCode})`
      );
    }
  );
}

function loadEmbeddedToken() {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "embedded-token.json"), "utf-8")
    );
    return data.token || null;
  } catch (e) {
    return null;
  }
}

function notify(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function setupAutoUpdates() {
  const logPath = path.join(app.getPath("userData"), "update-log.txt");
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(line.trim());
    fs.appendFileSync(logPath, line);
  };

  log(
    `App starting. Current version: ${app.getVersion()}. isPackaged: ${
      app.isPackaged
    }`
  );

  if (!app.isPackaged) {
    log("Skipping update check - app is not packaged.");
    return;
  }

  const token = loadEmbeddedToken();
  if (token) {
    process.env.GH_TOKEN = token;
    log("Loaded embedded token for private-repo update checks.");
  } else {
    log(
      "WARNING: no embedded token found - update checks against the private repo will fail with 404."
    );
  }

  autoUpdater.on("checking-for-update", () => {
    log("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    log(`Update available: v${info.version}. Downloading...`);
    notify(
      "Update found",
      `Version ${info.version} is downloading in the background.`
    );
  });

  autoUpdater.on("update-not-available", (info) => {
    log(
      `No update available. Latest published version is v${
        info.version
      }, this is v${app.getVersion()}.`
    );
  });

  autoUpdater.on("download-progress", (p) => {
    log(`Downloading update: ${Math.round(p.percent)}%`);
    if (mainWindow) mainWindow.setProgressBar(p.percent / 100);
  });

  // ⭐ FIXED: Updated update-downloaded handler
  autoUpdater.on("update-downloaded", (info) => {
    log(`Update v${info.version} downloaded. Prompting to restart.`);
    if (mainWindow) mainWindow.setProgressBar(-1);
    notify("Update ready", `Version ${info.version} is ready to install.`);
    
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update ready",
        message: `Version ${info.version} has been downloaded. Restart now to install it?`,
        buttons: ["Restart now", "Later"],
      })
      .then(async (result) => {
        if (result.response === 0) {
          log("User chose to restart. Stopping services...");
          
          // ⭐ Close all windows first
          if (mainWindow) {
            mainWindow.close();
            mainWindow = null;
          }
          
          // ⭐ Stop the server and wait for it
          isQuitting = true;
          await stopServer();
          
          // ⭐ Give Node.js time to cleanup event loop
          log("Services stopped. Starting update installation...");
          setTimeout(() => {
            autoUpdater.quitAndInstall(true, true);
          }, 500);
        }
      });
  });

  autoUpdater.on("error", (err) => {
    log(`ERROR: ${err && err.stack ? err.stack : err}`);
    dialog.showErrorBox(
      "Update check failed",
      String(err && err.message ? err.message : err)
    );
  });

  autoUpdater.checkForUpdatesAndNotify();
}

if (gotSingleInstanceLock) {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await startServer();
    } catch (err) {
      const detail =
        err && err.code === "EADDRINUSE"
          ? `Port ${PORT} is already in use.\n\nClose any running SyncDemo from Task Manager (or end the process using that port), then try again.\n\n${err.stack || err}`
          : String(err && err.stack ? err.stack : err);
      dialog.showErrorBox("Failed to start local server", detail);
      app.quit();
      return;
    }
    createWindow();
    setupAutoUpdates();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// ⭐ IMPROVED: Clean up server on quit
app.on("before-quit", async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    
    // Close all windows
    BrowserWindow.getAllWindows().forEach(window => window.destroy());
    
    // Stop the server
    await stopServer();
    
    // Now actually quit
    app.quit();
  }
});

// ⭐ ADDED: Handle the quit event from updater
app.on('quit', () => {
  console.log('App is quitting...');
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});