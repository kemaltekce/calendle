const { contextBridge, ipcRenderer } = require('electron')

const API = {
  onSendData: (callback) =>
    ipcRenderer.on('on-send-data', (event, args) => {
      callback(args)
    }),
  onSendError: (callback) =>
    ipcRenderer.on('on-send-error', (event, args) => {
      callback(args)
    }),
  saveData: (data) => ipcRenderer.send('save-data', data),
  loadData: (date) => ipcRenderer.send('load-data', date),
  relaunch: () => ipcRenderer.send('relaunch'),
}

contextBridge.exposeInMainWorld('api', API)
