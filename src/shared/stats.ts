import type { Day, Module } from './types'

export interface DaySummary {
  plannedMin: number
  doneMin: number
  totalItems: number
  doneItems: number
  blockCount: number
  /** 0–1 */
  completion: number
}

export function summarizeDay(day: Day | undefined): DaySummary {
  if (!day) {
    return { plannedMin: 0, doneMin: 0, totalItems: 0, doneItems: 0, blockCount: 0, completion: 0 }
  }

  let plannedMin = 0
  let doneMin = 0
  let totalItems = 0
  let doneItems = 0

  for (const block of day.blocks) {
    if (block.status === 'skipped') continue
    plannedMin += block.durationMin
    if (block.status === 'done') doneMin += block.durationMin
    totalItems += block.items.length
    doneItems += block.items.filter((item) => item.done).length
  }

  const completion = totalItems > 0 ? doneItems / totalItems : plannedMin > 0 ? doneMin / plannedMin : 0

  return {
    plannedMin,
    doneMin,
    totalItems,
    doneItems,
    blockCount: day.blocks.length,
    completion: Math.max(0, Math.min(1, completion))
  }
}

export interface ModuleTotal {
  moduleId: string
  minutes: number
  color: string
  name: string
}

export function moduleTotals(day: Day | undefined, modules: Module[]): ModuleTotal[] {
  const map = new Map<string, number>()
  if (day) {
    for (const block of day.blocks) {
      if (block.status === 'skipped') continue
      map.set(block.moduleId, (map.get(block.moduleId) ?? 0) + block.durationMin)
    }
  }
  return modules
    .filter((module) => map.has(module.id))
    .map((module) => ({
      moduleId: module.id,
      minutes: map.get(module.id) ?? 0,
      color: module.color,
      name: module.name
    }))
    .sort((a, b) => b.minutes - a.minutes)
}
