const { app, BrowserWindow, dialog, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const { exec } = require("child_process");
app.setName("SyncDemo");

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

// ⭐ FIXED: Don't nullify server before closing
function stopServer() {
  return new Promise((resolve) => {
    if (!serverInstance || !serverInstance.listening) {
      console.log("Server not running or already stopped");
      resolve();
      return;
    }
    
    console.log("Stopping server...");
    
    // Close all connections first
    serverInstance.closeAllConnections?.();
    
    // Set a timeout to force close
    const forceClose = setTimeout(() => {
      console.log("Force closing server...");
      serverInstance.closeAllConnections?.();
      resolve();
    }, 3000);
    
    // Try graceful shutdown
    serverInstance.close(() => {
      clearTimeout(forceClose);
      console.log("Server stopped gracefully");
      serverInstance = null;
      resolve();
    });
  });
}

async function startServer() {
  await initDb();
  const expressApp = createServer();
  
  // Disable keep-alive to prevent hanging connections
  expressApp.set('keepAliveTimeout', 1000);
  expressApp.set('headersTimeout', 2000);
  
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
    `App starting. Current version: ${app.getVersion()}. isPackaged: ${app.isPackaged}`
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
    log("WARNING: no embedded token found - update checks against the private repo will fail with 404.");
  }

  autoUpdater.on("checking-for-update", () => log("Checking for update..."));

  autoUpdater.on("update-available", (info) => {
    log(`Update available: v${info.version}. Downloading...`);
    notify("Update found", `Version ${info.version} is downloading in the background.`);
  });

  autoUpdater.on("update-not-available", (info) => {
    log(`No update available. Latest published version is v${info.version}, this is v${app.getVersion()}.`);
  });

  autoUpdater.on("download-progress", (p) => {
    log(`Downloading update: ${Math.round(p.percent)}%`);
    if (mainWindow) mainWindow.setProgressBar(p.percent / 100);
  });

  // ⭐ FIXED: Complete rewrite of update-downloaded handler
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
          log("User chose to restart. Starting update process...");
          isQuitting = true;
          
          // Step 1: Close main window
          if (mainWindow) {
            log("Closing main window...");
            mainWindow.close();
            mainWindow = null;
          }
          
          // Step 2: Stop server and wait
          log("Stopping server...");
          await stopServer();
          log("Server stopped.");
          
          // Step 3: Force kill the app process using a batch script
          // This is the most reliable way to ensure the process is gone
          const batchPath = path.join(app.getPath('temp'), 'sync-demo-update.bat');
          const installerPath = path.join(
            app.getPath('userData'),
            '..',
            'electron-sync-demo-updater',
            'pending',
            `SyncDemo-Setup-${info.version}.exe`
          );
          
          const batchContent = `@echo off
echo Waiting for SyncDemo to close...
timeout /t 3 /nobreak >nul
echo Running installer...
start /wait "" "${installerPath}" --updated --force-run
if %ERRORLEVEL% EQU 0 (
    echo Update installed successfully
) else (
    echo Installer exited with code %ERRORLEVEL%
    pause
)
del "%~f0"
`;
          
          fs.writeFileSync(batchPath, batchContent);
          log(`Batch script created at: ${batchPath}`);
          log(`Installer path: ${installerPath}`);
          
          // Step 4: Launch the batch script and immediately exit
          exec(`start "" cmd /c "${batchPath}"`, (error) => {
            if (error) {
              log(`Error launching batch: ${error}`);
            }
          });
          
          // Step 5: Force exit the app immediately
          log("Exiting app...");
          app.exit(0);
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

app.on("before-quit", async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    
    // Close all windows
    BrowserWindow.getAllWindows().forEach(w => w.close());
    
    // Stop server
    await stopServer();
    
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});