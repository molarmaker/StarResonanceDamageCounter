const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getDevices: () => ipcRenderer.invoke('get-devices'),
  setLogLevel: (level) => ipcRenderer.invoke('set-log-level', level),
  startCapture: (deviceIndex) => ipcRenderer.invoke('start-capture', deviceIndex),
  clearData: () => ipcRenderer.invoke('clear-data'),
  getData: () => ipcRenderer.invoke('get-data'),
  onDataUpdate: (callback) => {
    ipcRenderer.removeAllListeners('data-update');
    ipcRenderer.on('data-update', (event, data) => callback(data));
  },
});
