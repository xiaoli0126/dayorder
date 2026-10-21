import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { dayTitle, formatRange } from '@shared/time'
import { useApp } from '../store/useApp'
import { ModuleIcon } from '../lib/icons'

interface SearchHit {
  date: string
  blockId: string
  title: string
  itemText?: string
  note?: string
  startMin: number
  durationMin: number
  moduleId: string
}

export function SearchPalette(): React.JSX.Element | null {
  const open = useApp((state) => state.searchOpen)
  const doc = useApp((state) => state.doc)
  const setSearchOpen = useApp((state) => state.setSearchOpen)
  const setDate = useApp((state) => state.setDate)
  const selectBlock = useApp((state) => state.selectBlock)

  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const hits = useMemo<SearchHit[]>(() => {
    if (!doc) return []
    const keyword = query.trim().toLowerCase()
    if (!keyword) return []
    const results: SearchHit[] = []
    for (const day of Object.values(doc.days)) {
      for (const block of day.blocks) {
        const title = block.title || doc.modules.find((module) => module.id === block.moduleId)?.name || '时间块'
        if (title.toLowerCase().includes(keyword)) {
          results.push({
            date: day.date,
            blockId: block.id,
            title,
            startMin: block.startMin,
            durationMin: block.durationMin,
            moduleId: block.moduleId
          })
          continue
        }
        const item = block.items.find((entry) => entry.text.toLowerCase().includes(keyword))
        if (item) {
          results.push({
            date: day.date,
            blockId: block.id,
            title,
            itemText: item.text,
            startMin: block.startMin,
            durationMin: block.durationMin,
            moduleId: block.moduleId
          })
          continue
        }
        if (block.notes.toLowerCase().includes(keyword)) {
          results.push({
            date: day.date,
            blockId: block.id,
            title,
            note: block.notes,
            startMin: block.startMin,
            durationMin: block.durationMin,
            moduleId: block.moduleId
          })
        }
      }
    }
    return results
      .sort((a, b) => b.date.localeCompare(a.date) || a.startMin - b.startMin)
      .slice(0, 40)
  }, [doc, query])

  useEffect(() => {
    setIndex(0)
  }, [query])

  if (!open || !doc) return null

  const jump = (hit: SearchHit): void => {
    setDate(hit.date)
    selectBlock(hit.blockId)
    setSearchOpen(false)
  }

  const moduleMap = new Map(doc.modules.map((module) => [module.id, module]))

  return (
    <div
      className="fixed inset-0 z-[58] bg-black/25 backdrop-blur-[2px]"
      onMouseDown={() => setSearchOpen(false)}
    >
      <div
        className="dialog-card mx-auto mt-[9vh] w-[min(660px,calc(100vw-48px))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-2)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={15} className="text-ink-3" />
          <input
            ref={inputRef}
            className="h-12 flex-1 border-0 bg-transparent text-[13.5px] outline-none placeholder:text-ink-3"
            placeholder="搜索标题、具体事情或备注…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchOpen(false)
              } else if (event.key === 'ArrowDown') {
                event.preventDefault()
                setIndex((value) => Math.min(value + 1, Math.max(0, hits.length - 1)))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setIndex((value) => Math.max(0, value - 1))
              } else if (event.key === 'Enter' && hits[index]) {
                event.preventDefault()
                jump(hits[index])
              }
            }}
          />
          <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-3">Esc</span>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-1">
          {query.trim() === '' ? (
            <p className="px-4 py-6 text-center text-[12px] text-ink-3">输入关键词，跨天查找写过的事情。</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-ink-3">没有匹配结果。</p>
          ) : (
            hits.map((hit, position) => {
              const module = moduleMap.get(hit.moduleId)
              return (
                <button
                  key={`${hit.date}-${hit.blockId}`}
                  type="button"
                  data-active={position === index}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors data-[active=true]:bg-surface-2 hover:bg-surface-2"
                  onMouseEnter={() => setIndex(position)}
                  onClick={() => jump(hit)}
                >
                  <span style={{ color: module?.color }} className="shrink-0">
                    <ModuleIcon name={module?.icon ?? 'ellipsis'} size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[13px] text-ink">{hit.itemText ?? hit.title}</span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-ink-3">
                        {formatRange(hit.startMin, hit.durationMin)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-3">
                      <span>{dayTitle(hit.date)}</span>
                      {hit.itemText ? <span className="truncate">在「{hit.title}」中</span> : null}
                      {hit.note ? <span className="truncate">{hit.note.slice(0, 40)}</span> : null}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[10.5px] text-ink-3">
          <span>↑↓ 选择</span>
          <span>Enter 跳转</span>
          <span className="ml-auto">{hits.length} 条结果</span>
        </div>
      </div>
    </div>
  )
}
