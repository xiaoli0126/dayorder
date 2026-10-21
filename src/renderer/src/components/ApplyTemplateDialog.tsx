import { useMemo, useState } from 'react'
import { CalendarDays, Layers } from 'lucide-react'
import { formatDuration, isTodayKey } from '@shared/time'
import { instantiateTemplate, templatePreview } from '@shared/template'
import type { ApplyPolicy } from '@shared/types'
import { useApp } from '../store/useApp'
import { cn } from '../lib/cn'
import { Button, Modal } from './ui'

export function ApplyTemplateDialog(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const dialog = useApp((state) => state.dialog)
  const initialTemplateId = useApp((state) => state.applyTemplateId)
  const dateKey = useApp((state) => state.dateKey)
  const setDialog = useApp((state) => state.setDialog)
  const applyTemplate = useApp((state) => state.applyTemplate)
  const readOnly = useApp((state) => state.readOnly)

  const [templateId, setTemplateId] = useState(initialTemplateId ?? doc?.templates[0]?.id ?? '')
  const [targetDate, setTargetDate] = useState(dateKey)
  const [policy, setPolicy] = useState<ApplyPolicy>('merge')

  const template = doc?.templates.find((item) => item.id === templateId)
  const existing = doc?.days[targetDate]?.blocks ?? []
  const preview = template ? templatePreview(template) : null
  const mergeResult = useMemo(
    () => (template ? instantiateTemplate(template, 'merge', existing) : null),
    [template, existing.length, targetDate]
  )

  const open = dialog === 'apply-template'

  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!value) setDialog(null)
      }}
      title="从模板开始"
      description="选择一个模板和日期，再把结构应用到这一天。"
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDialog(null)}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={!template || readOnly || !templateId}
            onClick={() => applyTemplate(templateId, targetDate, policy)}
            data-testid="apply-template-confirm"
          >
            应用到这一天
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-3">模板</span>
            <select
              className="field h-9"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              data-testid="template-select"
            >
              {(doc?.templates ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-3">日期</span>
            <input
              type="date"
              className="field h-9 tabular-nums"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              data-testid="template-date"
            />
          </label>
        </div>

        {preview ? (
          <div className="flex items-center gap-4 rounded-xl bg-surface-2 px-3 py-2.5 text-[12px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <Layers size={13} /> {preview.blockCount} 个时间块
            </span>
            <span>{formatDuration(preview.totalMinutes)}</span>
            <span>{preview.moduleIds.length} 个模块</span>
            <span className="ml-auto flex items-center gap-1 text-ink-3">
              <CalendarDays size={12} />
              {isTodayKey(targetDate) ? '今天' : targetDate}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPolicy('merge')}
            aria-pressed={policy === 'merge'}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left transition-colors',
              policy === 'merge' ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_7%,transparent)]' : 'border-line hover:border-line-strong'
            )}
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <span
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                  policy === 'merge' ? 'border-[var(--accent)]' : 'border-line-strong'
                )}
              >
                {policy === 'merge' ? <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> : null}
              </span>
              仅补空缺
            </span>
            <span className="mt-1 block pl-5 text-[11.5px] leading-5 text-ink-2">
              {existing.length === 0
                ? '当天还没有时间块，将全部添加。'
                : `保留当天现有 ${existing.length} 个时间块，跳过与它们重叠的 ${mergeResult?.skipped ?? 0} 个。`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPolicy('replace')}
            aria-pressed={policy === 'replace'}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left transition-colors',
              policy === 'replace' ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_7%,transparent)]' : 'border-line hover:border-line-strong'
            )}
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <span
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                  policy === 'replace' ? 'border-[var(--accent)]' : 'border-line-strong'
                )}
              >
                {policy === 'replace' ? <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> : null}
              </span>
              覆盖当天
            </span>
            <span className="mt-1 block pl-5 text-[11.5px] leading-5 text-ink-2">
              清空当天现有 {existing.length} 个时间块后再应用（可撤销）。
            </span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
