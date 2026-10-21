import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Keyboard, LayoutTemplate, Pencil, Plus, SlidersHorizontal } from 'lucide-react'
import { dateKey, dayTitle, formatDurationCompact, isTodayKey, monthGrid, monthTitle, shiftKey, shiftMonth, todayKey } from '@shared/time'
import { useApp } from '../store/useApp'
import { cn } from '../lib/cn'
import { ModuleIcon } from '../lib/icons'
import { IconButton, SectionTitle } from './ui'

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function MiniCalendar(): React.JSX.Element {
  const dateKeyValue = useApp((state) => state.dateKey)
  const setDate = useApp((state) => state.setDate)
  const [anchor, setAnchor] = useState(dateKeyValue)

  useEffect(() => {
    setAnchor(dateKeyValue)
  }, [dateKeyValue])

  const days = useMemo(() => monthGrid(anchor), [anchor])
  const currentMonth = anchor.slice(0, 7)

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between pl-1">
        <span className="text-[12.5px] font-medium text-ink">{monthTitle(anchor)}</span>
        <div className="flex items-center gap-0.5">
          <IconButton
            label="上个月"
            className="h-6 w-6"
            onClick={() => setAnchor((value) => shiftMonth(value, -1))}
          >
            <ChevronLeft size={14} />
          </IconButton>
          <IconButton
            label="下个月"
            className="h-6 w-6"
            onClick={() => setAnchor((value) => shiftMonth(value, 1))}
          >
            <ChevronRight size={14} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEK_LABELS.map((label) => (
          <span key={label} className="pb-1 text-[10.5px] text-ink-3">
            {label}
          </span>
        ))}
        {days.map((day) => {
          const key = dateKey(day)
          const inMonth = key.slice(0, 7) === currentMonth
          const selected = key === dateKeyValue
          const today = isTodayKey(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => setDate(key)}
              aria-label={dayTitle(key)}
              aria-current={selected ? 'date' : undefined}
              className={cn(
                'relative mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[11.5px] tabular-nums transition-colors',
                selected
                  ? 'bg-[var(--accent)] font-medium text-white'
                  : inMonth
                    ? 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                    : 'text-ink-3/60 hover:bg-surface-2'
              )}
            >
              {day.getDate()}
              {today && !selected ? (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full" style={{ background: 'var(--accent)' }} />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Sidebar(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const dateKeyValue = useApp((state) => state.dateKey)
  const setDate = useApp((state) => state.setDate)
  const setView = useApp((state) => state.setView)
  const openApplyTemplate = useApp((state) => state.openApplyTemplate)
  const setEditingTemplate = useApp((state) => state.setEditingTemplate)
  const createTemplate = useApp((state) => state.createTemplate)
  const setDialog = useApp((state) => state.setDialog)
  const view = useApp((state) => state.view)

  if (!doc) return <aside className="w-[264px]" />

  const templates = [...doc.templates].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    return (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? '')
  })

  return (
    <aside className="flex w-[264px] shrink-0 flex-col overflow-y-auto border-r border-line bg-bg px-3 pb-3">
      <div className="py-3">
        <MiniCalendar />
      </div>

      <div className="mb-3 flex gap-1.5 px-1">
        {[
          { label: '昨天', offset: -1 },
          { label: '今天', offset: 0 },
          { label: '明天', offset: 1 }
        ].map((item) => {
          const key = item.offset === 0 ? todayKey() : shiftKey(todayKey(), item.offset)
          const active = dateKeyValue === key
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setDate(key)}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-[12px] transition-colors',
                active ? 'bg-surface font-medium text-ink shadow-[var(--shadow-1)]' : 'text-ink-2 hover:bg-surface-2'
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex gap-1 rounded-lg bg-surface-2 p-0.5">
        {[
          { id: 'day' as const, label: '日视图' },
          { id: 'templates' as const, label: '模板' },
          { id: 'settings' as const, label: '设置' }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`nav-${item.id}`}
            onClick={() => setView(item.id)}
            aria-pressed={view === item.id}
            className={cn(
              'flex-1 rounded-md py-1 text-[11.5px] transition-colors',
              view === item.id
                ? 'bg-surface font-medium text-ink shadow-[var(--shadow-1)]'
                : 'text-ink-2 hover:text-ink'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <SectionTitle
          action={
            <IconButton label="新建模板" className="h-6 w-6" onClick={() => createTemplate()}>
              <Plus size={14} />
            </IconButton>
          }
        >
          <span className="flex items-center gap-1.5">
            <LayoutTemplate size={12} /> 模板
          </span>
        </SectionTitle>
        <div className="flex flex-col gap-0.5">
          {templates.map((template) => (
            <div
              key={template.id}
              className="group flex items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-surface-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onDoubleClick={() => {
                  setEditingTemplate(template.id)
                  setView('templates')
                }}
                onClick={() => openApplyTemplate(template.id)}
                title="点击应用到某一天，双击编辑"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[12.5px] text-ink">{template.name}</span>
                  {template.isDefault ? (
                    <span className="shrink-0 rounded bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-1 text-[9.5px] text-[var(--accent)]">
                      默认
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[10.5px] text-ink-3">
                  {template.blocks.length} 块 · {formatDurationCompact(template.blocks.reduce((sum, block) => sum + block.durationMin, 0))}
                </span>
              </button>
              <IconButton
                label="编辑模板"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => {
                  setEditingTemplate(template.id)
                  setView('templates')
                }}
              >
                <Pencil size={12} />
              </IconButton>
            </div>
          ))}
          {templates.length === 0 ? (
            <button
              type="button"
              className="rounded-lg border border-dashed border-line px-2 py-3 text-[12px] text-ink-3 hover:border-line-strong"
              onClick={() => createTemplate()}
            >
              还没有模板，点此新建
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <SectionTitle
          action={
            <IconButton label="管理模块" className="h-6 w-6" onClick={() => setDialog('modules')}>
              <SlidersHorizontal size={13} />
            </IconButton>
          }
        >
          模块
        </SectionTitle>
        <div className="grid grid-cols-2 gap-1">
          {doc.modules
            .filter((module) => !module.archived)
            .sort((a, b) => a.order - b.order)
            .map((module) => (
              <div
                key={module.id}
                className="flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11.5px] text-ink-2"
                title={module.name}
              >
                <span style={{ color: module.color }}>
                  <ModuleIcon name={module.icon} size={12} />
                </span>
                <span className="truncate">{module.name}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-auto border-t border-line pt-3">
        <button
          type="button"
          className="soft-btn w-full justify-start"
          onClick={() => useApp.getState().pushToast('←/→ 换日 · T 今天 · N 新建 · Ctrl+Z 撤销 · Ctrl+F 搜索 · Delete 删除')}
        >
          <Keyboard size={14} /> 快捷键
        </button>
      </div>
    </aside>
  )
}

