import { newId } from './ids'
import type { ApplyPolicy, ApplyTemplateResult, Block, Day, Template, TemplateBlock } from './types'

function cloneItems(block: TemplateBlock) {
  return block.items.map((item) => ({ ...item, id: newId('i'), done: false }))
}

/**
 * 把模板实例化成某一天的块。
 * merge：保留现有块，跳过与现有块重叠的模板块；
 * replace：整体替换（调用方负责二次确认）。
 */
export function instantiateTemplate(
  template: Template,
  policy: ApplyPolicy,
  existingBlocks: Block[],
  now: string = new Date().toISOString()
): ApplyTemplateResult {
  const copies: Block[] = template.blocks.map((block) => ({
    id: newId('b'),
    startMin: block.startMin,
    durationMin: block.durationMin,
    moduleId: block.moduleId,
    title: block.title,
    items: cloneItems(block),
    notes: block.notes,
    status: 'planned',
    sourceTemplateId: template.id,
    createdAt: now,
    updatedAt: now
  }))

  if (policy === 'replace') {
    return { blocks: copies, added: copies.length, skipped: 0, replaced: existingBlocks.length }
  }

  const kept: Block[] = [...existingBlocks]
  const added: Block[] = []
  let skipped = 0

  for (const copy of copies) {
    const conflict = kept.some((existing) => {
      return (
        copy.startMin < existing.startMin + existing.durationMin &&
        existing.startMin < copy.startMin + copy.durationMin
      )
    })
    if (conflict) {
      skipped += 1
    } else {
      kept.push(copy)
      added.push(copy)
    }
  }

  return { blocks: kept, added: added.length, skipped, replaced: 0 }
}

/** 把某天保存成模板：保留模块、标题、事项与备注，重置完成状态。 */
export function dayToTemplate(day: Day, name: string, now: string = new Date().toISOString()): Template {
  return {
    id: newId('t'),
    name,
    description: '',
    isDefault: false,
    useCount: 0,
    lastUsedAt: null,
    blocks: day.blocks.map((block) => ({
      id: newId('tb'),
      startMin: block.startMin,
      durationMin: block.durationMin,
      moduleId: block.moduleId,
      title: block.title,
      items: block.items.map((item) => ({ ...item, id: newId('i'), done: false })),
      notes: block.notes
    })),
    createdAt: now,
    updatedAt: now
  }
}

export function templatePreview(template: Template): {
  blockCount: number
  totalMinutes: number
  moduleIds: string[]
} {
  return {
    blockCount: template.blocks.length,
    totalMinutes: template.blocks.reduce((sum, block) => sum + block.durationMin, 0),
    moduleIds: Array.from(new Set(template.blocks.map((block) => block.moduleId)))
  }
}
