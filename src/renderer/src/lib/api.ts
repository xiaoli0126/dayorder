import type { IpcResult } from '@shared/types'

export function api() {
  return window.api
}

export async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.message)
  return result.data
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
