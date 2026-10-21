import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeLanes } from '@shared/layout'
import { clamp, DAY_MINUTES, formatDurationCompact, formatRange, MIN_DURATION, minutesToLabel, snapTo } from '@shared/time'
import type { Block, Module, TemplateBlock } from '@shared/types'
import { ModuleIcon } from '../lib/icons'
import { cn } from '../lib/cn'

type AnyBlock = Block | TemplateBlock

type Interaction =
  | { kind: 'create'; startY: number; anchorMin: number; currentMin: number; moved: boolean }
  | {
      kind: 'move' | 'resize-top' | 'resize-bottom'
      id: string
      startY: number
      originStart: number
      originDuration: number
      deltaMin: number
      moved: boolean
    }

interface TimelineProps {
  blocks: AnyBlock[]
  modules: Module[]
  mode: 'day' | 'template'
  hourHeight: number
  snapMinutes: number
  showNowLine: boolean
  nowMinute: number
  selectedId: string | null
  startHour: number
  readOnly?: boolean
  onSelect: (id: string | null) => void
  onCreate?: (startMin: number, durationMin: number) => void
  onChange?: (id: string, patch: { startMin: number; durationMin: number }) => void
  onToggleItem?: (blockId: string, itemId: string) => void
}

const GUTTER = 60
const LANE_GAP = 4
const DRAG_THRESHOLD = 4

