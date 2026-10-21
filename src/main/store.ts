import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { APP_VERSION } from '@shared/constants'
import { createInitialDoc } from '@shared/doc'
import { assertValidDoc, FutureVersionError, readDocument } from '@shared/schema'
import type { AppInfo, BackupMeta, Doc, LoadResult } from '@shared/types'

const DATA_FILE = 'planner.json'
const BACKUP_PREFIX = 'planner-'
/** 保留：最近 20 份 + 每天 1 份，上限 50 */
const KEEP_RECENT = 20
const MAX_BACKUPS = 50

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export class DocumentStore {
  private readonly portable: boolean
  private readonly dataDir: string
  private readonly filePath: string
  private readonly backupDir: string
  private writeQueue: Promise<unknown> = Promise.resolve()

  constructor() {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
    this.portable = Boolean(portableDir)
    const base = portableDir ? path.join(portableDir, 'data') : path.join(app.getPath('userData'), 'data')
    this.dataDir = base
    this.filePath = path.join(base, DATA_FILE)
    this.backupDir = path.join(base, 'backups')
    this.ensureDirs()
  }

  getDataDir(): string {
    return this.dataDir
  }

  info(): AppInfo {
    return { version: APP_VERSION, dataDir: this.dataDir, isPortable: this.portable }
  }

  load(): LoadResult {
    this.ensureDirs()

    if (!fs.existsSync(this.filePath)) {
      const doc = createInitialDoc()
      this.writeSync(doc)
      return {
        doc,
        savedAt: null,
        dataDir: this.dataDir,
        warnings: ['首次启动：已创建默认模块与示例模板']
      }
    }

    const savedAt = this.readMtime()
    let rawText: string
    try {
      rawText = fs.readFileSync(this.filePath, 'utf8')
    } catch (error) {
      return this.recoverCorrupt(error instanceof Error ? error : new Error(String(error)), savedAt)
    }

    try {
      const result = readDocument(JSON.parse(rawText))
      if (result.doc.settings.autoBackup) this.backupCurrentFile()
      return { doc: result.doc, savedAt, dataDir: this.dataDir, warnings: result.warnings }
    } catch (error) {
      if (error instanceof FutureVersionError) {
        try {
          const result = readDocument(JSON.parse(rawText), { allowFuture: true })
          return {
            doc: result.doc,
            savedAt,
            dataDir: this.dataDir,
            warnings: result.warnings,
            readOnly: true
          }
        } catch {
          // 落到损坏恢复流程
        }
      }
      return this.recoverCorrupt(error instanceof Error ? error : new Error(String(error)), savedAt)
    }
  }

  save(doc: Doc): Promise<{ savedAt: string; bytes: number }> {
    return this.enqueue(() => {
      assertValidDoc(doc)
      const next: Doc = {
        ...doc,
        meta: { ...doc.meta, updatedAt: new Date().toISOString(), appVersion: APP_VERSION }
      }
      const bytes = this.writeSync(next)
      return { savedAt: next.meta.updatedAt, bytes }
    })
  }

  exportDoc(doc: Doc, targetPath: string): void {
    assertValidDoc(doc)
    const json = JSON.stringify(doc, null, 2)
    fs.writeFileSync(targetPath, json, 'utf8')
  }

  importDoc(sourcePath: string): LoadResult {
    const parsed: unknown = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
    const result = readDocument(parsed, { allowFuture: true })
    this.backupCurrentFile()
    this.writeSync(result.doc)
    return {
      doc: result.doc,
      savedAt: this.readMtime(),
      dataDir: this.dataDir,
      warnings: [...result.warnings, `已从 ${path.basename(sourcePath)} 导入`],
      readOnly: result.doc.schemaVersion > 0 && result.warnings.some((w) => w.includes('只读'))
    }
  }

  listBackups(): BackupMeta[] {
    this.ensureDirs()
    let names: string[] = []
    try {
      names = fs.readdirSync(this.backupDir)
    } catch {
      return []
    }
    return names
      .filter((name) => name.startsWith(BACKUP_PREFIX) && name.endsWith('.json'))
      .map((name) => {
        const full = path.join(this.backupDir, name)
        const stat = fs.statSync(full)
        return { name, createdAt: stat.mtime.toISOString(), size: stat.size }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  restoreBackup(name: string): LoadResult {
    const safeName = path.basename(name)
    if (safeName !== name || !safeName.startsWith(BACKUP_PREFIX) || !safeName.endsWith('.json')) {
      throw new Error('备份文件名不合法')
    }
    const full = path.join(this.backupDir, safeName)
    if (!fs.existsSync(full)) throw new Error('备份不存在')
    const parsed: unknown = JSON.parse(fs.readFileSync(full, 'utf8'))
    const result = readDocument(parsed, { allowFuture: true })
    this.backupCurrentFile()
    this.writeSync(result.doc)
    return {
      doc: result.doc,
      savedAt: this.readMtime(),
      dataDir: this.dataDir,
      warnings: [`已恢复备份 ${safeName}`],
      recoveredFrom: safeName
    }
  }

  // ---------- 内部 ----------

  private ensureDirs(): void {
    fs.mkdirSync(this.dataDir, { recursive: true })
    fs.mkdirSync(this.backupDir, { recursive: true })
  }

  private readMtime(): string | null {
    try {
      return fs.statSync(this.filePath).mtime.toISOString()
    } catch {
      return null
    }
  }

  private enqueue<T>(task: () => T | Promise<T>): Promise<T> {
    const run = this.writeQueue.then(() => task())
    this.writeQueue = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  /** 原子写：tmp → fsync → 回读校验 → rename。 */
  private writeSync(doc: Doc): number {
    this.ensureDirs()
    const json = JSON.stringify(doc, null, 2)
    const tmp = `${this.filePath}.tmp`
    fs.writeFileSync(tmp, json, 'utf8')
    const handle = fs.openSync(tmp, 'r+')
    try {
      fs.fsyncSync(handle)
    } finally {
      fs.closeSync(handle)
    }
    JSON.parse(fs.readFileSync(tmp, 'utf8'))
    fs.renameSync(tmp, this.filePath)
    return Buffer.byteLength(json, 'utf8')
  }

  private backupCurrentFile(): string | null {
    if (!fs.existsSync(this.filePath)) return null
    try {
      const target = path.join(this.backupDir, `${BACKUP_PREFIX}${timestamp()}.json`)
      fs.copyFileSync(this.filePath, target)
      this.pruneBackups()
      return target
    } catch {
      return null
    }
  }

  private pruneBackups(): void {
    const files = fs
      .readdirSync(this.backupDir)
      .filter((name) => name.startsWith(BACKUP_PREFIX) && name.endsWith('.json'))
      .map((name) => {
        const full = path.join(this.backupDir, name)
        return { name, mtime: fs.statSync(full).mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)

    const keep = new Set(files.slice(0, KEEP_RECENT).map((file) => file.name))
    const days = new Set<string>()
    for (const file of files.slice(KEEP_RECENT)) {
      if (keep.size >= MAX_BACKUPS) break
      const day = file.name.slice(BACKUP_PREFIX.length, BACKUP_PREFIX.length + 8)
      if (days.has(day)) continue
      days.add(day)
      keep.add(file.name)
    }
    for (const file of files) {
      if (!keep.has(file.name)) {
        try {
          fs.rmSync(path.join(this.backupDir, file.name), { force: true })
        } catch {
          // 忽略清理失败
        }
      }
    }
  }

  private recoverCorrupt(error: Error, savedAt: string | null): LoadResult {
    const warnings = [`数据文件无法读取：${error.message}`]
    const quarantine = path.join(this.backupDir, `corrupt-${timestamp()}.json`)
    try {
      fs.renameSync(this.filePath, quarantine)
      warnings.push('已将损坏文件移动到 backups 目录留档')
    } catch {
      // 移动失败也继续尝试恢复
    }

    for (const backup of this.listBackups()) {
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(path.join(this.backupDir, backup.name), 'utf8'))
        const result = readDocument(parsed)
        this.writeSync(result.doc)
        warnings.push(`已自动从备份 ${backup.name} 恢复`)
        return {
          doc: result.doc,
          savedAt: backup.createdAt,
          dataDir: this.dataDir,
          warnings,
          recoveredFrom: backup.name
        }
      } catch {
        // 尝试下一份
      }
    }

    const doc = createInitialDoc()
    this.writeSync(doc)
    warnings.push('没有可用备份，已创建空白数据')
    return { doc, savedAt, dataDir: this.dataDir, warnings }
  }
}
