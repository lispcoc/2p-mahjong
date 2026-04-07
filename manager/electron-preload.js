/**
 * Electron Preload Script
 * contextBridge を使って renderer に安全な API を公開する
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // コマンド
  start:    () => ipcRenderer.invoke('start'),
  stop:     () => ipcRenderer.invoke('stop'),
  restart:  () => ipcRenderer.invoke('restart'),
  setMode:  (mode) => ipcRenderer.invoke('set-mode', mode),
  getStatus: () => ipcRenderer.invoke('get-status'),
  openUrl:  (url) => ipcRenderer.invoke('open-url', url),
  forceQuit: () => ipcRenderer.invoke('force-quit'),

  // イベント受信
  onLog:    (cb) => ipcRenderer.on('log',    (_event, entry) => cb(entry)),
  onStatus: (cb) => ipcRenderer.on('status', (_event, s)     => cb(s)),
});
