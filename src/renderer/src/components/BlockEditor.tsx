import { useEffect, useRef, useState } from 'react'
import { Clock, Copy, Plus, Trash2 } from 'lucide-react'
import { newId } from '@shared/ids'
import { clamp, DAY_MINUTES, formatDuration, formatRange, fromTimeInput, MIN_DURATION, toTimeInput } from '@shared/time'
import type { Block, BlockStatus, Item, Module, TemplateBlock } from '@shared/types'
import { ModuleIcon } from '../lib/icons'
import { cn } from '../lib/cn'
import { Button, IconButton } from './ui'

type EditableBlock = Block | TemplateBlock

interface BlockEditorProps {
  block: EditableBlock
  modules: Module[]
  variant: 'day' | 'template'
  readOnly?: boolean
  onChange: (patch: {
    startMin?: number
    durationMin?: number
    moduleId?: string
    title?: string
    notes?: string
    status?: BlockStatus
  }) => void
  onItemsChange: (items: Item[]) => void
  onDelete?: () => void
  onDuplicate?: () => void
}

function FieldLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <span className="mb-1 block text-[11px] font-medium text-ink-3">{children}</span>
}

export function BlockEditor({
  block,
  modules,
  variant,
  readOnly = false,
  onChange,
  onItemsChange,
  onDelete,
  onDuplicate
}: BlockEditorProps): React.JSX.Element {
  const [newItem, setNewItem] = useState('')
  const [title, setTitle] = useState(block.title)
  const [notes, setNotes] = useState(block.notes)
  const titleRef = useRef(title)
  const notesRef = useRef(notes)

  useEffect(() => {
    setTitle(block.title)
    titleRef.current = block.title
  }, [block.id, block.title])

  useEffect(() => {
    setNotes(block.notes)
    notesRef.current = block.notes
  }, [block.id, block.notes])

  const end = block.startMin + block.durationMin

  const handleStart = (value: string): void => {
    const minutes = fromTimeInput(value)
    if (minutes == null) return
    const start = clamp(minutes, 0, end - MIN_DURATION)
    onChange({ startMin: start, durationMin: end - start })
  }

  const handleEnd = (value: string): void => {
    const minutes = fromTimeInput(value)
    if (minutes == null) return
    const safeEnd = clamp(minutes, block.startMin + MIN_DURATION, DAY_MINUTES)
    onChange({ durationMin: safeEnd - block.startMin })
  }

  const updateItem = (itemId: string, patch: Partial<Item>): void => {
    onItemsChange(block.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)))
  }

  const addItem = (): void => {
    const text = newItem.trim()
    if (!text) return
    onItemsChange([...block.items, { id: newId('i'), text: text.slice(0, 80), done: false }])
    setNewItem('')
  }

  const status = 'status' in block ? block.status : 'planned'
  const statusOptions: Array<{ value: BlockStatus; label: string }> = [
    { value: 'planned', label: '计划中' },
    { value: 'done', label: '已完成' },
    { value: 'skipped', label: '跳过' }
  ]

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <Clock size={12} />
            <span className="tabular-nums">{formatRange(block.startMin, block.durationMin)}</span>
            <span className="text-ink-3">·</span>
            <span>{formatDuration(block.durationMin)}</span>
          </div>
          <div className="mt-1 truncate text-[15px] font-semibold text-ink">
            {block.title || modules.find((module) => module.id === block.moduleId)?.name || '未命名时间块'}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onDuplicate ? (
            <IconButton label="复制时间块" onClick={onDuplicate} disabled={readOnly}>
              <Copy size={14} />
            </IconButton>
          ) : null}
          {onDelete ? (
            <IconButton label="删除时间块" onClick={onDelete} disabled={readOnly}>
              <Trash2 size={14} />
            </IconButton>
          ) : null}
        </div>
      </div>

      <div>
        <FieldLabel>模块</FieldLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {modules
            .filter((module) => !module.archived)
            .sort((a, b) => a.order - b.order)
            .map((module) => {
              const active = module.id === block.moduleId
              return (
                <button
                  key={module.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange({ moduleId: module.id })}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] transition-colors disabled:opacity-60',
                    active ? 'border-transparent font-medium' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
                  )}
                  style={
                    active
                      ? {
                          background: `color-mix(in oklab, ${module.color} 15%, var(--surface))`,
                          color: module.color
                        }
                      : undefined
                  }
                >
                  <ModuleIcon name={module.icon} size={13} />
                  <span className="truncate">{module.name}</span>
                </button>
              )
            })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <FieldLabel>开始</FieldLabel>
          <input
            type="time"
            className="time-input"
            value={toTimeInput(block.startMin)}
            disabled={readOnly}
            onChange={(event) => handleStart(event.target.value)}
            data-testid="block-start"
          />
        </label>
        <label className="block">
          <FieldLabel>结束</FieldLabel>
          <input
            type="time"
            className="time-input"
            value={toTimeInput(end)}
            disabled={readOnly}
            onChange={(event) => handleEnd(event.target.value)}
            data-testid="block-end"
          />
        </label>
      </div>

      <label className="block">
        <FieldLabel>标题</FieldLabel>
        <input
          className="field"
          value={title}
          maxLength={60}
          disabled={readOnly}
          placeholder="留空则显示模块名"
          data-testid="block-title"
          onChange={(event) => {
            setTitle(event.target.value)
            titleRef.current = event.target.value
            onChange({ title: event.target.value })
          }}
          onBlur={() => {
            if (titleRef.current === block.title) return
            onChange({ title: titleRef.current })
          }}
        />
      </label>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-3">具体事情</span>
          <span className="text-[10.5px] text-ink-3">
            {block.items.filter((item) => item.done).length}/{block.items.length}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {block.items.map((item) => (
            <div key={item.id} className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-surface-2">
              {variant === 'day' ? (
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                  checked={item.done}
                  disabled={readOnly}
                  aria-label={`完成 ${item.text}`}
                  onChange={() => updateItem(item.id, { done: !item.done })}
                />
              ) : (
                <span
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', item.done ? 'bg-ink-3' : 'bg-line-strong')}
                />
              )}
              <input
                key={`${item.id}-${item.text}`}
                defaultValue={item.text}
                maxLength={80}
                disabled={readOnly}
                className={cn(
                  'min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[12.5px] outline-none',
                  item.done ? 'text-ink-3 line-through' : 'text-ink'
                )}
                aria-label="事项内容"
                onBlur={(event) => {
                  const value = event.target.value.trim()
                  if (value && value !== item.text) updateItem(item.id, { text: value.slice(0, 80) })
                  else if (!value) event.target.value = item.text
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
              />
              <button
                type="button"
                aria-label="删除事项"
                className="shrink-0 rounded px-1 text-ink-3 opacity-0 hover:text-danger group-hover:opacity-100"
                disabled={readOnly}
                onClick={() => onItemsChange(block.items.filter((entry) => entry.id !== item.id))}
              >
                ×
              </button>
            </div>
          ))}
          {block.items.length === 0 ? (
            <p className="px-1 py-1 text-[11.5px] text-ink-3">还没有事项，添加「听讲座」「上课」这样的具体事情。</p>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            className="field h-8 text-[12.5px]"
            value={newItem}
            maxLength={80}
            disabled={readOnly}
            placeholder="添加一条事情，回车确认"
            data-testid="new-item"
            onChange={(event) => setNewItem(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addItem()
              }
            }}
          />
          <Button size="sm" onClick={addItem} disabled={readOnly || !newItem.trim()} aria-label="添加事项">
            <Plus size={14} />
          </Button>
        </div>
      </div>

      <label className="block">
        <FieldLabel>备注</FieldLabel>
        <textarea
          className="field min-h-[64px] resize-y text-[12.5px] leading-5"
          value={notes}
          maxLength={2000}
          disabled={readOnly}
          placeholder="地点、材料、注意事项…"
          onChange={(event) => {
            setNotes(event.target.value)
            notesRef.current = event.target.value
            onChange({ notes: event.target.value })
          }}
          onBlur={() => {
            if (notesRef.current === block.notes) return
            onChange({ notes: notesRef.current })
          }}
        />
      </label>

      {variant === 'day' ? (
        <div>
          <FieldLabel>状态</FieldLabel>
          <div className="flex gap-1.5">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={readOnly}
                onClick={() => onChange({ status: option.value })}
                aria-pressed={status === option.value}
                className={cn(
                  'flex-1 rounded-lg border px-2 py-1.5 text-[12px] transition-colors',
                  status === option.value
                    ? 'border-transparent bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]'
                    : 'border-line text-ink-2 hover:border-line-strong'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
