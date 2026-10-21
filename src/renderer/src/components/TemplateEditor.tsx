import { useMemo } from 'react'
import { Check, Copy, LayoutTemplate, Plus, Trash2 } from 'lucide-react'
import { newId } from '@shared/ids'
import { formatDuration } from '@shared/time'
import { templatePreview } from '@shared/template'
import { useApp } from '../store/useApp'
import { cn } from '../lib/cn'
import { BlockEditor } from './BlockEditor'
import { Button, IconButton } from './ui'
import { Timeline } from './Timeline'

export function TemplateEditor(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const editingId = useApp((state) => state.editingTemplateId)
  const selectedBlockId = useApp((state) => state.selectedBlockId)
  const readOnly = useApp((state) => state.readOnly)
  const setEditingTemplate = useApp((state) => state.setEditingTemplate)
  const selectBlock = useApp((state) => state.selectBlock)
  const createTemplate = useApp((state) => state.createTemplate)
  const updateTemplate = useApp((state) => state.updateTemplate)
  const duplicateTemplate = useApp((state) => state.duplicateTemplate)
  const deleteTemplate = useApp((state) => state.deleteTemplate)
  const setDefaultTemplate = useApp((state) => state.setDefaultTemplate)
  const addTemplateBlock = useApp((state) => state.addTemplateBlock)
  const updateTemplateBlock = useApp((state) => state.updateTemplateBlock)
  const setTemplateItems = useApp((state) => state.setTemplateItems)
  const removeTemplateBlock = useApp((state) => state.removeTemplateBlock)
  const openApplyTemplate = useApp((state) => state.openApplyTemplate)
  const pushToast = useApp((state) => state.pushToast)

  const templates = useMemo(
    () =>
      (doc?.templates ?? [])
        .slice()
        .sort((a, b) => (a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1)),
    [doc?.templates]
  )
  const active = templates.find((template) => template.id === editingId) ?? templates[0] ?? null

  if (!doc) return <div />

  if (!active) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-[360px] rounded-2xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-1)]">
          <LayoutTemplate size={22} className="mx-auto text-ink-3" />
          <h2 className="mt-3 text-[15px] font-semibold text-ink">还没有模板</h2>
          <p className="mt-1 text-[12px] leading-5 text-ink-2">
            模板是「一天的骨架」：一组时间块 + 模块 + 具体事情。建一个「上课日」，以后每天都能一键铺开。
          </p>
          <Button variant="primary" className="mt-4 w-full" onClick={() => createTemplate('上课日')}>
            <Plus size={14} /> 新建模板
          </Button>
        </div>
      </div>
    )
  }

  const preview = templatePreview(active)
  const selectedBlock = active.blocks.find((block) => block.id === selectedBlockId)

  const addBlock = (): void => {
    const moduleId = doc.settings.lastModuleId ?? doc.modules[0]?.id
    if (!moduleId) return
    const id = newId('tb')
    addTemplateBlock(active.id, {
      id,
      startMin: 480,
      durationMin: 60,
      moduleId,
      title: '',
      items: [],
      notes: ''
    })
    selectBlock(id)
    pushToast('已添加时间块，可在右侧填写内容')
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[220px] shrink-0 flex-col border-r border-line bg-bg">
        <div className="flex h-[58px] items-center justify-between border-b border-line px-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">模板</span>
          <IconButton label="新建模板" onClick={() => createTemplate()} disabled={readOnly}>
            <Plus size={15} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setEditingTemplate(template.id)
                selectBlock(null)
              }}
              className={cn(
                'mb-1 w-full rounded-xl border px-3 py-2 text-left transition-colors',
                template.id === active.id
                  ? 'border-[var(--accent)] bg-surface'
                  : 'border-transparent hover:bg-surface-2'
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[12.5px] font-medium text-ink">{template.name}</span>
                {template.isDefault ? (
                  <span className="shrink-0 rounded bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-1 text-[9.5px] text-[var(--accent)]">
                    默认
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[10.5px] text-ink-3">
                {template.blocks.length} 块 · {formatDuration(template.blocks.reduce((sum, block) => sum + block.durationMin, 0))}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-line py-2 text-[11.5px] text-ink-3 hover:border-line-strong hover:text-ink"
            onClick={() => createTemplate()}
            disabled={readOnly}
          >
            <Plus size={12} /> 新建模板
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-line px-4">
          <div className="min-w-0 flex-1">
            <input
              className="w-full border-0 bg-transparent text-[17px] font-semibold tracking-tight text-ink outline-none"
              value={active.name}
              maxLength={30}
              placeholder="模板名称"
              aria-label="模板名称"
              disabled={readOnly}
              onChange={(event) => updateTemplate(active.id, { name: event.target.value })}
            />
            <div className="flex items-center gap-2 text-[11px] text-ink-3">
              <span>{preview.blockCount} 块</span>
              <span>·</span>
              <span>{formatDuration(preview.totalMinutes)}</span>
              <span>·</span>
              <span>{preview.moduleIds.length} 个模块</span>
            </div>
          </div>
          <Button
            size="sm"
            variant={active.isDefault ? 'soft' : 'outline'}
            onClick={() => setDefaultTemplate(active.id)}
            disabled={readOnly || active.isDefault}
          >
            <Check size={13} /> {active.isDefault ? '默认模板' : '设为默认'}
          </Button>
          <IconButton label="复制模板" onClick={() => duplicateTemplate(active.id)} disabled={readOnly}>
            <Copy size={14} />
          </IconButton>
          <IconButton label="删除模板" onClick={() => deleteTemplate(active.id)} disabled={readOnly}>
            <Trash2 size={14} />
          </IconButton>
          <Button size="sm" variant="primary" onClick={() => openApplyTemplate(active.id)} disabled={readOnly}>
            应用模板
          </Button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1">
            <Timeline
              blocks={active.blocks}
              modules={doc.modules}
              mode="template"
              hourHeight={doc.settings.hourHeight}
              snapMinutes={doc.settings.snapMinutes}
              showNowLine={false}
              nowMinute={0}
              selectedId={selectedBlockId}
              startHour={doc.settings.dayStartHour}
              readOnly={readOnly}
              onSelect={selectBlock}
              onCreate={(startMin, durationMin) => {
                const moduleId = doc.settings.lastModuleId ?? doc.modules[0]?.id
                if (!moduleId) return
                const id = newId('tb')
                addTemplateBlock(active.id, { id, startMin, durationMin, moduleId, title: '', items: [], notes: '' })
                selectBlock(id)
              }}
              onChange={(id, patch) => updateTemplateBlock(active.id, id, patch)}
            />
          </div>

          <div className="flex w-[300px] shrink-0 flex-col border-l border-line bg-surface">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                {selectedBlock ? '模板时间块' : '模板说明'}
              </span>
              {selectedBlock ? (
                <button type="button" className="soft-btn h-7 text-[11.5px]" onClick={() => selectBlock(null)}>
                  关闭
                </button>
              ) : null}
            </div>

            {selectedBlock ? (
              <BlockEditor
                key={selectedBlock.id}
                block={selectedBlock}
                modules={doc.modules}
                variant="template"
                readOnly={readOnly}
                onChange={(patch) => updateTemplateBlock(active.id, selectedBlock.id, patch)}
                onItemsChange={(items) => setTemplateItems(active.id, selectedBlock.id, items)}
                onDelete={() => {
                  removeTemplateBlock(active.id, selectedBlock.id)
                  selectBlock(null)
                }}
              />
            ) : (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-3">说明</span>
                  <textarea
                    className="field min-h-[72px] resize-y text-[12.5px] leading-5"
                    value={active.description}
                    maxLength={200}
                    placeholder="何时用这个模板，比如「有课的平日」"
                    disabled={readOnly}
                    onChange={(event) => updateTemplate(active.id, { description: event.target.value })}
                  />
                </label>

                <div className="rounded-xl bg-surface-2 px-3 py-3 text-[12px] leading-6 text-ink-2">
                  <p className="font-medium text-ink">怎么用模板</p>
                  <p className="mt-1">在左侧时间轴上按住拖出时间段，或点下方按钮添加；每个块可以挂多件具体事情。</p>
                  <p className="mt-1">模板保存的是结构，不保存完成状态；应用时会重新生成时间块。</p>
                </div>

                <Button variant="outline" onClick={addBlock} disabled={readOnly}>
                  <Plus size={14} /> 添加时间块
                </Button>

                <div className="mt-auto text-[11px] text-ink-3">
                  {preview.blockCount} 个时间块 · 共 {formatDuration(preview.totalMinutes)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
