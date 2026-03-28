'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { CCUser } from '@/types'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Tableau de bord', sub: '// vue générale et doctrine de pilotage' },
  '/dashboard/apps': { title: 'Centre de contrôle applicatif', sub: '// maintenance, messages publics, redémarrages' },
  '/dashboard/maintenance': { title: 'Maintenance', sub: '// statut, planification, retour en ligne' },
  '/dashboard/analytics': { title: 'Analytiques', sub: '// métriques et lecture d’usage' },
  '/dashboard/roadmap': { title: 'Roadmap', sub: '// backlog, versions, priorités' },
  '/dashboard/users': { title: 'Utilisateurs', sub: '// droits d’accès et rôles' },
  '/dashboard/logs': { title: "Journal d'activité", sub: '// traçabilité, audit et sécurité' },
}

export default function Topbar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR'))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const meta = useMemo(() => PAGE_META[pathname] || { title: 'Cactus Codex', sub: '// operational control center' }, [pathname])

  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="tb-title">{meta.title}</div>
        <div className="tb-sub">{meta.sub}</div>
      </div>
      <div className="tb-right">
        <div className="tb-chip">
          <span className="tb-chip-dot" />
          Session sécurisée · {user.role}
        </div>
        <div className="tb-clock">{time}</div>
      </div>
    </header>
  )
}
