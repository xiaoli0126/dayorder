import { describe, expect, it } from 'vitest'
import {
  blockEnd,
  clamp,
  formatDuration,
  formatRange,
  labelToMinutes,
  minutesToLabel,
  monthGrid,
  shiftKey,
  snapTo,
  toTimeInput
} from '../../src/shared/time'

describe('time', () => {
  it('converts minutes to labels', () => {
    expect(minutesToLabel(0)).toBe('00:00')
    expect(minutesToLabel(510)).toBe('08:30')
    expect(minutesToLabel(1440)).toBe('24:00')
    expect(minutesToLabel(2000)).toBe('24:00')
  })

  it('parses labels', () => {
    expect(labelToMinutes('08:30')).toBe(510)
    expect(labelToMinutes('8:30')).toBe(510)
    expect(labelToMinutes('24:00')).toBe(1440)
    expect(labelToMinutes('24:01')).toBeNull()
    expect(labelToMinutes('25:00')).toBeNull()
    expect(labelToMinutes('abc')).toBeNull()
  })

  it('formats time inputs under 24:00', () => {
    expect(toTimeInput(1440)).toBe('23:59')
    expect(toTimeInput(-10)).toBe('00:00')
  })

  it('clamps and snaps', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(snapTo(7, 5)).toBe(5)
    expect(snapTo(12, 5)).toBe(10)
    expect(snapTo(13, 5)).toBe(15)
    expect(snapTo(7, 5, 'floor')).toBe(5)
    expect(snapTo(7, 5, 'ceil')).toBe(10)
  })

  it('computes block end and ranges', () => {
    expect(blockEnd({ startMin: 480, durationMin: 120 })).toBe(600)
    expect(formatRange(480, 120)).toBe('08:00 – 10:00')
  })

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 分钟')
    expect(formatDuration(60)).toBe('1 小时')
    expect(formatDuration(150)).toBe('2 小时 30 分')
  })

  it('shifts date keys across month boundaries', () => {
    expect(shiftKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftKey('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('builds a Monday-first month grid', () => {
    const days = monthGrid('2026-10-21')
    expect(days.length % 7).toBe(0)
    expect(days[0].getDay()).toBe(1)
    expect(days.some((day) => day.getDate() === 21 && day.getMonth() === 9)).toBe(true)
  })
})
