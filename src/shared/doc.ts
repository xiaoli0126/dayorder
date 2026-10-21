import { DEFAULT_MODULES, DEFAULT_SETTINGS, SCHEMA_VERSION, APP_VERSION } from './constants'
import { newId } from './ids'
import type { Block, Doc, Item, Template, TemplateBlock } from './types'

function item(text: string): Item {
  return { id: newId('i'), text, done: false }
}

function tblock(
  startMin: number,
  durationMin: number,
  moduleId: string,
  title: string,
  items: string[] = [],
  notes = ''
): TemplateBlock {
  return {
    id: newId('tb'),
    startMin,
    durationMin,
    moduleId,
    title,
    items: items.map(item),
    notes
  }
}

/** 内置「上课日」：9 块 / 12.5 小时。 */
export function createClassTemplate(): Template {
  const now = new Date().toISOString()
  return {
    id: newId('t'),
    name: '上课日',
    description: '有课的平日：上午学习、下午课程、晚上复习',
    isDefault: true,
    useCount: 0,
    lastUsedAt: null,
    blocks: [
      tblock(420, 60, 'm_life', '起床', ['洗漱', '早餐']),
      tblock(480, 120, 'm_study', '上午学习', ['听讲座', '上课']),
      tblock(610, 120, 'm_study', '自习', ['整理笔记', '课后习题']),
      tblock(730, 90, 'm_rest', '午休', ['午餐', '午睡 20 分钟']),
      tblock(840, 150, 'm_study', '下午课程', ['实验', '小组讨论']),
      tblock(1020, 60, 'm_sport', '锻炼', ['慢跑 30 分钟', '拉伸']),
      tblock(1140, 90, 'm_study', '晚间学习', ['复习', '错题复盘']),
      tblock(1260, 30, 'm_life', '收尾', ['洗漱', '明日计划']),
      tblock(1350, 30, 'm_rest', '睡前', ['阅读', '放下手机'])
    ],
    createdAt: now,
    updatedAt: now
  }
}

/** 内置「周末」：6 块 / 9 小时。 */
export function createWeekendTemplate(): Template {
  const now = new Date().toISOString()
  return {
    id: newId('t'),
    name: '周末',
    description: '不赶时间的慢节奏',
    isDefault: false,
    useCount: 0,
    lastUsedAt: null,
    blocks: [
      tblock(540, 60, 'm_life', '起床早餐', ['洗漱', '早餐']),
      tblock(600, 120, 'm_study', '学习', ['阅读', '作业']),
      tblock(750, 90, 'm_rest', '午餐午休', ['午餐', '午睡']),
      tblock(900, 120, 'm_sport', '运动', ['羽毛球']),
      tblock(1140, 120, 'm_life', '生活', ['整理房间', '看电影']),
      tblock(1350, 30, 'm_rest', '睡前', ['阅读'])
    ],
    createdAt: now,
    updatedAt: now
  }
}

export function createEmptyBlock(moduleId: string, startMin: number, durationMin: number): Block {
  const now = new Date().toISOString()
  return {
    id: newId('b'),
    startMin,
    durationMin,
    moduleId,
    title: '',
    items: [],
    notes: '',
    status: 'planned',
    createdAt: now,
    updatedAt: now
  }
}

export function createInitialDoc(): Doc {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { createdAt: now, updatedAt: now, appVersion: APP_VERSION },
    settings: { ...DEFAULT_SETTINGS },
    modules: DEFAULT_MODULES.map((m) => ({ ...m })),
    templates: [createClassTemplate(), createWeekendTemplate()],
    days: {}
  }
}
