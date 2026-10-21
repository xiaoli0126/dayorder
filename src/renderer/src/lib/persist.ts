import type { Doc } from '@shared/types'
import { useApp } from '../store/useApp'

let timer: number | undefined
let pending: Doc | null = null
let inFlight = false
let retries = 0

export function scheduleSave(doc: Doc): void {
  pending = doc
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void flushNow()
  }, 450)
}

export async function flushNow(): Promise<void> {
  if (!pending || inFlight) return
  const snapshot = pending
  pending = null
  inFlight = true
  useApp.getState().setSaveState('saving')
  try {
    const result = await window.api.save(snapshot)
    if (result.ok) {
      retries = 0
      useApp.getState().setSaveState('saved', result.data.savedAt)
    } else {
      retries += 1
      useApp.getState().setSaveState('error', null, result.message)
      if (retries <= 2) {
        pending = pending ?? snapshot
        window.setTimeout(() => {
          void flushNow()
        }, 700 * retries)
      } else {
        useApp.getState().setReadOnly(true)
      }
    }
  } catch (error) {
    retries += 1
    useApp.getState().setSaveState('error', null, error instanceof Error ? error.message : String(error))
    if (retries > 2) useApp.getState().setReadOnly(true)
  } finally {
    inFlight = false
  }
}

/** 立即落盘并等待完成（退出前调用）。 */
export async function flushBeforeExit(): Promise<void> {
  window.clearTimeout(timer)
  await flushNow()
}
