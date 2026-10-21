import { describe, expect, it } from 'vitest'
import { createInitialDoc } from '../../src/shared/doc'
import { docSchema, FutureVersionError, readDocument } from '../../src/shared/schema'

describe('schema', () => {
  it('accepts the initial document', () => {
    const doc = createInitialDoc()
    expect(docSchema.safeParse(doc).success).toBe(true)
  })

  it('fills defaults for an empty object', () => {
    const { doc, warnings } = readDocument({})
    expect(doc.schemaVersion).toBe(1)
    expect(doc.modules.length).toBeGreaterThanOrEqual(6)
    expect(doc.templates).toEqual([])
    expect(doc.settings.theme).toBe('paper')
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('clamps out-of-range blocks', () => {
    const { doc } = readDocument({
      schemaVersion: 1,
      modules: [{ id: 'm1', name: '学习', color: '#2F7D6E', icon: 'book-open' }],
      days: {
        '2026-10-21': {
          blocks: [
            { id: 'b1', startMin: 1500, durationMin: 30, moduleId: 'm1', title: '深夜' },
            { id: 'b2', startMin: 480, durationMin: 2000, moduleId: 'm1', title: '超长' }
          ]
        }
      }
    })
    const blocks = doc.days['2026-10-21'].blocks
    for (const block of blocks) {
      expect(block.startMin).toBeGreaterThanOrEqual(0)
      expect(block.startMin + block.durationMin).toBeLessThanOrEqual(1440)
      expect(block.durationMin).toBeGreaterThanOrEqual(15)
    }
    expect(blocks[0].moduleId).toBe('m1')
  })

  it('reassigns orphan module references', () => {
    const { doc, warnings } = readDocument({
      schemaVersion: 1,
      modules: [{ id: 'm1', name: '学习', color: '#2F7D6E', icon: 'book-open' }],
      days: {
        '2026-10-21': {
          blocks: [{ id: 'b1', startMin: 480, durationMin: 60, moduleId: 'missing', title: '孤儿' }]
        }
      }
    })
    expect(doc.days['2026-10-21'].blocks[0].moduleId).toBe('m1')
    expect(warnings.some((warning) => warning.includes('模块不存在'))).toBe(true)
  })

  it('rejects future versions unless allowed', () => {
    expect(() => readDocument({ schemaVersion: 99 })).toThrow(FutureVersionError)
    const { doc, warnings } = readDocument({ schemaVersion: 99 }, { allowFuture: true })
    expect(doc.schemaVersion).toBe(1)
    expect(warnings.some((warning) => warning.includes('只读'))).toBe(true)
  })

  it('drops malformed days and items', () => {
    const { doc, warnings } = readDocument({
      schemaVersion: 1,
      modules: [{ id: 'm1', name: '学习', color: '#2F7D6E', icon: 'book-open' }],
      days: {
        'not-a-date': { blocks: [] },
        '2026-10-22': {
          blocks: [
            {
              id: 'b1',
              startMin: 600,
              durationMin: 60,
              moduleId: 'm1',
              title: '测试',
              items: [{ text: '有效' }, { text: '   ' }]
            }
          ]
        }
      }
    })
    expect(Object.keys(doc.days)).toEqual(['2026-10-22'])
    expect(doc.days['2026-10-22'].blocks[0].items).toHaveLength(1)
    expect(warnings.some((warning) => warning.includes('not-a-date'))).toBe(true)
  })
})
