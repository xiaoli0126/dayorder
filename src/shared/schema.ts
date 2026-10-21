import { z } from 'zod'
import { DEFAULT_MODULES, DEFAULT_SETTINGS, MAX_ITEM_TEXT, MAX_ITEMS, MAX_NOTES, MAX_TITLE, SCHEMA_VERSION, APP_VERSION } from './constants'
import { clamp, DAY_MINUTES, MIN_DURATION } from './time'
import { newId } from './ids'
import type { Block, Doc, Item, Module, Settings, Template, TemplateBlock } from './types'

export class FutureVersionError extends Error {
  readonly code = 'future-version'
  constructor(version: number) {
    super(`数据文件版本 ${version} 高于当前应用支持的版本 ${SCHEMA_VERSION}`)
    this.name = 'FutureVersionError'
  }
}

// ---------- zod（保存前校验） ----------

const itemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(MAX_ITEM_TEXT),
  done: z.boolean()
})

const moduleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(12),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1),
  defaultDurationMin: z.number().int().min(MIN_DURATION).max(DAY_MINUTES),
  order: z.number().int().min(0),
  archived: z.boolean()
})

const blockBaseShape = {
  id: z.string().min(1),
  startMin: z.number().int().min(0).max(DAY_MINUTES - MIN_DURATION),
  durationMin: z.number().int().min(MIN_DURATION),
  moduleId: z.string().min(1),
  title: z.string().max(MAX_TITLE),
  items: z.array(itemSchema).max(MAX_ITEMS),
  notes: z.string().max(MAX_NOTES)
}

const blockSchema = z
  .object({
    ...blockBaseShape,
    status: z.enum(['planned', 'done', 'skipped']),
    sourceTemplateId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .refine((value) => value.startMin + value.durationMin <= DAY_MINUTES, {
    message: '时间块超出当天范围'
  })

const templateBlockSchema = z.object(blockBaseShape)

const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(30),
  description: z.string().max(200),
  isDefault: z.boolean(),
  useCount: z.number().int().min(0),
  lastUsedAt: z.string().nullable(),
  blocks: z.array(templateBlockSchema),
  createdAt: z.string(),
  updatedAt: z.string()
})

const settingsSchema = z.object({
  theme: z.enum(['paper', 'ink', 'system']),
  accent: z.enum(['teal', 'amber', 'violet', 'rose']),
  hourHeight: z.union([z.literal(48), z.literal(72), z.literal(96)]),
  snapMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  dayStartHour: z.number().int().min(0).max(23),
  dayEndHour: z.number().int().min(1).max(24),
  showNowLine: z.boolean(),
  autoBackup: z.boolean(),
  lastModuleId: z.string().min(1)
})

export const docSchema = z.object({
  schemaVersion: z.number().int(),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    appVersion: z.string()
  }),
  settings: settingsSchema,
  modules: z.array(moduleSchema).min(1),
  templates: z.array(templateSchema),
  days: z.record(z.string(), z.object({
    date: z.string(),
    blocks: z.array(blockSchema),
    note: z.string().max(MAX_NOTES)
  }))
})

export function assertValidDoc(doc: Doc): Doc {
  const parsed = docSchema.safeParse(doc)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new Error(`数据校验失败：${first?.path.join('.') ?? '未知字段'} ${first?.message ?? ''}`)
  }
  return doc
}

// ---------- 容错读取 ----------

type Raw = Record<string, unknown>

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const readString = (value: unknown, fallback = '', max = Number.MAX_SAFE_INTEGER): string =>
  typeof value === 'string' ? value.slice(0, max) : fallback

const readInt = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback

const readBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

function readItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isRecord)
    .map((item) => ({
      id: readString(item.id) || newId('i'),
      text: readString(item.text, '', MAX_ITEM_TEXT).trim(),
      done: readBool(item.done, false)
    }))
    .filter((item) => item.text.length > 0)
    .slice(0, MAX_ITEMS)
}

function readBlockBase(raw: Raw): Omit<Block, 'status' | 'createdAt' | 'updatedAt'> {
  const startMin = clamp(readInt(raw.startMin, 480), 0, DAY_MINUTES - MIN_DURATION)
  const durationMin = clamp(readInt(raw.durationMin, 60), MIN_DURATION, DAY_MINUTES - startMin)
  return {
    id: readString(raw.id) || newId('b'),
    startMin,
    durationMin,
    moduleId: readString(raw.moduleId),
    title: readString(raw.title, '', MAX_TITLE),
    items: readItems(raw.items),
    notes: readString(raw.notes, '', MAX_NOTES)
  }
}

function readModules(raw: unknown, warnings: string[]): Module[] {
  const seen = new Set<string>()
  const modules: Module[] = []
  if (Array.isArray(raw)) {
    raw.filter(isRecord).forEach((item) => {
      const id = readString(item.id) || newId('m')
      if (seen.has(id)) return
      seen.add(id)
      modules.push({
        id,
        name: readString(item.name, '未命名', 12) || '未命名',
        color: /^#[0-9a-fA-F]{6}$/.test(readString(item.color)) ? readString(item.color) : DEFAULT_MODULES[0].color,
        icon: readString(item.icon, 'ellipsis') || 'ellipsis',
        defaultDurationMin: clamp(readInt(item.defaultDurationMin, 60), MIN_DURATION, DAY_MINUTES),
        order: readInt(item.order, modules.length),
        archived: readBool(item.archived, false)
      })
    })
  }
  if (modules.length === 0) {
    warnings.push('模块表为空，已恢复默认模块')
    return DEFAULT_MODULES.map((module) => ({ ...module }))
  }
  return modules
}

