'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { CCUser } from '@/types'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Tableau de bord", sub: "// vue generale et doctrine de pilotage" },
  "/dashboard/apps": { title: "Centre de controle applicatif", sub: "// maintenance, messages publics, redemarrages" },
  "/dashboard/maintenance": { title: "Maintenance", sub: "// statut, planification, retour en ligne" },
  "/dashboard/analytics": { title: "Analytiques", sub: "// metriques et lecture d’usage" },
  "/dashboard/roadmap": { title: "Roadmap", sub: "// backlog, versions, priorites" },
  "/dashboard/signals": { title: "Signaux structurels", sub: "// telemetrie et alertes des apps" },
  "/dashboard/broadcasts": { title: "Broadcasts", sub: "// diffusion de messages vers les apps" },
  "/dashboard/feedbacks": { title: "Remontees utilisateurs", sub: "// feedbacks et bugs des apps clientes" },
  "/dashboard/chantiers": { title: "Suivi chantiers", sub: "// avancement des developpements" },
  "/dashboard/users": { title: "Utilisateurs", sub: "// droits d’acces et roles" },
  "/dashboard/logs": { title: "Journal d’activite", sub: "// tracabilite, audit et securite" },
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
