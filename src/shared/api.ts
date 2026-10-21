import type { AppInfo, BackupMeta, Doc, IpcResult, LoadResult } from './types'

export interface DayOrderApi {
  load(): Promise<IpcResult<LoadResult>>
  save(doc: Doc): Promise<IpcResult<{ savedAt: string; bytes: number }>>
  exportDoc(doc: Doc): Promise<IpcResult<string | null>>
  importDoc(): Promise<IpcResult<LoadResult | null>>
  listBackups(): Promise<IpcResult<BackupMeta[]>>
  restoreBackup(name: string): Promise<IpcResult<LoadResult>>
  appInfo(): Promise<IpcResult<AppInfo>>
  revealDataDir(): Promise<IpcResult<void>>
  setAppearance(payload: { color: string; symbolColor: string }): Promise<IpcResult<void>>
  onBeforeClose(callback: () => void): () => void
  closeReady(): void
}
