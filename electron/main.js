const { app, BrowserWindow, dialog, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const { execSync } = require("child_process");
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

// ⭐ KILL ALL CONNECTIONS IMMEDIATELY
function stopServer() {
  return new Promise((resolve) => {
    if (!serverInstance) {
      console.log("No server instance to stop");
      resolve();
      return;
    }
    
    console.log("Force stopping server...");
    const server = serverInstance;
    serverInstance = null;
    
    // Close all keep-alive connections
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
    
    // Force close after 1 second
    const forceTimeout = setTimeout(() => {
      console.log("Force closing server...");
      server.close(() => {
        console.log("Server force closed");
        resolve();
      });
    }, 1000);
    
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
  
  // ⭐ Disable keep-alive to prevent hanging connections
  expressApp.set('keepAliveTimeout', 1000);
  expressApp.set('headersTimeout', 2000);
  
  return new Promise((resolve, reject) => {
    serverInstance = expressApp.listen(PORT, () => {
      console.log(`Local server listening on http://localhost:${PORT}`);
      resolve(serverInstance);
    });
    serverInstance.on("error", reject);
    
    // ⭐ Don't keep connections alive too long
    serverInstance.keepAliveTimeout = 1000;
    serverInstance.headersTimeout = 2000;
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
  
  // ⭐ Don't keep the window reference if it's closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

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

// ⭐ KILL ALL NODE PROCESSES RELATED TO SYNC DEMO
function killRelatedProcesses() {
  try {
    // Kill SyncDemo.exe
    execSync('taskkill /F /IM "SyncDemo.exe" /T 2>nul', { 
      stdio: 'ignore',
      windowsHide: true 
    });
  } catch (e) {
    // Process might not exist, that's OK
  }
  
  try {
    // Kill node processes that are child processes
    execSync('wmic process where "commandline like \'%SyncDemo%\' and name=\'node.exe\'" delete 2>nul', { 
      stdio: 'ignore',
      windowsHide: true 
    });
  } catch (e) {
    // Ignore errors
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
  }

  autoUpdater.on("checking-for-update", () => log("Checking for update..."));
  
  autoUpdater.on("update-available", (info) => {
    log(`Update available: v${info.version}. Downloading...`);
    notify("Update found", `Version ${info.version} is downloading in the background.`);
  });

  autoUpdater.on("download-progress", (p) => {
    log(`Downloading update: ${Math.round(p.percent)}%`);
    if (mainWindow) mainWindow.setProgressBar(p.percent / 100);
  });

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
          log("User chose to restart. Cleaning up...");
          
          // ⭐ Step 1: Close browser window
          if (mainWindow) {
            mainWindow.destroy();
            mainWindow = null;
          }
          
          // ⭐ Step 2: Stop the server
          isQuitting = true;
          await stopServer();
          
          // ⭐ Step 3: Kill any remaining related processes
          killRelatedProcesses();
          
          // ⭐ Step 4: Wait for cleanup
          log("Cleanup complete. Installing update...");
          
          // ⭐ Step 5: Use setTimeout to ensure event loop is clear
          setTimeout(() => {
            // Force quit and install
            autoUpdater.quitAndInstall(true, true);
          }, 1000);
        }
      });
  });

  autoUpdater.on("error", (err) => {
    log(`ERROR: ${err && err.stack ? err.stack : err}`);
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
      dialog.showErrorBox("Failed to start local server", 
        err && err.code === "EADDRINUSE"
          ? `Port ${PORT} is already in use. Close SyncDemo from Task Manager and try again.`
          : String(err));
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

// ⭐ Handle cleanup on quit
app.on("before-quit", async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    
    // Destroy all windows
    BrowserWindow.getAllWindows().forEach(w => w.destroy());
    
    // Stop server
    await stopServer();
    
    // Actually quit
    app.quit();
  }
});

// ⭐ Log when app exits
app.on('will-quit', () => {
  console.log('App will quit, cleaning up...');
  killRelatedProcesses();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});