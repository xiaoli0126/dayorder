import { contextBridge, ipcRenderer } from 'electron'
import type { DayOrderApi } from '@shared/api'

const api: DayOrderApi = {
  load: () => ipcRenderer.invoke('doc:load'),
  save: (doc) => ipcRenderer.invoke('doc:save', doc),
  exportDoc: (doc) => ipcRenderer.invoke('doc:export', doc),
  importDoc: () => ipcRenderer.invoke('doc:import'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: (name) => ipcRenderer.invoke('backup:restore', name),
  appInfo: () => ipcRenderer.invoke('app:info'),
  revealDataDir: () => ipcRenderer.invoke('app:revealDataDir'),
  setAppearance: (payload) => ipcRenderer.invoke('window:appearance', payload),
  onBeforeClose: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('app:before-close', listener)
    return () => ipcRenderer.removeListener('app:before-close', listener)
  },
  closeReady: () => ipcRenderer.send('app:close-ready')
}

contextBridge.exposeInMainWorld('api', api)
