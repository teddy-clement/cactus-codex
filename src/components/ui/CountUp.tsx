'use client'
import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  duration?: number
  suffix?: string
  className?: string
}

export default function CountUp({ value, duration = 800, suffix = '', className }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>(0)
  const startTime = useRef<number>(0)

  useEffect(() => {
    const from = ref.current
    const to = value
    if (from === to) { setDisplay(to); return }

    startTime.current = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        ref.current = to
      }
    }

    requestAnimationFrame(tick)
  }, [value, duration])

  return <span className={className}>{display}{suffix}</span>
}
