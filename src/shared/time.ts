import { addDays, addMonths, endOfMonth, endOfWeek, format, getDay, startOfMonth, startOfWeek } from 'date-fns'

export const DAY_MINUTES = 1440
export const MIN_DURATION = 15

const pad = (n: number): string => String(n).padStart(2, '0')

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function snapTo(value: number, step: number, mode: 'round' | 'floor' | 'ceil' = 'round'): number {
  if (step <= 1) return Math.round(value)
  const ratio = value / step
  const factor = mode === 'floor' ? Math.floor(ratio) : mode === 'ceil' ? Math.ceil(ratio) : Math.round(ratio)
  return factor * step
}

/** 480 -> "08:00"，1440 -> "24:00" */
export function minutesToLabel(minutes: number): string {
  const safe = clamp(Math.round(minutes), 0, DAY_MINUTES)
  if (safe === DAY_MINUTES) return '24:00'
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`
}

/** "08:30" / "8:30" -> 510；非法输入返回 null */
export function labelToMinutes(label: string): number | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(label)
  if (!match) return null
  const hours = Number(match[1])
  const mins = Number(match[2])
  if (hours === 24 && mins === 0) return DAY_MINUTES
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null
  return hours * 60 + mins
}

/** <input type="time"> 的值（最大 23:59） */
export function toTimeInput(minutes: number): string {
  const safe = clamp(Math.round(minutes), 0, DAY_MINUTES - 1)
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`
}

export function fromTimeInput(value: string): number | null {
  return labelToMinutes(value)
}

export function blockEnd(block: { startMin: number; durationMin: number }): number {
  return block.startMin + block.durationMin
}

export function overlaps(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number
): boolean {
  return aStart < bStart + bDuration && bStart < aStart + aDuration
}

export function formatRange(startMin: number, durationMin: number): string {
  return `${minutesToLabel(startMin)} – ${minutesToLabel(startMin + durationMin)}`
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins} 分钟`
  if (mins === 0) return `${hours} 小时`
  return `${hours} 小时 ${mins} 分`
}

/** 紧凑写法，用于卡片与统计："2h" / "1.5h" / "45m" */
export function formatDurationCompact(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total}m`
  const hours = total / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

// ---------- 日期 ----------

export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function shiftKey(key: string, days: number): string {
  return dateKey(addDays(keyToDate(key), days))
}

export function shiftMonth(key: string, months: number): string {
  return dateKey(addMonths(keyToDate(key), months))
}

export function isTodayKey(key: string): boolean {
  return key === todayKey()
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayLabel(key: string): string {
  return WEEKDAYS[getDay(keyToDate(key))]
}

/** "10月21日 周二" */
export function dayTitle(key: string): string {
  const date = keyToDate(key)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayLabel(key)}`
}

/** "2026年10月" */
export function monthTitle(key: string): string {
  const date = keyToDate(key)
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

/** 从周一开始的整月网格 */
export function monthGrid(key: string): Date[] {
  const first = startOfMonth(keyToDate(key))
  const start = startOfWeek(first, { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(first), { weekStartsOn: 1 })
  const days: Date[] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor)
  }
  return days
}

export function nowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function formatClock(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
