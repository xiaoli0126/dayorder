import { describe, expect, it } from 'vitest'
import { moduleTotals, summarizeDay } from '../../src/shared/stats'
import type { Day, Module } from '../../src/shared/types'

const modules: Module[] = [
  { id: 'm1', name: '学习', color: '#2F7D6E', icon: 'book-open', defaultDurationMin: 60, order: 0, archived: false },
  { id: 'm2', name: '运动', color: '#C77B36', icon: 'dumbbell', defaultDurationMin: 60, order: 1, archived: false }
]

const day: Day = {
  date: '2026-10-21',
  note: '',
  blocks: [
    {
      id: 'b1',
      startMin: 480,
      durationMin: 120,
      moduleId: 'm1',
      title: '学习',
      items: [
        { id: 'i1', text: '听讲座', done: true },
        { id: 'i2', text: '上课', done: false }
      ],
      notes: '',
      status: 'planned',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'b2',
      startMin: 1020,
      durationMin: 60,
      moduleId: 'm2',
      title: '跑步',
      items: [],
      notes: '',
      status: 'done',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'b3',
      startMin: 1200,
      durationMin: 30,
      moduleId: 'm1',
      title: '取消',
      items: [],
      notes: '',
      status: 'skipped',
      createdAt: '',
      updatedAt: ''
    }
  ]
}

describe('stats', () => {
  it('summarizes a day and ignores skipped blocks', () => {
    const summary = summarizeDay(day)
    expect(summary.plannedMin).toBe(180)
    expect(summary.doneMin).toBe(60)
    expect(summary.blockCount).toBe(3)
    expect(summary.totalItems).toBe(2)
    expect(summary.doneItems).toBe(1)
    expect(summary.completion).toBeCloseTo(0.5)
  })

  it('handles missing days', () => {
    const summary = summarizeDay(undefined)
    expect(summary.plannedMin).toBe(0)
    expect(summary.completion).toBe(0)
  })

  it('aggregates minutes per module', () => {
    const totals = moduleTotals(day, modules)
    expect(totals[0]).toMatchObject({ moduleId: 'm1', minutes: 120 })
    expect(totals[1]).toMatchObject({ moduleId: 'm2', minutes: 60 })
  })
})
