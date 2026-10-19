import { useEffect, useState } from 'react'

const DEFAULT_TICK_MS = 60_000

/** Advances `nowMs` on an interval so live parking estimates refresh without reload. */
export function useLiveParkingClock(tickMs: number = DEFAULT_TICK_MS): number {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), tickMs)
    return () => window.clearInterval(id)
  }, [tickMs])

  return nowMs
}
