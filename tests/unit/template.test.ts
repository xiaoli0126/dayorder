import { describe, expect, it } from 'vitest'
import { dayToTemplate, instantiateTemplate, templatePreview } from '../../src/shared/template'
import type { Block, Template } from '../../src/shared/types'

const template: Template = {
  id: 't1',
  name: '上课日',
  description: '',
  isDefault: true,
  useCount: 0,
  lastUsedAt: null,
  blocks: [
    {
      id: 'tb1',
      startMin: 480,
      durationMin: 120,
      moduleId: 'm_study',
      title: '上午学习',
      items: [
        { id: 'i1', text: '听讲座', done: true },
        { id: 'i2', text: '上课', done: false }
      ],
      notes: ''
    },
    {
      id: 'tb2',
      startMin: 600,
      durationMin: 60,
      moduleId: 'm_rest',
      title: '午休',
      items: [],
      notes: ''
    }
  ],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z'
}

const existing: Block[] = [
  {
    id: 'b1',
    startMin: 500,
    durationMin: 60,
    moduleId: 'm_work',
    title: '会议',
    items: [],
    notes: '',
    status: 'planned',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  }
]

describe('template', () => {
  it('instantiates with fresh ids and reset state', () => {
    const result = instantiateTemplate(template, 'replace', [])
    expect(result.blocks).toHaveLength(2)
    expect(result.blocks[0].id).not.toBe('tb1')
    expect(result.blocks[0].items[0].id).not.toBe('i1')
    expect(result.blocks[0].items.every((item) => !item.done)).toBe(true)
    expect(result.blocks[0].status).toBe('planned')
    expect(result.blocks[0].sourceTemplateId).toBe('t1')
    expect(result.replaced).toBe(0)
  })

  it('replaces existing blocks', () => {
    const result = instantiateTemplate(template, 'replace', existing)
    expect(result.blocks).toHaveLength(2)
    expect(result.replaced).toBe(1)
    expect(result.blocks.some((block) => block.id === 'b1')).toBe(false)
  })

  it('skips overlapping blocks in merge mode', () => {
    const result = instantiateTemplate(template, 'merge', existing)
    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.blocks).toHaveLength(2)
    expect(result.blocks.find((block) => block.id === 'b1')).toBeTruthy()
  })

  it('adds everything when the day is empty', () => {
    const result = instantiateTemplate(template, 'merge', [])
    expect(result.added).toBe(2)
    expect(result.skipped).toBe(0)
  })

  it('previews totals', () => {
    const preview = templatePreview(template)
    expect(preview.blockCount).toBe(2)
    expect(preview.totalMinutes).toBe(180)
    expect(preview.moduleIds).toEqual(['m_study', 'm_rest'])
  })

  it('turns a day into a template without completion state', () => {
    const day = {
      date: '2026-10-21',
      note: '',
      blocks: [
        {
          ...existing[0],
          status: 'done' as const,
          items: [{ id: 'x', text: '完成的事', done: true }]
        }
      ]
    }
    const result = dayToTemplate(day, '我的模板')
    expect(result.name).toBe('我的模板')
    expect(result.blocks[0].items[0].done).toBe(false)
    expect('status' in result.blocks[0]).toBe(false)
  })
})
