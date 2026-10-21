import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MODULE_COLORS } from '@shared/constants'
import type { Module } from '@shared/types'
import { useApp } from '../store/useApp'
import { cn } from '../lib/cn'
import { AVAILABLE_ICONS, ModuleIcon } from '../lib/icons'
import { Button, Modal } from './ui'

export function ModulesDialog(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const dialog = useApp((state) => state.dialog)
  const setDialog = useApp((state) => state.setDialog)
  const updateModule = useApp((state) => state.updateModule)
  const addModule = useApp((state) => state.addModule)
  const deleteModule = useApp((state) => state.deleteModule)

  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Module | null>(null)
  const [reassignTo, setReassignTo] = useState('')

  const open = dialog === 'modules'

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!value) setDialog(null)
        }}
        title="模块管理"
        description="模块决定时间块的颜色与统计口径；删除模块时会把相关时间块迁移到其他模块。"
        width={600}
        footer={
          <Button variant="primary" onClick={() => setDialog(null)}>
            完成
          </Button>
        }
      >
        <div className="flex flex-col gap-1.5">
          {(doc?.modules ?? [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((module) => (
              <div key={module.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-surface-2">
                <label
                  className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-lg"
                  style={{ background: module.color }}
                  title="选择颜色"
                >
                  <input
                    type="color"
                    value={module.color}
                    aria-label={`${module.name} 的颜色`}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(event) => updateModule(module.id, { color: event.target.value })}
                  />
                  <span className="pointer-events-none flex h-full w-full items-center justify-center text-white">
                    <ModuleIcon name={module.icon} size={14} />
                  </span>
                </label>

                <input
                  className="field h-8 w-28 text-[12.5px]"
                  value={module.name}
                  maxLength={12}
                  aria-label="模块名称"
                  onChange={(event) => updateModule(module.id, { name: event.target.value })}
                />

                <select
                  className="field h-8 w-24 text-[12px]"
                  value={module.icon}
                  aria-label="模块图标"
                  onChange={(event) => updateModule(module.id, { icon: event.target.value })}
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <option key={icon.name} value={icon.name}>
                      {icon.label}
                    </option>
                  ))}
                </select>

                <div className="ml-auto flex items-center gap-1">
                  {MODULE_COLORS.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`使用颜色 ${color}`}
                      className={cn(
                        'h-4 w-4 rounded-full border',
                        module.color.toLowerCase() === color.toLowerCase() ? 'border-ink' : 'border-transparent'
                      )}
                      style={{ background: color }}
                      onClick={() => updateModule(module.id, { color })}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  aria-label={`删除模块 ${module.name}`}
                  className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-danger"
                  disabled={(doc?.modules.length ?? 0) <= 1}
                  onClick={() => {
                    setPendingDelete(module)
                    setReassignTo(doc?.modules.find((item) => item.id !== module.id)?.id ?? '')
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <input
            className="field h-8 flex-1 text-[12.5px]"
            value={newName}
            maxLength={12}
            placeholder="新模块名称，如「阅读」"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && newName.trim()) {
                addModule(newName)
                setNewName('')
              }
            }}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!newName.trim()}
            onClick={() => {
              addModule(newName)
              setNewName('')
            }}
          >
            <Plus size={13} /> 添加
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        onOpenChange={(value) => {
          if (!value) setPendingDelete(null)
        }}
        title={`删除模块「${pendingDelete?.name ?? ''}」`}
        description="相关的时间块与模板块会迁移到你选择的模块，不会丢数据。"
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) deleteModule(pendingDelete.id, reassignTo)
                setPendingDelete(null)
              }}
            >
              删除并迁移
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-ink-3">迁移到</span>
          <select className="field h-9" value={reassignTo} onChange={(event) => setReassignTo(event.target.value)}>
            {(doc?.modules ?? [])
              .filter((module) => module.id !== pendingDelete?.id)
              .map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
          </select>
        </label>
      </Modal>
    </>
  )
}