function readSettings(raw: unknown, warnings: string[]): Settings {
  const source = isRecord(raw) ? raw : {}
  const settings: Settings = { ...DEFAULT_SETTINGS }
  const theme = readString(source.theme)
  if (theme === 'paper' || theme === 'ink' || theme === 'system') settings.theme = theme
  else if (theme) warnings.push(`未知主题 ${theme}，已回退到暖纸`)
  const accent = readString(source.accent)
  if (accent === 'teal' || accent === 'amber' || accent === 'violet' || accent === 'rose') settings.accent = accent
  const hourHeight = readInt(source.hourHeight, settings.hourHeight)
  if (hourHeight === 48 || hourHeight === 72 || hourHeight === 96) settings.hourHeight = hourHeight
  const snap = readInt(source.snapMinutes, settings.snapMinutes)
  if (snap === 5 || snap === 10 || snap === 15) settings.snapMinutes = snap
  settings.dayStartHour = clamp(readInt(source.dayStartHour, settings.dayStartHour), 0, 23)
  settings.dayEndHour = clamp(readInt(source.dayEndHour, settings.dayEndHour), settings.dayStartHour + 2, 24)
  settings.showNowLine = readBool(source.showNowLine, settings.showNowLine)
  settings.autoBackup = readBool(source.autoBackup, settings.autoBackup)
  settings.lastModuleId = readString(source.lastModuleId, settings.lastModuleId)
  return settings
}

function readTemplates(raw: unknown, moduleIds: Set<string>, fallbackModuleId: string, warnings: string[]): Template[] {
  if (!Array.isArray(raw)) return []
  let defaultSeen = false
  return raw.filter(isRecord).map((item) => {
    const now = new Date().toISOString()
    const blocks: TemplateBlock[] = Array.isArray(item.blocks)
      ? item.blocks.filter(isRecord).map((block) => {
          const base = readBlockBase(block)
          if (!moduleIds.has(base.moduleId)) {
            warnings.push(`模板块「${base.title || base.id}」的模块不存在，已改为默认模块`)
            base.moduleId = fallbackModuleId
          }
          return base
        })
      : []
    const isDefault = !defaultSeen && readBool(item.isDefault, false)
    if (isDefault) defaultSeen = true
    return {
      id: readString(item.id) || newId('t'),
      name: readString(item.name, '未命名模板', 30) || '未命名模板',
      description: readString(item.description, '', 200),
      isDefault,
      useCount: Math.max(0, readInt(item.useCount, 0)),
      lastUsedAt: typeof item.lastUsedAt === 'string' ? item.lastUsedAt : null,
      blocks,
      createdAt: readString(item.createdAt, now),
      updatedAt: readString(item.updatedAt, now)
    }
  })
}

function readDays(raw: unknown, moduleIds: Set<string>, fallbackModuleId: string, warnings: string[]): Doc['days'] {
  const days: Doc['days'] = {}
  if (!isRecord(raw)) return days
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isRecord(value)) {
      warnings.push(`忽略了非法的日期键 ${key}`)
      continue
    }
    const blocks: Block[] = Array.isArray(value.blocks)
      ? value.blocks.filter(isRecord).map((block) => {
          const base = readBlockBase(block)
          if (!moduleIds.has(base.moduleId)) {
            warnings.push(`块「${base.title || base.id}」的模块不存在，已改为默认模块`)
            base.moduleId = fallbackModuleId
          }
          const status = readString(block.status)
          return {
            ...base,
            status: status === 'done' || status === 'skipped' ? status : 'planned',
            sourceTemplateId: typeof block.sourceTemplateId === 'string' ? block.sourceTemplateId : undefined,
            createdAt: readString(block.createdAt, new Date().toISOString()),
            updatedAt: readString(block.updatedAt, new Date().toISOString())
          }
        })
      : []
    days[key] = {
      date: key,
      blocks,
      note: readString(value.note, '', MAX_NOTES)
    }
  }
  return days
}

export interface ReadResult {
  doc: Doc
  warnings: string[]
}

/**
 * 容错读取：任何字段缺失或类型不对都回退到默认值，并记录 warning；
 * 只有「完全不是对象」或「版本高于当前（且未允许）」才抛错。
 */
export function readDocument(raw: unknown, options: { allowFuture?: boolean } = {}): ReadResult {
  if (!isRecord(raw)) throw new Error('数据文件格式不正确（根节点不是对象）')
  const warnings: string[] = []
  const version = readInt(raw.schemaVersion, 0)
  if (version > SCHEMA_VERSION) {
    if (!options.allowFuture) throw new FutureVersionError(version)
    warnings.push(`数据来自更高版本（${version}），已进入只读模式`)
  }
  if (version !== SCHEMA_VERSION && version < SCHEMA_VERSION) {
    warnings.push(`数据版本 ${version} 已升级到 ${SCHEMA_VERSION}`)
  }

  const modules = readModules(raw.modules, warnings)
  const moduleIds = new Set(modules.map((module) => module.id))
  const settings = readSettings(raw.settings, warnings)
  const fallbackModuleId = moduleIds.has(settings.lastModuleId) ? settings.lastModuleId : modules[0].id
  settings.lastModuleId = fallbackModuleId

  const metaRaw = isRecord(raw.meta) ? raw.meta : {}
  const now = new Date().toISOString()

  return {
    doc: {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        createdAt: readString(metaRaw.createdAt, now),
        updatedAt: readString(metaRaw.updatedAt, now),
        appVersion: readString(metaRaw.appVersion, APP_VERSION)
      },
      settings,
      modules,
      templates: readTemplates(raw.templates, moduleIds, fallbackModuleId, warnings),
      days: readDays(raw.days, moduleIds, fallbackModuleId, warnings)
    },
    warnings
  }
}
