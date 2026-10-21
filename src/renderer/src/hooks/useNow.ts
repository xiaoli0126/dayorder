import { useEffect, useState } from 'react'
import { nowMinutes } from '@shared/time'

/** 每 30 秒更新一次“现在”的分钟数。 */
export function useNowMinutes(active: boolean): number {
  const [minutes, setMinutes] = useState(() => nowMinutes())

  useEffect(() => {
    if (!active) return
    setMinutes(nowMinutes())
    const timer = window.setInterval(() => setMinutes(nowMinutes()), 30_000)
    return () => window.clearInterval(timer)
  }, [active])

  return minutes
}
