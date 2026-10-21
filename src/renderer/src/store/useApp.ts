import { create } from 'zustand'
import { createEmptyBlock } from '@shared/doc'
import { newId } from '@shared/ids'
import { instantiateTemplate, dayToTemplate } from '@shared/template'
import { clamp, DAY_MINUTES, MIN_DURATION, todayKey } from '@shared/time'
import type {
  AppInfo,
  ApplyPolicy,
  BackupMeta,
  Block,
  Day,
  Doc,
  Item,
  LoadResult,
  Module,
  Settings,
  Template,
  TemplateBlock
} from '@shared/types'

export type View = 'day' | 'templates' | 'settings'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
export type DialogType = 'apply-template' | 'modules' | null

export interface Toast {
  id: string
  message: string
  actionLabel?: string
  action?: () => void
}

interface AppStore {
  doc: Doc | null
  readOnly: boolean
  dataDir: string
  startupWarnings: string[]
  appInfo: AppInfo | null
  backups: BackupMeta[]

  view: View
  dateKey: string
  selectedBlockId: string | null
  editingTemplateId: string | null

  past: Doc[]
  future: Doc[]

  saveState: SaveState
  lastSavedAt: string | null
  saveError: string | null

  dialog: DialogType
  applyTemplateId: string | null
  searchOpen: boolean
  toasts: Toast[]

  bootstrap: (result: LoadResult) => void
  replaceDoc: (result: LoadResult) => void
  setReadOnly: (value: boolean) => void
  setView: (view: View) => void
  setDate: (key: string) => void
  selectBlock: (id: string | null) => void
  setDialog: (dialog: DialogType) => void
  openApplyTemplate: (templateId: string | null) => void
  setEditingTemplate: (id: string | null) => void
  setSearchOpen: (open: boolean) => void
  setSaveState: (state: SaveState, savedAt?: string | null, error?: string | null) => void
  pushToast: (message: string, action?: { label: string; run: () => void }) => void
  dismissToast: (id: string) => void

  undo: () => void
  redo: () => void
  commit: (label: string, recipe: (draft: Doc) => void, opts?: { coalesce?: string }) => void

  createBlock: (input: { startMin: number; durationMin: number; moduleId?: string }) => string | null
  updateBlock: (
    id: string,
    patch: Partial<Pick<Block, 'startMin' | 'durationMin' | 'moduleId' | 'title' | 'notes' | 'status'>>,
    opts?: { coalesce?: string }
  ) => void
  moveBlock: (id: string, startMin: number) => void
  resizeBlock: (id: string, startMin: number, durationMin: number) => void
  deleteBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  toggleItem: (blockId: string, itemId: string) => void
  addItem: (blockId: string, text: string) => void
  removeItem: (blockId: string, itemId: string) => void
  setBlockItems: (blockId: string, items: Item[]) => void
  setTemplateItems: (templateId: string, blockId: string, items: Item[]) => void
  setBlockStatus: (id: string, status: Block['status']) => void
  setDayNote: (note: string) => void

  applyTemplate: (templateId: string, targetDate: string, policy: ApplyPolicy) => void
  saveDayAsTemplate: (name: string) => void
  createTemplate: (name?: string) => string | null
  updateTemplate: (id: string, patch: Partial<Pick<Template, 'name' | 'description'>>) => void
  duplicateTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
  setDefaultTemplate: (id: string) => void
  addTemplateBlock: (templateId: string, block: TemplateBlock) => void
  updateTemplateBlock: (
    templateId: string,
    blockId: string,
    patch: Partial<Pick<TemplateBlock, 'startMin' | 'durationMin' | 'moduleId' | 'title' | 'notes'>>,
    opts?: { coalesce?: string }
  ) => void
  removeTemplateBlock: (templateId: string, blockId: string) => void

  addModule: (name: string) => void
  updateModule: (id: string, patch: Partial<Pick<Module, 'name' | 'color' | 'icon'>>) => void
  deleteModule: (id: string, reassignTo: string) => void
  updateSettings: (patch: Partial<Settings>) => void

  refreshBackups: () => Promise<void>
}

let lastCoalesce: { key: string; at: number } | null = null
const toastTimers = new Map<string, number>()

function ensureDay(doc: Doc, key: string): Day {
  if (!doc.days[key]) {
    doc.days[key] = { date: key, blocks: [], note: '' }
  }
  return doc.days[key]
}

