import { contextBridge, ipcRenderer } from 'electron'

const API = {}

contextBridge.exposeInMainWorld('api', API)
