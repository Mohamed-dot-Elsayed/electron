const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getClientEnv: () => ipcRenderer.invoke('get-client-env'),
});
