const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  onClearBay: (callback) => ipcRenderer.on('app:clear-bay', callback),
  onOpenPairing: (callback) => ipcRenderer.on('app:open-pairing', callback),
  onOpenAudit: (callback) => ipcRenderer.on('app:open-audit', callback),
});
