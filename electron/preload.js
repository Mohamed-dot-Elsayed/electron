const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,

  // Env
  getClientEnv: () => ipcRenderer.invoke("get-client-env"),

  // Window controls
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),

  // Printers
  getPrinters: () => ipcRenderer.invoke("get-printers"),

  // Printing
  printHtml: (html, printerName, options = {}) =>
    ipcRenderer.invoke("print-html", { html, printerName, ...options }),

  printReceiptImage: (html, printerName) =>
    ipcRenderer.invoke("print-html", { html, printerName }),

  // Receipt width
  getReceiptImageWidthPx: () => ipcRenderer.invoke("get-receipt-width-px"),
});
