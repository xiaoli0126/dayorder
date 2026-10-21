/** 领域类型：模块 / 时间块 / 事项 / 模板 / 一天 / 文档。 */

export type BlockStatus = 'planned' | 'done' | 'skipped'
export type ThemeName = 'paper' | 'ink' | 'system'
export type AccentName = 'teal' | 'amber' | 'violet' | 'rose'
export type HourHeight = 48 | 72 | 96
export type SnapMinutes = 5 | 10 | 15

export interface Item {
  id: string
  text: string
  done: boolean
}

export interface Module {
  id: string
  name: string
  color: string
  icon: string
  defaultDurationMin: number
  order: number
  archived: boolean
}

/** 模板块与日期块共享的字段。 */
export interface BlockBase {
  id: string
  /** 当天第几分钟，0–1439 */
  startMin: number
  /** 分钟数，>= 15 */
  durationMin: number
  moduleId: string
  /** 可以为空，空时展示模块名 */
  title: string
  items: Item[]
  notes: string
}

export type TemplateBlock = BlockBase

export interface Block extends BlockBase {
  status: BlockStatus
  sourceTemplateId?: string
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  description: string
  isDefault: boolean
  useCount: number
  lastUsedAt: string | null
  blocks: TemplateBlock[]
  createdAt: string
  updatedAt: string
}

export interface Day {
  date: string
  blocks: Block[]
  note: string
}

export interface Settings {
  theme: ThemeName
  accent: AccentName
  hourHeight: HourHeight
  snapMinutes: SnapMinutes
  dayStartHour: number
  dayEndHour: number
  showNowLine: boolean
  autoBackup: boolean
  lastModuleId: string
}

export interface DocMeta {
  createdAt: string
  updatedAt: string
  appVersion: string
}

export interface Doc {
  schemaVersion: number
  meta: DocMeta
  settings: Settings
  modules: Module[]
  templates: Template[]
  days: Record<string, Day>
}

export interface BackupMeta {
  name: string
  createdAt: string
  size: number
}

export interface LoadResult {
  doc: Doc
  savedAt: string | null
  dataDir: string
  warnings: string[]
  recoveredFrom?: string
  readOnly?: boolean
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

export interface AppInfo {
  version: string
  dataDir: string
  isPortable: boolean
}

export type ApplyPolicy = 'merge' | 'replace'

export interface ApplyTemplateResult {
  blocks: Block[]
  added: number
  skipped: number
  replaced: number
}

export interface TemplatePreview {
  blockCount: number
  totalMinutes: number
  moduleIds: string[]
}
