import type { DayOrderApi } from '@shared/api'

declare global {
  interface Window {
    api: DayOrderApi
  }
}

export {}
