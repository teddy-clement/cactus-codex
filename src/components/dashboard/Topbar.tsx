'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useMobileNav } from '@/components/dashboard/DashboardShell'
import AppSelector from '@/components/dashboard/AppSelector'
import type { CCUser } from '@/types'

const PAGE_META: Record<string, { title: string; sub: string; short: string }> = {
  "/dashboard": { title: "Tableau de bord", sub: "// vue generale et doctrine de pilotage", short: "Dashboard" },
  "/dashboard/apps": { title: "Centre de controle applicatif", sub: "// maintenance, messages publics, redemarrages", short: "Apps" },
  "/dashboard/maintenance": { title: "Maintenance", sub: "// statut, planification, retour en ligne", short: "Maintenance" },
  "/dashboard/analytics": { title: "Analytiques", sub: "// metriques et lecture d'usage", short: "Analytiques" },
  "/dashboard/roadmap": { title: "Roadmap", sub: "// backlog, versions, priorites", short: "Roadmap" },
  "/dashboard/signals": { title: "Signaux structurels", sub: "// telemetrie et alertes des apps", short: "Signaux" },
  "/dashboard/broadcasts": { title: "Broadcasts", sub: "// diffusion de messages vers les apps", short: "Broadcasts" },
  "/dashboard/feedbacks": { title: "Remontees utilisateurs", sub: "// feedbacks et bugs des apps clientes", short: "Remontees" },
  "/dashboard/chantiers": { title: "Suivi chantiers", sub: "// avancement des developpements", short: "Chantiers" },
  "/dashboard/users": { title: "Utilisateurs", sub: "// droits d'acces et roles", short: "Users" },
  "/dashboard/logs": { title: "Journal d'activite", sub: "// tracabilite, audit et securite", short: "Logs" },
}

export default function Topbar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const [time, setTime] = useState('')
  const { toggle, open } = useMobileNav()

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR'))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const meta = useMemo(() => PAGE_META[pathname] || { title: 'Cactus Codex', sub: '// operational control center', short: 'Codex' }, [pathname])

  return (
    <header className="topbar">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Hamburger mobile */}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          className="sm:hidden w-10 h-10 rounded-lg border border-[#233428] bg-[#0b130d] text-[#7ebd92] flex items-center justify-center text-xl flex-shrink-0"
        >
          {open ? '✕' : '☰'}
        </button>

        <div className="tb-left min-w-0">
          <div className="tb-title truncate">
            <span className="hidden sm:inline">{meta.title}</span>
            <span className="sm:hidden">{meta.short}</span>
          </div>
          <div className="tb-sub hidden sm:block">{meta.sub}</div>
        </div>
      </div>

      <div className="tb-right flex-shrink-0">
        {/* Selecteur d'app : desktop uniquement (mobile → dans le drawer) */}
        <div className="hidden sm:block">
          <AppSelector />
        </div>
        <div className="tb-chip hidden sm:flex">
          <span className="tb-chip-dot" />
          Session sécurisée · {user.role}
        </div>
        <div className="tb-chip sm:hidden !px-2.5 !py-1.5 !text-[9px]">
          <span className="tb-chip-dot" />
          {user.role}
        </div>
        <div className="tb-clock hidden md:block">{time}</div>
      </div>
    </header>
  )
}
