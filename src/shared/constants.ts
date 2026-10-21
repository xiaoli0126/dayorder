import type { AccentName, Module, Settings, ThemeName } from './types'

export const SCHEMA_VERSION = 1
export const APP_VERSION = '0.1.0'

export const MIN_DURATION = 15
export const MAX_TITLE = 60
export const MAX_NOTES = 2000
export const MAX_ITEM_TEXT = 80
export const MAX_ITEMS = 20

export const HOUR_HEIGHTS = [48, 72, 96] as const
export const SNAP_OPTIONS = [5, 10, 15] as const

export const ACCENTS: Array<{ id: AccentName; label: string; color: string }> = [
  { id: 'teal', label: '青', color: '#2F7D6E' },
  { id: 'amber', label: '赭', color: '#C77B36' },
  { id: 'violet', label: '紫', color: '#6B5BD2' },
  { id: 'rose', label: '绯', color: '#C2547E' }
]

export const THEMES: Array<{ id: ThemeName; label: string }> = [
  { id: 'paper', label: '暖纸' },
  { id: 'ink', label: '墨夜' },
  { id: 'system', label: '跟随系统' }
]

export const MODULE_COLORS = [
  '#2F7D6E',
  '#3B6FB6',
  '#C77B36',
  '#6B8F71',
  '#8A6BBE',
  '#7A8288',
  '#B4453A',
  '#4F8FA8',
  '#9A7B4F',
  '#5D7CA6'
]

/** 可供模块选择的图标名（渲染层有同名映射）。 */
export const MODULE_ICONS = [
  'book-open',
  'briefcase',
  'dumbbell',
  'coffee',
  'home',
  'ellipsis',
  'code',
  'music',
  'heart-pulse',
  'sparkles'
]

export const DEFAULT_MODULES: Module[] = [
  { id: 'm_study', name: '学习', color: '#2F7D6E', icon: 'book-open', defaultDurationMin: 120, order: 0, archived: false },
  { id: 'm_work', name: '工作', color: '#3B6FB6', icon: 'briefcase', defaultDurationMin: 90, order: 1, archived: false },
  { id: 'm_sport', name: '运动', color: '#C77B36', icon: 'dumbbell', defaultDurationMin: 60, order: 2, archived: false },
  { id: 'm_rest', name: '休息', color: '#6B8F71', icon: 'coffee', defaultDurationMin: 60, order: 3, archived: false },
  { id: 'm_life', name: '生活', color: '#8A6BBE', icon: 'home', defaultDurationMin: 60, order: 4, archived: false },
  { id: 'm_other', name: '其他', color: '#7A8288', icon: 'ellipsis', defaultDurationMin: 60, order: 5, archived: false }
]

export const DEFAULT_SETTINGS: Settings = {
  theme: 'paper',
  accent: 'teal',
  hourHeight: 72,
  snapMinutes: 5,
  dayStartHour: 6,
  dayEndHour: 24,
  showNowLine: true,
  autoBackup: true,
  lastModuleId: 'm_study'
}
