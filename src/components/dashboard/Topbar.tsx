'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CCUser } from '@/types'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':             { title: 'Tableau de bord',      sub: '// cactus-codex.com — vue générale' },
  '/dashboard/apps':        { title: 'Applications',          sub: '// gestion des apps déployées' },
  '/dashboard/maintenance': { title: 'Maintenance',           sub: '// statut & planification' },
  '/dashboard/analytics':   { title: 'Analytiques',           sub: '// métriques & performance' },
  '/dashboard/roadmap':     { title: 'Roadmap',               sub: '// planification & backlog' },
  '/dashboard/users':       { title: 'Utilisateurs',          sub: '// accès & permissions' },
  '/dashboard/logs':        { title: "Journal d'activité",    sub: '// sécurité & audit trail' },
}

export default function Topbar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR'))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const meta = PAGE_META[pathname] || { title: 'Dashboard', sub: '// cactus-codex.com' }

  return (
    <>
      <div className="topbar">
        <div className="tb-left">
          <div className="tb-title">{meta.title}</div>
          <div className="tb-sub">{meta.sub}</div>
        </div>
        <div className="tb-right">
          <div className="pill-live">
            <div className="dot-live" />
            LIVE
          </div>
          <div className="tb-clock">{time}</div>
        </div>
      </div>

      <style jsx>{`
        .topbar { padding:15px 26px;border-bottom:1px solid #192b1b;display:flex;align-items:center;justify-content:space-between;background:#060d08;position:sticky;top:0;z-index:50; }
        .tb-left .tb-title { font-family:'Barlow Condensed',sans-serif;font-size:21px;font-weight:800;color:#fff;letter-spacing:.03em;line-height:1; }
        .tb-left .tb-sub { font-family:'DM Mono',monospace;font-size:9.5px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase;margin-top:3px; }
        .tb-right { display:flex;align-items:center;gap:11px; }
        .pill-live { display:flex;align-items:center;gap:6px;background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.13);padding:5px 12px;border-radius:20px;font-family:'DM Mono',monospace;font-size:10px;color:#4ade80;letter-spacing:.1em; }
        .dot-live { width:6px;height:6px;border-radius:50%;background:#4ade80;animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.5)}50%{box-shadow:0 0 0 5px rgba(74,222,128,0)} }
        .tb-clock { font-family:'DM Mono',monospace;font-size:11px;color:#384e3c; }
      `}</style>
    </>
  )
}
