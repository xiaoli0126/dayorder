import { useEffect } from 'react'
import { clamp, DAY_MINUTES, MIN_DURATION, nowMinutes, shiftKey, snapTo, todayKey } from '@shared/time'
import { useApp } from '../store/useApp'

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable
}

export function useHotkeys(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const state = useApp.getState()
      if (!state.doc) return
      const mod = event.ctrlKey || event.metaKey
      const typing = isTyping(event.target)

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        state.redo()
        return
      }
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        state.setSearchOpen(true)
        return
      }
      if (event.key === 'Escape') {
        if (state.searchOpen) state.setSearchOpen(false)
        else if (state.dialog) state.setDialog(null)
        else if (state.selectedBlockId) state.selectBlock(null)
        return
      }
      if (typing || mod) return

      switch (event.key) {
        case 'ArrowLeft':
          if (event.altKey && state.selectedBlockId) {
            event.preventDefault()
            const block = state.doc.days[state.dateKey]?.blocks.find((item) => item.id === state.selectedBlockId)
            if (block) {
              const step = event.shiftKey ? 15 : state.doc.settings.snapMinutes
              state.updateBlock(block.id, {
                startMin: clamp(
                  block.startMin - step,
                  0,
                  DAY_MINUTES - block.durationMin
                )
              })
            }
            return
          }
          state.setDate(shiftKey(state.dateKey, -1))
          return
        case 'ArrowRight':
          if (event.altKey && state.selectedBlockId) {
            event.preventDefault()
            const block = state.doc.days[state.dateKey]?.blocks.find((item) => item.id === state.selectedBlockId)
            if (block) {
              const step = event.shiftKey ? 15 : state.doc.settings.snapMinutes
              state.updateBlock(block.id, {
                startMin: clamp(
                  block.startMin + step,
                  0,
                  DAY_MINUTES - block.durationMin
                )
              })
            }
            return
          }
          state.setDate(shiftKey(state.dateKey, 1))
          return
        case 't':
        case 'T':
          state.setDate(todayKey())
          return
        case 'n': {
          if (state.view !== 'day' || state.readOnly) return
          event.preventDefault()
          const settings = state.doc.settings
          const base = nowMinutes()
          const start = clamp(
            snapTo(Math.max(base, settings.dayStartHour * 60), settings.snapMinutes, 'floor'),
            0,
            DAY_MINUTES - 60
          )
          const id = state.createBlock({ startMin: start, durationMin: 60 })
          if (id) state.pushToast('已新建时间块，右侧填写标题与事情')
          return
        }
        case 'Delete':
        case 'Backspace':
          if (state.selectedBlockId && !state.readOnly) {
            event.preventDefault()
            state.deleteBlock(state.selectedBlockId)
          }
          return
        case '/':
          event.preventDefault()
          state.setSearchOpen(true)
          return
        case '?':
          state.pushToast('←/→ 换日 · T 今天 · N 新建 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做 · Ctrl+F 搜索 · Delete 删除')
          return
        case 'Escape':
          return
        default:
          return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

/** 供按钮复用的“新建时间块”逻辑。 */
export function createBlockAtNow(): void {
  const state = useApp.getState()
  if (!state.doc) return
  const settings = state.doc.settings
  const start = clamp(
    snapTo(Math.max(nowMinutes(), settings.dayStartHour * 60), settings.snapMinutes, 'floor'),
    0,
    DAY_MINUTES - 60
  )
  state.createBlock({ startMin: start, durationMin: Math.max(MIN_DURATION, 60) })
}
