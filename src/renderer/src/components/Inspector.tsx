import { useState } from 'react'
import { ArrowRight, LayoutTemplate, Sparkles } from 'lucide-react'
import { dayTitle, formatDuration, formatDurationCompact } from '@shared/time'
import { moduleTotals, summarizeDay } from '@shared/stats'
import { useApp } from '../store/useApp'
import { BlockEditor } from './BlockEditor'
import { Button, Modal, ProgressRing } from './ui'

function DaySummaryPanel(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const dateKey = useApp((state) => state.dateKey)
  const setDayNote = useApp((state) => state.setDayNote)
  const saveDayAsTemplate = useApp((state) => state.saveDayAsTemplate)
  const openApplyTemplate = useApp((state) => state.openApplyTemplate)
  const readOnly = useApp((state) => state.readOnly)
  const [templateName, setTemplateName] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  if (!doc) return <div />
  const day = doc.days[dateKey]
  const summary = summarizeDay(day)
  const totals = moduleTotals(day, doc.modules)
  const maxMinutes = totals[0]?.minutes ?? 0

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-4">
      <div>
        <div className="flex items-center gap-3">
          <ProgressRing value={summary.completion} size={52} stroke={5} />
          <div className="min-w-0">
            <div className="text-[12px] text-ink-3">{dayTitle(dateKey)}</div>
            <div className="mt-0.5 text-[15px] font-semibold text-ink">
              {summary.blockCount === 0 ? '还没有安排' : `完成 ${summary.doneItems}/${summary.totalItems} 项`}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <div className="text-[10.5px] text-ink-3">计划</div>
            <div className="mt-0.5 text-[13px] font-medium tabular-nums text-ink">
              {formatDurationCompact(summary.plannedMin)}
            </div>
          </div>
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <div className="text-[10.5px] text-ink-3">完成</div>
            <div className="mt-0.5 text-[13px] font-medium tabular-nums text-ink">
              {formatDurationCompact(summary.doneMin)}
            </div>
          </div>
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <div className="text-[10.5px] text-ink-3">时间块</div>
            <div className="mt-0.5 text-[13px] font-medium tabular-nums text-ink">{summary.blockCount}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-3">模块分布</span>
          <span className="text-[10.5px] text-ink-3">{totals.length} 个模块</span>
        </div>
        {totals.length === 0 ? (
          <p className="text-[12px] leading-5 text-ink-3">安排时间块后，这里会显示各模块的投入时长。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {totals.map((item) => (
              <div key={item.moduleId}>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span className="tabular-nums text-ink-3">{formatDuration(item.minutes)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${maxMinutes ? Math.max(4, (item.minutes / maxMinutes) * 100) : 0}%`,
                      background: item.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium text-ink-3">今日备注</div>
        <textarea
          className="field min-h-[72px] resize-y text-[12.5px] leading-5"
          value={day?.note ?? ''}
          maxLength={2000}
          placeholder="今天想记下的一句话…"
          disabled={readOnly}
          onChange={(event) => setDayNote(event.target.value)}
        />
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
        <Button variant="primary" onClick={() => openApplyTemplate(null)} disabled={readOnly}>
          <LayoutTemplate size={14} /> 从模板开始
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTemplateName(`${dayTitle(dateKey)} 模板`)
            setSaveOpen(true)
          }}
          disabled={readOnly || summary.blockCount === 0}
        >
          <Sparkles size={14} /> 存为模板
        </Button>
      </div>

      <Modal
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="存为模板"
        description="把这一天的模块、标题与事项保存成可复用的模板。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                saveDayAsTemplate(templateName)
                setSaveOpen(false)
              }}
            >
              保存
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-ink-3">模板名称</span>
          <input
            className="field"
            value={templateName}
            maxLength={30}
            autoFocus
            onChange={(event) => setTemplateName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && templateName.trim()) {
                saveDayAsTemplate(templateName)
                setSaveOpen(false)
              }
            }}
          />
        </label>
      </Modal>
    </div>
  )
}

export function Inspector(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const dateKey = useApp((state) => state.dateKey)
  const selectedId = useApp((state) => state.selectedBlockId)
  const readOnly = useApp((state) => state.readOnly)
  const selectBlock = useApp((state) => state.selectBlock)
  const updateBlock = useApp((state) => state.updateBlock)
  const setBlockItems = useApp((state) => state.setBlockItems)
  const deleteBlock = useApp((state) => state.deleteBlock)
  const duplicateBlock = useApp((state) => state.duplicateBlock)

  const block = doc?.days[dateKey]?.blocks.find((item) => item.id === selectedId)

  return (
    <aside className="flex w-[328px] shrink-0 flex-col border-l border-line bg-surface" data-testid="inspector">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-3">
          {block ? '时间块' : '概览'}
        </span>
        {block ? (
          <button type="button" className="soft-btn h-7 text-[11.5px]" onClick={() => selectBlock(null)}>
            关闭 <ArrowRight size={12} />
          </button>
        ) : null}
      </div>

      {block && doc ? (
        <BlockEditor
          key={block.id}
          block={block}
          modules={doc.modules}
          variant="day"
          readOnly={readOnly}
          onChange={(patch) => updateBlock(block.id, patch)}
          onItemsChange={(items) => setBlockItems(block.id, items)}
          onDelete={() => deleteBlock(block.id)}
          onDuplicate={() => duplicateBlock(block.id)}
        />
      ) : (
        <DaySummaryPanel />
      )}
    </aside>
  )
}
