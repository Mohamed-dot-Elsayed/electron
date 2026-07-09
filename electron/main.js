console.log(">>> MAIN.JS LOADED - TOP OF FILE");
const { app, BrowserWindow, dialog, Notification, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { autoUpdater } = require("electron-updater");
const dotenv = require('dotenv');
app.setName("SyncDemo");

// ============================================
// SERVER ENV — must load BEFORE requiring local-server
// ============================================
const serverEnvPath = app.isPackaged
  ? path.join(process.resourcesPath, 'server.env')
  : path.join(__dirname, '../local-server/.env');

try {
  dotenv.config({ path: serverEnvPath });
  console.log('Loaded server env from', serverEnvPath);
} catch (err) {
  console.error('Failed to load server.env:', err.message);
}

// ============================================
// CLIENT ENV — parsed only, exposed via IPC
// ============================================
const clientEnvPath = app.isPackaged
  ? path.join(process.resourcesPath, 'client.env')
  : path.join(__dirname, '../client/.env');

let clientConfig = {};
try {
  clientConfig = dotenv.parse(fs.readFileSync(clientEnvPath));
} catch (err) {
  console.error('Failed to load client.env:', err.message);
}

ipcMain.handle('get-client-env', () => clientConfig);

// ============================================
// LOCAL DB PATH
// ============================================
process.env.LOCAL_DB_PATH = path.join(app.getPath("userData"), "local.db");

const { initDb } = require("../local-server/dist/src/db/db");
const { createServer } = require("../local-server/dist/src/server");

const PORT = 3001;
const VITE_PORT = 5173;
let mainWindow;
let serverInstance;
let viteProcess;
let isQuitting = false;
let actualVitePort = VITE_PORT;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverInstance || !serverInstance.listening) {
      console.log("Server not running or already stopped");
      resolve();
      return;
    }

    console.log("Stopping server...");
    serverInstance.closeAllConnections?.();

    const forceClose = setTimeout(() => {
      console.log("Force closing server...");
      serverInstance.closeAllConnections?.();
      resolve();
    }, 3000);

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
  const server = createServer(); // http.Server, already wired with express + socket.io

  return new Promise((resolve, reject) => {
    serverInstance = server.listen(PORT, () => {
      console.log(`Local server listening on http://localhost:${PORT}`);
      resolve(serverInstance);
    });
    serverInstance.on("error", reject);
  });
}

// ============================================
// VITE DEV SERVER — dev only, never in packaged builds
// ============================================
function startVite() {

   if (app.isPackaged) {
    console.log("Packaged app - skipping Vite dev server");
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log(">>> startVite() called");
    viteProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '../client'),
      shell: true,
    });

    let resolved = false;
    let buffer = '';

    const timeout = setTimeout(() => {
      if (!resolved) {
        console.log(">>> startVite() TIMEOUT - resolving with default port");
        resolved = true;
        resolve();
      }
    }, 15000); // give it more headroom

    viteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[vite] ${output}`);

      buffer += output;
      // strip ANSI codes before matching
      const clean = buffer.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
      const match = clean.match(/localhost:(\d+)\//);

      if (!resolved && match) {
        resolved = true;
        actualVitePort = parseInt(match[1], 10);
        console.log(">>> RESOLVED with port:", actualVitePort);
        clearTimeout(timeout);
        resolve();
      }
    });

    viteProcess.stderr.on('data', (data) => {
      console.error(`[vite err] ${data}`);
    });

    viteProcess.on('error', (err) => {
      console.log(">>> viteProcess error event:", err);
      reject(err);
    });

    viteProcess.on('exit', (code) => {
      console.log(">>> viteProcess exit event, code:", code);
      if (!resolved) reject(new Error(`Vite exited early with code ${code}`));
    });
  });
}

function stopVite() {
  if (viteProcess) {
    console.log("Stopping Vite dev server...");
    viteProcess.kill();
    viteProcess = null;
  }
}

function createWindow() {
  console.log(">>> createWindow() called");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  console.log(">>> BrowserWindow created, id:", mainWindow.id);

  let loadUrl;
  if (app.isPackaged) {
    // In packaged app, load from the built files
    loadUrl = `file://${path.join(__dirname, '../client/dist/index.html')}`;
  } else {
    // In development, use Vite dev server
    loadUrl = `http://localhost:${actualVitePort}`;
  }

  console.log(">>> Loading URL:", loadUrl);

  mainWindow.loadURL(loadUrl).catch(err => {
    console.log(">>> loadURL rejected:", err);
  });

  mainWindow.webContents.once('did-finish-load', () => {
    console.log(">>> did-finish-load fired");
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.log(">>> RENDERER CRASHED:", details);
  });

  mainWindow.on('unresponsive', () => {
    console.log(">>> Window became unresponsive");
  });

  mainWindow.on("closed", () => {
    console.log(">>> Window closed event fired");
    mainWindow = null;
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_e, errorCode, errorDescription) => {
      console.log(">>> did-fail-load:", errorCode, errorDescription);
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

          if (mainWindow) {
            log("Closing main window...");
            mainWindow.close();
            mainWindow = null;
          }

          log("Stopping server...");
          await stopServer();
          stopVite();
          log("Server stopped.");

          log("Calling quitAndInstall...");
          autoUpdater.quitAndInstall();
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
      await startVite();  
    } catch (err) {
      const detail =
        err && err.code === "EADDRINUSE"
          ? `Port ${PORT} is already in use.\n\nClose any running SyncDemo from Task Manager (or end the process using that port), then try again.\n\n${err.stack || err}`
          : String(err && err.stack ? err.stack : err);
      dialog.showErrorBox("Failed to start local server", detail);
      app.quit();
      return;
    }
    console.log(">>> About to call createWindow()");
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

    BrowserWindow.getAllWindows().forEach(w => w.close());
    await stopServer();
    stopVite();

    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});