export function Timeline({
  blocks,
  modules,
  mode,
  hourHeight,
  snapMinutes,
  showNowLine,
  nowMinute,
  selectedId,
  startHour,
  readOnly = false,
  onSelect,
  onCreate,
  onChange,
  onToggleItem
}: TimelineProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [interaction, setInteraction] = useState<Interaction | null>(null)

  const pxPerMin = hourHeight / 60
  const contentHeight = DAY_MINUTES * pxPerMin
  const moduleMap = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules])

  const displayBlocks = useMemo(() => {
    if (!interaction) return blocks
    if (interaction.kind === 'create') return blocks
    return blocks.map((block) => {
      if (block.id !== interaction.id) return block
      if (interaction.kind === 'move') {
        const startMin = clamp(interaction.originStart + interaction.deltaMin, 0, DAY_MINUTES - interaction.originDuration)
        return { ...block, startMin }
      }
      if (interaction.kind === 'resize-top') {
        const end = interaction.originStart + interaction.originDuration
        const startMin = clamp(interaction.originStart + interaction.deltaMin, 0, end - MIN_DURATION)
        return { ...block, startMin, durationMin: end - startMin }
      }
      const durationMin = clamp(interaction.originDuration + interaction.deltaMin, MIN_DURATION, DAY_MINUTES - interaction.originStart)
      return { ...block, durationMin }
    })
  }, [blocks, interaction])

  const lanes = useMemo(() => computeLanes(displayBlocks), [displayBlocks])

  const minuteFromClientY = useCallback(
    (clientY: number): number => {
      const surface = surfaceRef.current
      if (!surface) return 0
      const rect = surface.getBoundingClientRect()
      return clamp((clientY - rect.top) / pxPerMin, 0, DAY_MINUTES)
    },
    [pxPerMin]
  )

  const snapMinute = useCallback((minute: number) => snapTo(minute, snapMinutes, 'floor'), [snapMinutes])

  const scrollToStart = useCallback(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    const showNow = showNowLine && nowMinute >= startHour * 60 && nowMinute <= DAY_MINUTES
    const anchor = showNow ? Math.max(0, nowMinute - 90) : startHour * 60
    scroll.scrollTop = Math.max(0, anchor * pxPerMin - 12)
  }, [nowMinute, pxPerMin, showNowLine, startHour])

  useEffect(() => {
    scrollToStart()
  }, [hourHeight, startHour])

  const handleSurfacePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (readOnly || event.button !== 0) return
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).dataset.grid) return
    const minute = snapMinute(minuteFromClientY(event.clientY))
    surfaceRef.current?.setPointerCapture(event.pointerId)
    setInteraction({ kind: 'create', startY: event.clientY, anchorMin: minute, currentMin: minute + 60, moved: false })
    onSelect(null)
    event.preventDefault()
  }

  const handleBlockPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    block: AnyBlock,
    kind: 'move' | 'resize-top' | 'resize-bottom'
  ): void => {
    if (readOnly || event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    onSelect(block.id)
    surfaceRef.current?.setPointerCapture(event.pointerId)
    setInteraction({
      kind,
      id: block.id,
      startY: event.clientY,
      originStart: block.startMin,
      originDuration: block.durationMin,
      deltaMin: 0,
      moved: false
    })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!interaction) return
    const deltaPx = event.clientY - interaction.startY
    const moved = interaction.moved || Math.abs(deltaPx) > DRAG_THRESHOLD
    if (interaction.kind === 'create') {
      const minute = snapMinute(minuteFromClientY(event.clientY))
      setInteraction({ ...interaction, currentMin: minute, moved })
      return
    }
    const deltaMin = snapTo(deltaPx / pxPerMin, snapMinutes, 'round')
    setInteraction({ ...interaction, deltaMin, moved })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!interaction) return
    surfaceRef.current?.releasePointerCapture(event.pointerId)

    if (interaction.kind === 'create') {
      if (!interaction.moved) {
        const start = clamp(interaction.anchorMin, 0, DAY_MINUTES - 60)
        onCreate?.(start, 60)
      } else {
        const start = Math.min(interaction.anchorMin, interaction.currentMin)
        const end = Math.max(interaction.anchorMin, interaction.currentMin)
        const duration = Math.max(MIN_DURATION, end - start)
        const safeStart = clamp(start, 0, DAY_MINUTES - MIN_DURATION)
        onCreate?.(safeStart, Math.min(duration, DAY_MINUTES - safeStart))
      }
      setInteraction(null)
      return
    }

    if (interaction.moved) {
      if (interaction.kind === 'move') {
        const startMin = clamp(
          interaction.originStart + interaction.deltaMin,
          0,
          DAY_MINUTES - interaction.originDuration
        )
        onChange?.(interaction.id, { startMin, durationMin: interaction.originDuration })
      } else if (interaction.kind === 'resize-top') {
        const end = interaction.originStart + interaction.originDuration
        const startMin = clamp(interaction.originStart + interaction.deltaMin, 0, end - MIN_DURATION)
        onChange?.(interaction.id, { startMin, durationMin: end - startMin })
      } else {
        const durationMin = clamp(
          interaction.originDuration + interaction.deltaMin,
          MIN_DURATION,
          DAY_MINUTES - interaction.originStart
        )
        onChange?.(interaction.id, { startMin: interaction.originStart, durationMin })
      }
    }
    setInteraction(null)
  }

  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), [])
  const ghost =
    interaction?.kind === 'create' && interaction.moved
      ? {
          startMin: Math.min(interaction.anchorMin, interaction.currentMin),
          endMin: Math.max(interaction.anchorMin, interaction.currentMin)
        }
      : null

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden" data-testid="timeline-scroll">
      <div className="relative flex" style={{ height: contentHeight }}>
        <div className="relative shrink-0 select-none" style={{ width: GUTTER }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-ink-3"
              style={{ top: hour * hourHeight }}
            >
              {`${String(hour).padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        <div
          ref={surfaceRef}
          data-testid="timeline-surface"
          className={cn('relative flex-1', readOnly ? 'cursor-default' : 'cursor-crosshair')}
          onPointerDown={handleSurfacePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div data-grid="true" className="absolute inset-0" />

          {hours.map((hour) => (
            <div
              key={hour}
              className="pointer-events-none absolute inset-x-0 border-t"
              style={{
                top: hour * hourHeight,
                borderColor: 'var(--line)',
                opacity: hour === 0 ? 0 : 1
              }}
            >
              <div
                className="absolute inset-x-0 border-t border-dashed"
                style={{ top: hourHeight / 2, borderColor: 'var(--line)', opacity: 0.45 }}
              />
            </div>
          ))}

          {ghost ? (
            <div
              className="pointer-events-none absolute inset-x-1 z-10 rounded-xl border-2 border-dashed"
              style={{
                top: ghost.startMin * pxPerMin,
                height: Math.max(8, (ghost.endMin - ghost.startMin) * pxPerMin),
                borderColor: 'var(--accent)',
                background: 'color-mix(in oklab, var(--accent) 10%, transparent)'
              }}
            >
              <span className="absolute -top-6 left-1 rounded bg-accent px-1.5 py-0.5 text-[11px] text-white">
                {formatRange(ghost.startMin, ghost.endMin - ghost.startMin)}
              </span>
            </div>
          ) : null}

          {displayBlocks.map((block) => {
            const info = lanes.get(block.id) ?? { lane: 0, lanes: 1 }
            const module = moduleMap.get(block.moduleId)
            const color = module?.color ?? '#7A8288'
            const gap = info.lanes > 1 ? LANE_GAP : 0
            const width = `calc((100% - ${gap * (info.lanes - 1)}px - 12px) / ${info.lanes})`
            const left = `calc(${info.lane} * ((100% - ${gap * (info.lanes - 1)}px - 12px) / ${info.lanes} + ${gap}px) + 4px)`
            const height = Math.max(6, block.durationMin * pxPerMin - 2)
            const status = 'status' in block ? block.status : 'planned'
            const done = status === 'done'
            const interactive = !readOnly
            const compact = height < 34
            const medium = height < 64
            const items = block.items
            const doneItems = items.filter((item) => item.done).length

            return (
              <div
                key={block.id}
                data-testid={`blockcard-${block.id}`}
                data-block-id={block.id}
                data-selected={selectedId === block.id}
                data-done={done}
                role="button"
                tabIndex={interactive ? 0 : -1}
                aria-label={`${module?.name ?? '模块'} ${formatRange(block.startMin, block.durationMin)}${
                  items.length ? `，${items.length} 项` : ''
                }`}
                className={cn(
                  'timeline-block absolute z-10 overflow-hidden border-l-[3px] text-left',
                  interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                  done ? 'opacity-60' : ''
                )}
                style={{
                  top: block.startMin * pxPerMin,
                  height,
                  left,
                  width,
                  borderLeftColor: color,
                  backgroundColor: `color-mix(in oklab, ${color} var(--block-tint, 13%), var(--surface))`,
                  boxShadow: 'var(--shadow-1)',
                  touchAction: 'none'
                }}
                onPointerDown={(event) => handleBlockPointerDown(event, block, 'move')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(block.id)
                  }
                }}
              >
                <div
                  data-handle="top"
                  className="absolute inset-x-0 top-0 z-20 h-1.5 cursor-ns-resize"
                  onPointerDown={(event) => handleBlockPointerDown(event, block, 'resize-top')}
                />
                <div
                  data-handle="bottom"
                  className="absolute inset-x-0 bottom-0 z-20 h-1.5 cursor-ns-resize"
                  onPointerDown={(event) => handleBlockPointerDown(event, block, 'resize-bottom')}
                />
                <div
                  data-handle="bottom"
                  className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-ns-resize opacity-0"
                  onPointerDown={(event) => handleBlockPointerDown(event, block, 'resize-bottom')}
                />

                <div className="flex h-full min-w-0 flex-col gap-0.5 px-2 py-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <span style={{ color }} className="shrink-0">
                      <ModuleIcon name={module?.icon ?? 'ellipsis'} size={compact ? 11 : 12} />
                    </span>
                    {!compact ? (
                      <span className="shrink-0 text-[11px] font-medium" style={{ color }}>
                        {module?.name ?? '模块'}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-4 text-ink">
                      {block.title || module?.name || '未命名'}
                    </span>
                    {!compact ? (
                      <span className="shrink-0 text-[10.5px] tabular-nums text-ink-3">
                        {formatDurationCompact(block.durationMin)}
                      </span>
                    ) : null}
                  </div>

                  {!compact && items.length > 0 ? (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {items.slice(0, medium ? 1 : 3).map((item) => (
                        <label
                          key={item.id}
                          className="flex min-w-0 cursor-pointer items-center gap-1 text-[11px] text-ink-2"
                          onPointerDown={(event) => {
                            event.stopPropagation()
                            onSelect(block.id)
                          }}
                        >
                          {mode === 'day' && interactive ? (
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => onToggleItem?.(block.id, item.id)}
                              className="h-3 w-3 shrink-0 accent-[var(--accent)]"
                              aria-label={item.text}
                            />
                          ) : (
                            <span
                              className={cn(
                                'h-1.5 w-1.5 shrink-0 rounded-full',
                                item.done ? 'bg-current opacity-70' : 'bg-ink-3'
                              )}
                              style={{ color }}
                            />
                          )}
                          <span className={cn('truncate', item.done ? 'line-through opacity-60' : '')}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                      {!medium && items.length > 3 ? (
                        <span className="text-[10px] text-ink-3">+{items.length - 3} 项</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {items.length > 0 && medium && !compact ? (
                  <span className="absolute bottom-1 right-1.5 text-[10px] tabular-nums text-ink-3">
                    {doneItems}/{items.length}
                  </span>
                ) : null}
              </div>
            )
          })}

        </div>

        {showNowLine ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-30"
            style={{ top: nowMinute * pxPerMin }}
            aria-hidden
          >
            <div className="relative border-t" style={{ borderColor: 'var(--danger)' }}>
              <span
                className="absolute -top-2 left-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white shadow-[var(--shadow-1)]"
                style={{ background: 'var(--danger)' }}
              >
                现在 {minutesToLabel(nowMinute)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

