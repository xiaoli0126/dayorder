import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { format } from 'date-fns'
import type { Doc, IpcResult } from '@shared/types'
import type { DocumentStore } from './store'

async function run<T>(task: () => T | Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await task() }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const code = typeof (err as NodeJS.ErrnoException).code === 'string' ? (err as NodeJS.ErrnoException).code : 'error'
    return { ok: false, code: code as string, message: err.message }
  }
}

function ownerOf(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpc(store: DocumentStore): void {
  ipcMain.handle('doc:load', () => run(() => store.load()))

  ipcMain.handle('doc:save', (_event, doc: Doc) => run(() => store.save(doc)))

  ipcMain.handle('doc:export', (event, doc: Doc) =>
    run(async () => {
      const owner = ownerOf(event)
      const options: Electron.SaveDialogOptions = {
        title: '导出数据',
        defaultPath: `日序-${format(new Date(), 'yyyyMMdd')}.json`,
        filters: [{ name: 'JSON 数据', extensions: ['json'] }]
      }
      const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) return null
      store.exportDoc(doc, result.filePath)
      return result.filePath
    })
  )

  ipcMain.handle('doc:import', (event) =>
    run(async () => {
      const owner = ownerOf(event)
      const options: Electron.OpenDialogOptions = {
        title: '导入数据',
        properties: ['openFile'],
        filters: [{ name: 'JSON 数据', extensions: ['json'] }]
      }
      const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
      if (result.canceled || result.filePaths.length === 0) return null
      return store.importDoc(result.filePaths[0])
    })
  )

  ipcMain.handle('backup:list', () => run(() => store.listBackups()))

  ipcMain.handle('backup:restore', (_event, name: string) => run(() => store.restoreBackup(name)))

  ipcMain.handle('app:info', () => run(() => store.info()))

  ipcMain.handle('app:revealDataDir', () =>
    run(async () => {
      await shell.openPath(store.getDataDir())
    })
  )

  ipcMain.handle('window:appearance', (event, payload: { color: string; symbolColor: string }) =>
    run(() => {
      const owner = ownerOf(event)
      if (owner && process.platform === 'win32') {
        owner.setTitleBarOverlay({ color: payload.color, symbolColor: payload.symbolColor })
      }
    })
  )
}
