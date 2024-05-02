const { contextBridge, ipcRenderer } = require('electron')

const API = {
  onSendData: (callback) =>
    ipcRenderer.on('on-send-data', (event, data, listname) => {
      callback(data, listname)
    }),
  onSendLists: (callback) =>
    ipcRenderer.on('on-send-lists', (event, args) => {
      callback(args)
    }),
  onSendError: (callback) =>
    ipcRenderer.on('on-send-error', (event, args) => {
      callback(args)
    }),
  saveData: (data) => ipcRenderer.send('save-data', data),
  loadData: (date, list) => ipcRenderer.send('load-data', date, list),
  relaunch: () => ipcRenderer.send('relaunch'),
  showWindow: () => ipcRenderer.send('show-window'),
  showTime: (time) => ipcRenderer.send('show-time', time),
}

contextBridge.exposeInMainWorld('api', API)
