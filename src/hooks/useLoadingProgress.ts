import { useEffect, useState } from 'react'

const FINISH_DELAY_MS = 260
const TICK_MIN_MS = 90
const TICK_RANDOM_MS = 180

export function useLoadingProgress(active: boolean) {
  const [isVisible, setIsVisible] = useState(active)
  const [progress, setProgress] = useState(active ? 12 : 100)

  useEffect(() => {
    let timeoutId = 0

    if (!active) {
      timeoutId = window.setTimeout(() => {
        setProgress(100)
        timeoutId = window.setTimeout(() => {
          setIsVisible(false)
        }, FINISH_DELAY_MS)
      }, FINISH_DELAY_MS)

      return () => window.clearTimeout(timeoutId)
    }

    function tick() {
      setProgress((current) => {
        if (current >= 95) return current

        const nextStep = Math.floor(Math.random() * 13) + 4
        return Math.min(95, current + nextStep)
      })

      timeoutId = window.setTimeout(tick, TICK_MIN_MS + Math.random() * TICK_RANDOM_MS)
    }

    timeoutId = window.setTimeout(() => {
      setIsVisible(true)
      setProgress((current) => (current >= 100 ? 12 : Math.max(current, 12)))
      tick()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [active])

  return {
    isVisible,
    progress,
  }
}
