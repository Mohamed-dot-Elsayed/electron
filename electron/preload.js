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
  printHtml: (html, printerName) =>
    ipcRenderer.invoke("print-html", { html, printerName }),

  printReceiptImage: (html, printerName) =>
    ipcRenderer.invoke("print-html", { html, printerName }),

  // Receipt width (يستخدمه الفرونت في مسطرة الاختبار)
  getReceiptImageWidthPx: () => ipcRenderer.invoke("get-receipt-width-px"),
});
