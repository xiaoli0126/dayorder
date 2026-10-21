import { describe, expect, it } from 'vitest'
import { computeLanes } from '../../src/shared/layout'

const block = (id: string, startMin: number, durationMin: number) => ({ id, startMin, durationMin })

describe('computeLanes', () => {
  it('returns a single lane for one block', () => {
    const lanes = computeLanes([block('a', 480, 60)])
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 1 })
  })

  it('splits fully overlapping blocks into separate lanes', () => {
    const lanes = computeLanes([block('a', 480, 60), block('b', 480, 60), block('c', 480, 60)])
    expect(lanes.get('a')?.lanes).toBe(3)
    expect(new Set([lanes.get('a')?.lane, lanes.get('b')?.lane, lanes.get('c')?.lane]).size).toBe(3)
  })

  it('handles nested blocks', () => {
    const lanes = computeLanes([block('outer', 480, 180), block('inner', 540, 30)])
    expect(lanes.get('outer')).toEqual({ lane: 0, lanes: 2 })
    expect(lanes.get('inner')).toEqual({ lane: 1, lanes: 2 })
  })

  it('treats touching blocks as non-overlapping', () => {
    const lanes = computeLanes([block('a', 480, 60), block('b', 540, 60)])
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 1 })
    expect(lanes.get('b')).toEqual({ lane: 0, lanes: 1 })
  })

  it('reuses lanes for chained overlaps', () => {
    const lanes = computeLanes([block('a', 480, 60), block('b', 510, 60), block('c', 540, 60)])
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 })
    expect(lanes.get('b')?.lane).toBe(1)
    expect(lanes.get('c')?.lane).toBe(0)
  })

  it('computes lanes per cluster independently', () => {
    const lanes = computeLanes([block('a', 480, 60), block('b', 480, 60), block('c', 900, 60)])
    expect(lanes.get('a')?.lanes).toBe(2)
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 1 })
  })
})