function findBlock(doc: Doc, dateKey: string, id: string): Block | undefined {
  return doc.days[dateKey]?.blocks.find((block) => block.id === id)
}

function sortBlocks(day: Day): void {
  day.blocks.sort((a, b) => a.startMin - b.startMin || a.id.localeCompare(b.id))
}

function clampToDay(startMin: number, durationMin: number): { startMin: number; durationMin: number } {
  const duration = Math.max(MIN_DURATION, Math.round(durationMin))
  const start = clamp(Math.round(startMin), 0, DAY_MINUTES - MIN_DURATION)
  return { startMin: start, durationMin: Math.min(duration, DAY_MINUTES - start) }
}

export const useApp = create<AppStore>()((set, get) => {
  const commit: AppStore['commit'] = (label, recipe, opts) => {
    const state = get()
    if (!state.doc || state.readOnly) return
    const next = structuredClone(state.doc)
    recipe(next)
    next.meta.updatedAt = new Date().toISOString()

    const now = Date.now()
    const coalesced = Boolean(
      opts?.coalesce && lastCoalesce && lastCoalesce.key === opts.coalesce && now - lastCoalesce.at < 800
    )

    if (coalesced) {
      set({ doc: next, saveState: 'idle', saveError: null })
    } else {
      set({
        doc: next,
        past: [...state.past, state.doc].slice(-50),
        future: [],
        saveState: 'idle',
        saveError: null
      })
    }
    lastCoalesce = opts?.coalesce ? { key: opts.coalesce, at: now } : null
    void label
  }

  return {
    doc: null,
    readOnly: false,
    dataDir: '',
    startupWarnings: [],
    appInfo: null,
    backups: [],

    view: 'day',
    dateKey: todayKey(),
    selectedBlockId: null,
    editingTemplateId: null,

    past: [],
    future: [],

    saveState: 'idle',
    lastSavedAt: null,
    saveError: null,

    dialog: null,
    applyTemplateId: null,
    searchOpen: false,
    toasts: [],

    bootstrap: (result) => {
      set({
        doc: result.doc,
        readOnly: Boolean(result.readOnly),
        dataDir: result.dataDir,
        startupWarnings: result.warnings,
        lastSavedAt: result.savedAt,
        saveState: result.savedAt ? 'saved' : 'idle',
        dateKey: todayKey(),
        past: [],
        future: [],
        editingTemplateId: result.doc.templates[0]?.id ?? null
      })
    },

    replaceDoc: (result) => {
      set({
        doc: result.doc,
        readOnly: Boolean(result.readOnly),
        startupWarnings: result.warnings,
        past: [],
        future: [],
        selectedBlockId: null,
        editingTemplateId: result.doc.templates[0]?.id ?? null
      })
    },

    setReadOnly: (value) => set({ readOnly: value }),
    setView: (view) => set({ view }),
    setDate: (key) => {
      if (key === get().dateKey) return
      set({ dateKey: key, selectedBlockId: null })
    },
    selectBlock: (id) => set({ selectedBlockId: id }),
    setDialog: (dialog) => set({ dialog }),
    openApplyTemplate: (templateId) => {
      const doc = get().doc
      set({
        dialog: 'apply-template',
        applyTemplateId: templateId ?? doc?.templates[0]?.id ?? null
      })
    },
    setEditingTemplate: (id) => set({ editingTemplateId: id }),
    setSearchOpen: (open) => set({ searchOpen: open }),

    setSaveState: (state, savedAt, error) =>
      set({
        saveState: state,
        lastSavedAt: savedAt ?? get().lastSavedAt,
        saveError: error ?? null
      }),

    pushToast: (message, action) => {
      const id = newId('toast')
      set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, actionLabel: action?.label, action: action?.run }] }))
      const timer = window.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
        toastTimers.delete(id)
      }, 5200)
      toastTimers.set(id, timer)
    },

    dismissToast: (id) => {
      const timer = toastTimers.get(id)
      if (timer) window.clearTimeout(timer)
      toastTimers.delete(id)
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    },

    undo: () => {
      const { past, doc, future, readOnly } = get()
      if (!doc || readOnly || past.length === 0) return
      const previous = past[past.length - 1]
      lastCoalesce = null
      set({
        doc: previous,
        past: past.slice(0, -1),
        future: [doc, ...future].slice(0, 50),
        selectedBlockId: null,
        saveState: 'idle'
      })
    },

    redo: () => {
      const { future, doc, past, readOnly } = get()
      if (!doc || readOnly || future.length === 0) return
      const next = future[0]
      lastCoalesce = null
      set({
        doc: next,
        future: future.slice(1),
        past: [...past, doc].slice(-50),
        selectedBlockId: null,
        saveState: 'idle'
      })
    },

    commit,

    createBlock: (input) => {
      const state = get()
      if (!state.doc || state.readOnly) return null
      const moduleId = input.moduleId ?? state.doc.settings.lastModuleId ?? state.doc.modules[0]?.id
      if (!moduleId) return null
      const block = createEmptyBlock(moduleId, input.startMin, input.durationMin)
      const { startMin, durationMin } = clampToDay(block.startMin, block.durationMin)
      block.startMin = startMin
      block.durationMin = durationMin
      commit('create-block', (draft) => {
        const day = ensureDay(draft, state.dateKey)
        day.blocks.push(block)
        sortBlocks(day)
        draft.settings.lastModuleId = moduleId
      })
      set({ selectedBlockId: block.id })
      return block.id
    },

    updateBlock: (id, patch, opts) => {
      const { dateKey } = get()
      commit(
        'update-block',
        (draft) => {
          const block = findBlock(draft, dateKey, id)
          if (!block) return
          Object.assign(block, patch)
          if (typeof patch.startMin === 'number' || typeof patch.durationMin === 'number') {
            const clamped = clampToDay(block.startMin, block.durationMin)
            block.startMin = clamped.startMin
            block.durationMin = clamped.durationMin
          }
          block.updatedAt = new Date().toISOString()
          const day = draft.days[dateKey]
          if (day) sortBlocks(day)
        },
        opts
      )
    },

    moveBlock: (id, startMin) => {
      const block = findBlock(get().doc ?? ({} as Doc), get().dateKey, id)
      if (!block) return
      get().updateBlock(id, { startMin })
    },

    resizeBlock: (id, startMin, durationMin) => {
      get().updateBlock(id, { startMin, durationMin })
    },

    deleteBlock: (id) => {
      const state = get()
      const block = state.doc ? findBlock(state.doc, state.dateKey, id) : undefined
      if (!block) return
      commit('delete-block', (draft) => {
        const day = draft.days[state.dateKey]
        if (!day) return
        day.blocks = day.blocks.filter((item) => item.id !== id)
      })
      set({ selectedBlockId: null })
      get().pushToast('已删除时间块', { label: '撤销', run: () => get().undo() })
    },

    duplicateBlock: (id) => {
      const state = get()
      if (!state.doc) return
      const block = findBlock(state.doc, state.dateKey, id)
      if (!block) return
      const copy: Block = {
        ...structuredClone(block),
        id: newId('b'),
        items: block.items.map((item) => ({ ...item, id: newId('i') })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      copy.startMin = clamp(block.startMin + block.durationMin, 0, DAY_MINUTES - MIN_DURATION)
      copy.durationMin = Math.min(block.durationMin, DAY_MINUTES - copy.startMin)
      commit('duplicate-block', (draft) => {
        const day = ensureDay(draft, state.dateKey)
        day.blocks.push(copy)
        sortBlocks(day)
      })
      set({ selectedBlockId: copy.id })
    },

    toggleItem: (blockId, itemId) => {
      const { dateKey } = get()
      commit('toggle-item', (draft) => {
        const block = findBlock(draft, dateKey, blockId)
        const item = block?.items.find((entry) => entry.id === itemId)
        if (!block || !item) return
        item.done = !item.done
        block.updatedAt = new Date().toISOString()
      })
    },

    addItem: (blockId, text) => {
      const value = text.trim()
      if (!value) return
      const { dateKey } = get()
      commit('add-item', (draft) => {
        const block = findBlock(draft, dateKey, blockId)
        if (!block || block.items.length >= 20) return
        block.items.push({ id: newId('i'), text: value.slice(0, 80), done: false })
        block.updatedAt = new Date().toISOString()
      })
    },

    removeItem: (blockId, itemId) => {
      const { dateKey } = get()
      commit('remove-item', (draft) => {
        const block = findBlock(draft, dateKey, blockId)
        if (!block) return
        block.items = block.items.filter((item) => item.id !== itemId)
        block.updatedAt = new Date().toISOString()
      })
    },

    setBlockItems: (blockId, items) => {
      const { dateKey } = get()
      commit(
        'set-block-items',
        (draft) => {
          const block = findBlock(draft, dateKey, blockId)
          if (!block) return
          block.items = items.slice(0, 20)
          block.updatedAt = new Date().toISOString()
        },
        { coalesce: `items:${blockId}` }
      )
    },

    setTemplateItems: (templateId, blockId, items) => {
      commit(
        'set-template-items',
        (draft) => {
          const template = draft.templates.find((item) => item.id === templateId)
          const block = template?.blocks.find((item) => item.id === blockId)
          if (!block) return
          block.items = items.slice(0, 20)
        },
        { coalesce: `template-items:${blockId}` }
      )
    },

    setBlockStatus: (id, status) => {
      get().updateBlock(id, { status })
    },

    setDayNote: (note) => {
      const { dateKey } = get()
      commit(
        'day-note',
        (draft) => {
          const day = ensureDay(draft, dateKey)
          day.note = note.slice(0, 2000)
        },
        { coalesce: `day-note:${dateKey}` }
      )
    },

    applyTemplate: (templateId, targetDate, policy) => {
      const state = get()
      if (!state.doc) return
      const template = state.doc.templates.find((item) => item.id === templateId)
      if (!template) return
      const day = state.doc.days[targetDate]
      const result = instantiateTemplate(template, policy, day?.blocks ?? [])
      commit('apply-template', (draft) => {
        const target = ensureDay(draft, targetDate)
        target.blocks = result.blocks
        sortBlocks(target)
        const source = draft.templates.find((item) => item.id === templateId)
        if (source) {
          source.useCount += 1
          source.lastUsedAt = new Date().toISOString()
        }
      })
      set({ dateKey: targetDate, view: 'day', dialog: null, selectedBlockId: null })
      const summary =
        policy === 'replace'
          ? `已应用「${template.name}」：${result.added} 个时间块（覆盖原有 ${result.replaced} 个）`
          : `已应用「${template.name}」：新增 ${result.added} 个${result.skipped ? `，跳过 ${result.skipped} 个重叠` : ''}`
      get().pushToast(summary, { label: '撤销', run: () => get().undo() })
    },

    saveDayAsTemplate: (name) => {
      const state = get()
      if (!state.doc) return
      const day = state.doc.days[state.dateKey]
      if (!day || day.blocks.length === 0) {
        get().pushToast('这一天还没有时间块')
        return
      }
      const template = dayToTemplate(day, name.trim() || '未命名模板')
      commit('save-day-template', (draft) => {
        draft.templates.push(template)
      })
      get().pushToast(`已保存为模板「${template.name}」`)
    },

    createTemplate: (name) => {
      const state = get()
      if (!state.doc) return null
      const now = new Date().toISOString()
      const template: Template = {
        id: newId('t'),
        name: name?.trim() || '新模板',
        description: '',
        isDefault: state.doc.templates.length === 0,
        useCount: 0,
        lastUsedAt: null,
        blocks: [],
        createdAt: now,
        updatedAt: now
      }
      commit('create-template', (draft) => {
        draft.templates.push(template)
      })
      set({ editingTemplateId: template.id, view: 'templates' })
      return template.id
    },

    updateTemplate: (id, patch) => {
      commit(
        'update-template',
        (draft) => {
          const template = draft.templates.find((item) => item.id === id)
          if (!template) return
          Object.assign(template, patch)
          template.updatedAt = new Date().toISOString()
        },
        { coalesce: `template:${id}` }
      )
    },

    duplicateTemplate: (id) => {
      const state = get()
      const source = state.doc?.templates.find((item) => item.id === id)
      if (!source) return
      const now = new Date().toISOString()
      const copy: Template = {
        ...structuredClone(source),
        id: newId('t'),
        name: `${source.name} 副本`,
        isDefault: false,
        useCount: 0,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
        blocks: source.blocks.map((block) => ({
          ...block,
          id: newId('tb'),
          items: block.items.map((item) => ({ ...item, id: newId('i') }))
        }))
      }
      commit('duplicate-template', (draft) => {
        draft.templates.push(copy)
      })
      set({ editingTemplateId: copy.id })
    },

    deleteTemplate: (id) => {
      const state = get()
      const template = state.doc?.templates.find((item) => item.id === id)
      if (!template) return
      commit('delete-template', (draft) => {
        draft.templates = draft.templates.filter((item) => item.id !== id)
        if (draft.templates.length > 0 && !draft.templates.some((item) => item.isDefault)) {
          draft.templates[0].isDefault = true
        }
      })
      const remaining = get().doc?.templates[0]?.id ?? null
      set({ editingTemplateId: remaining })
      get().pushToast(`已删除模板「${template.name}」`, { label: '撤销', run: () => get().undo() })
    },

    setDefaultTemplate: (id) => {
      commit('default-template', (draft) => {
        draft.templates.forEach((template) => {
          template.isDefault = template.id === id
        })
      })
    },

    addTemplateBlock: (templateId, block) => {
      commit('add-template-block', (draft) => {
        const template = draft.templates.find((item) => item.id === templateId)
        if (!template) return
        template.blocks.push(block)
        template.blocks.sort((a, b) => a.startMin - b.startMin)
        template.updatedAt = new Date().toISOString()
      })
    },

    updateTemplateBlock: (templateId, blockId, patch, opts) => {
      commit(
        'update-template-block',
        (draft) => {
          const template = draft.templates.find((item) => item.id === templateId)
          const block = template?.blocks.find((item) => item.id === blockId)
          if (!template || !block) return
          Object.assign(block, patch)
          if (typeof patch.startMin === 'number' || typeof patch.durationMin === 'number') {
            const clamped = clampToDay(block.startMin, block.durationMin)
            block.startMin = clamped.startMin
            block.durationMin = clamped.durationMin
          }
          template.blocks.sort((a, b) => a.startMin - b.startMin)
          template.updatedAt = new Date().toISOString()
        },
        opts
      )
    },

    removeTemplateBlock: (templateId, blockId) => {
      commit('remove-template-block', (draft) => {
        const template = draft.templates.find((item) => item.id === templateId)
        if (!template) return
        template.blocks = template.blocks.filter((block) => block.id !== blockId)
        template.updatedAt = new Date().toISOString()
      })
    },

    addModule: (name) => {
      const state = get()
      if (!state.doc) return
      const module: Module = {
        id: newId('m'),
        name: name.trim().slice(0, 12) || '新模块',
        color: '#7A8288',
        icon: 'ellipsis',
        defaultDurationMin: 60,
        order: state.doc.modules.length,
        archived: false
      }
      commit('add-module', (draft) => {
        draft.modules.push(module)
      })
    },

    updateModule: (id, patch) => {
      commit(
        'update-module',
        (draft) => {
          const module = draft.modules.find((item) => item.id === id)
          if (module) Object.assign(module, patch)
        },
        { coalesce: `module:${id}` }
      )
    },

    deleteModule: (id, reassignTo) => {
      const state = get()
      if (!state.doc) return
      if (state.doc.modules.length <= 1) {
        get().pushToast('至少保留一个模块')
        return
      }
      if (id === reassignTo) return
      const target = reassignTo || state.doc.modules.find((module) => module.id !== id)?.id
      if (!target) return
      commit('delete-module', (draft) => {
        draft.modules = draft.modules.filter((module) => module.id !== id)
        for (const day of Object.values(draft.days)) {
          for (const block of day.blocks) {
            if (block.moduleId === id) block.moduleId = target
          }
        }
        for (const template of draft.templates) {
          for (const block of template.blocks) {
            if (block.moduleId === id) block.moduleId = target
          }
        }
        if (draft.settings.lastModuleId === id) draft.settings.lastModuleId = target
      })
      get().pushToast('已删除模块，相关时间块已迁移')
    },

    updateSettings: (patch) => {
      commit(
        'update-settings',
        (draft) => {
          Object.assign(draft.settings, patch)
        },
        { coalesce: 'settings' }
      )
    },

    refreshBackups: async () => {
      const api = window.api
      if (!api) return
      const result = await api.listBackups()
      if (result.ok) set({ backups: result.data })
    }
  }
})

export function dayHasBlocks(doc: Doc | null, dateKey: string): boolean {
  return Boolean(doc?.days[dateKey]?.blocks.length)
}
