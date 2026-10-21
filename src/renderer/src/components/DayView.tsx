import { useState } from 'react'
import { ChevronLeft, ChevronRight, LayoutTemplate, Plus, Search, Sparkles } from 'lucide-react'
import { formatDuration, dayTitle, isTodayKey, shiftKey, todayKey } from '@shared/time'
import { summarizeDay } from '@shared/stats'
import { useApp } from '../store/useApp'
import { useNowMinutes } from '../hooks/useNow'
import { Button, IconButton, ProgressRing } from './ui'
import { Timeline } from './Timeline'

export function DayView(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const dateKey = useApp((state) => state.dateKey)
  const selectedId = useApp((state) => state.selectedBlockId)
  const readOnly = useApp((state) => state.readOnly)
  const saveError = useApp((state) => state.saveError)
  const startupWarnings = useApp((state) => state.startupWarnings)
  const setDate = useApp((state) => state.setDate)
  const selectBlock = useApp((state) => state.selectBlock)
  const createBlock = useApp((state) => state.createBlock)
  const updateBlock = useApp((state) => state.updateBlock)
  const toggleItem = useApp((state) => state.toggleItem)
  const openApplyTemplate = useApp((state) => state.openApplyTemplate)
  const setSearchOpen = useApp((state) => state.setSearchOpen)
  const [dismissedWarnings, setDismissedWarnings] = useState(false)

  if (!doc) return <div />
  const day = doc.days[dateKey]
  const blocks = day?.blocks ?? []
  const summary = summarizeDay(day)
  const isToday = isTodayKey(dateKey)
  const nowMinute = useNowMinutes(isToday)
  const showNowLine = isToday && doc.settings.showNowLine
  const warnings = dismissedWarnings ? [] : startupWarnings

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-line px-4">
        <div className="flex items-center">
          <IconButton label="前一天" onClick={() => setDate(shiftKey(dateKey, -1))}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton label="后一天" onClick={() => setDate(shiftKey(dateKey, 1))}>
            <ChevronRight size={16} />
          </IconButton>
        </div>

        <div className="ml-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-ink" data-testid="day-title">
              {dayTitle(dateKey)}
            </h1>
            {isToday ? (
              <span className="rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                今天
              </span>
            ) : null}
          </div>
          <div className="text-[11px] text-ink-3">
            {summary.blockCount} 个时间块 · {formatDuration(summary.plannedMin)}
            {summary.totalItems > 0 ? ` · 完成 ${summary.doneItems}/${summary.totalItems}` : ''}
          </div>
        </div>

        {!isToday ? (
          <Button size="sm" variant="outline" className="ml-2" onClick={() => setDate(todayKey())}>
            回到今天
          </Button>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <ProgressRing value={summary.completion} size={36} stroke={3.5} />
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)} aria-label="搜索">
              <Search size={14} />
              <span className="hidden xl:inline">搜索</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={readOnly}
              onClick={() => openApplyTemplate(null)}
              data-testid="open-apply-template"
            >
              <LayoutTemplate size={14} /> 从模板开始
            </Button>
          </div>
        </div>
      </div>

      {readOnly ? (
        <div className="border-b border-line bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] px-4 py-1.5 text-[11.5px] text-danger">
          当前数据为只读（保存失败或文件来自更高版本），修改不会被写入。
        </div>
      ) : null}
      {saveError ? (
        <div className="border-b border-line bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] px-4 py-1.5 text-[11.5px] text-danger">
          保存失败：{saveError}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-1.5 text-[11.5px] text-ink-2">
          <span className="min-w-0 flex-1 truncate">{warnings.join('；')}</span>
          <button
            type="button"
            className="shrink-0 rounded px-1.5 py-0.5 text-ink-3 hover:bg-surface hover:text-ink"
            onClick={() => setDismissedWarnings(true)}
          >
            知道了
          </button>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <Timeline
          blocks={blocks}
          modules={doc.modules}
          mode="day"
          hourHeight={doc.settings.hourHeight}
          snapMinutes={doc.settings.snapMinutes}
          showNowLine={showNowLine}
          nowMinute={nowMinute}
          selectedId={selectedId}
          startHour={doc.settings.dayStartHour}
          readOnly={readOnly}
          onSelect={selectBlock}
          onCreate={(startMin, durationMin) => createBlock({ startMin, durationMin })}
          onChange={(id, patch) => updateBlock(id, patch)}
          onToggleItem={toggleItem}
        />

        {blocks.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-6">
            <div className="pointer-events-auto w-[368px] rounded-2xl border border-line bg-surface/95 p-5 text-center shadow-[var(--shadow-2)] backdrop-blur">
              <span
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
              >
                <Sparkles size={18} />
              </span>
              <h2 className="mt-3 text-[14px] font-semibold text-ink">开始安排这一天</h2>
              <p className="mt-1 text-[12px] leading-5 text-ink-2">
                从模板一键铺满一天，或在时间轴上按住拖出一段时间。
              </p>
              <Button variant="primary" className="mt-3 w-full" onClick={() => openApplyTemplate(null)} disabled={readOnly}>
                <LayoutTemplate size={14} /> 从模板开始
              </Button>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink"
                onClick={() => createBlock({ startMin: 480, durationMin: 60 })}
                disabled={readOnly}
              >
                <Plus size={12} /> 手动新建一个（N）
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
