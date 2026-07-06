const { app, BrowserWindow, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
app.setName('SyncDemo');

// REMOTE_API_URL points at your "cloud" server. In this demo it's the
// remote-server folder running locally on port 4000. In real life this
// would be your deployed backend URL (e.g. your EC2 instance).
process.env.REMOTE_API_URL = process.env.REMOTE_API_URL || 'http://localhost:4000';

// IMPORTANT: local-server/dist ends up inside the read-only app.asar once packaged,
// so the sqlite file can't live next to it like it does in dev. Point it at
// Electron's userData folder (a real writable per-user directory) instead.
// This MUST be set before requiring local-server/dist/db, since it reads this
// env var at module load time.
process.env.LOCAL_DB_PATH = path.join(app.getPath('userData'), 'local.db');

const { initDb } = require('../local-server/dist/db');
const { createServer } = require('../local-server/dist/app');

const PORT = 3001;
let mainWindow;
let serverInstance;

async function startServer() {
  await initDb();
  const expressApp = createServer();
  return new Promise((resolve, reject) => {
    serverInstance = expressApp.listen(PORT, () => {
      console.log(`Local server listening on http://localhost:${PORT}`);
      resolve(serverInstance);
    });
    serverInstance.on('error', reject);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.on('closed', () => (mainWindow = null));

  // If the page fails to load for any reason, show it instead of a blank window
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    dialog.showErrorBox(
      'Failed to load app',
      `Could not load http://localhost:${PORT}\n\n${errorDescription} (${errorCode})`
    );
  });
}

function loadEmbeddedToken() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'embedded-token.json'), 'utf-8'));
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
  const logPath = path.join(app.getPath('userData'), 'update-log.txt');
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(line.trim());
    fs.appendFileSync(logPath, line);
  };

  log(`App starting. Current version: ${app.getVersion()}. isPackaged: ${app.isPackaged}`);

  if (!app.isPackaged) {
    log('Skipping update check - app is not packaged.');
    return;
  }

  const token = loadEmbeddedToken();
  if (token) {
    process.env.GH_TOKEN = token;
    log('Loaded embedded token for private-repo update checks.');
  } else {
    log('WARNING: no embedded token found - update checks against the private repo will fail with 404.');
  }

  autoUpdater.on('checking-for-update', () => {
    log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log(`Update available: v${info.version}. Downloading...`);
    notify('Update found', `Version ${info.version} is downloading in the background.`);
  });

  autoUpdater.on('update-not-available', (info) => {
    log(`No update available. Latest published version is v${info.version}, this is v${app.getVersion()}.`);
  });

  autoUpdater.on('download-progress', (p) => {
    log(`Downloading update: ${Math.round(p.percent)}%`);
    if (mainWindow) mainWindow.setProgressBar(p.percent / 100); // shows progress on the taskbar icon
  });

  autoUpdater.on('update-downloaded', (info) => {
    log(`Update v${info.version} downloaded. Prompting to restart.`);
    if (mainWindow) mainWindow.setProgressBar(-1); // clear taskbar progress bar
    notify('Update ready', `Version ${info.version} is ready to install.`);
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update ready',
        message: `Version ${info.version} has been downloaded. Restart now to install it?`,
        buttons: ['Restart now', 'Later'],
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on('error', (err) => {
    log(`ERROR: ${err && err.stack ? err.stack : err}`);
    dialog.showErrorBox('Update check failed', String(err && err.message ? err.message : err));
  });

  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    dialog.showErrorBox('Failed to start local server', String(err && err.stack ? err.stack : err));
    app.quit();
    return;
  }
  createWindow();
  setupAutoUpdates();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (serverInstance) serverInstance.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
