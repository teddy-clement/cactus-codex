'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { CCUser } from '@/types'

const PAGE_META: Record<string, string> = {
  "/dashboard": "Cockpit",
  "/dashboard/apps": "Applications",
  "/dashboard/apps/new": "Nouvelle application",
  "/dashboard/maintenance": "Maintenance",
  "/dashboard/analytics": "Signaux",
  "/dashboard/roadmap": "Roadmap",
  "/dashboard/broadcasts": "Broadcasts",
  "/dashboard/chantiers": "Chantiers",
  "/dashboard/users": "Utilisateurs",
  "/dashboard/logs": "Journal",
  "/dashboard/settings": "Réglages",
}

type HealthStatus = 'ok' | 'degraded' | 'unknown'

export default function Topbar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const [time, setTime] = useState('')
  const [health, setHealth] = useState<HealthStatus>('unknown')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR'))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    async function ping() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        const data = await res.json()
        setHealth(data.status === 'ok' ? 'ok' : 'degraded')
      } catch {
        setHealth('degraded')
      }
    }
    ping()
    const id = setInterval(ping, 60000)
    return () => clearInterval(id)
  }, [])

  const title = useMemo(() => {
    // Match dynamique pour /dashboard/apps/[key]
    if (/^\/dashboard\/apps\/[^/]+$/.test(pathname) && pathname !== '/dashboard/apps/new') {
      const key = pathname.split('/').pop() || ''
      return `App · ${key}`
    }
    return PAGE_META[pathname] || 'Cactus Codex'
  }, [pathname])

  const healthColor = health === 'ok' ? '#4ade80' : health === 'degraded' ? '#ef4444' : '#6fa876'
  const healthLabel = health === 'ok' ? 'Opérationnel' : health === 'degraded' ? 'Incident' : '…'

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 md:px-6
                       bg-[#0a0f0a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-lg md:text-xl font-bold text-white truncate tracking-wide">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Health badge */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border"
          style={{ borderColor: healthColor + '40', background: healthColor + '10' }}
          title={`Santé système : ${healthLabel}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: healthColor, boxShadow: `0 0 8px ${healthColor}80` }}
          />
          <span className="hidden sm:inline font-mono text-[10px] tracking-wider uppercase" style={{ color: healthColor }}>
            {healthLabel}
          </span>
        </div>

        {/* Horloge (desktop only) */}
        <div className="hidden md:block font-mono text-xs text-[#729a7c]">{time}</div>

        {/* User chip */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/10 bg-white/5">
          <span className="font-mono text-[10px] text-[#a7d9b6] tracking-wider">{user.role}</span>
        </div>
      </div>
    </header>
  )
}
