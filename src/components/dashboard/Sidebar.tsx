'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { CCUser } from '@/types'

type NavItem = {
  label: string
  icon: string
  href: string
  badge?: string
  badgeColor?: string
}

const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Vue générale', items: [{ label: 'Tableau de bord', icon: '◈', href: '/dashboard' }] },
  {
    group: 'Applications',
    items: [
      { label: 'Gestion des apps', icon: '⬡', href: '/dashboard/apps', badge: 'CTRL' },
      { label: 'Maintenance', icon: '⚙', href: '/dashboard/maintenance', badge: 'LIVE', badgeColor: 'amber' },
    ],
  },
  {
    group: 'Monitoring',
    items: [
      { label: 'Signaux CoTrain', icon: '◉', href: '/dashboard/signals', badge: 'LIVE', badgeColor: 'amber' },
      { label: 'Broadcasts', icon: '📢', href: '/dashboard/broadcasts' },
    ],
  },
  {
    group: 'Pilotage',
    items: [
      { label: 'Analytiques', icon: '▲', href: '/dashboard/analytics' },
      { label: 'Roadmap', icon: '◫', href: '/dashboard/roadmap' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { label: 'Utilisateurs', icon: '◉', href: '/dashboard/users' },
      { label: 'Journaux', icon: '≡', href: '/dashboard/logs' },
    ],
  },
]

export default function Sidebar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = user.name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand-panel">
        <div className="sidebar-brand-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cactus-codex-logo.png" alt="Cactus Codex" width={42} height={42} style={{ objectFit: "contain" }} />
        </div>
        <div className="sidebar-brand-copy">
          <div className="sidebar-brand-title">CACTUS CODEX</div>
          <div className="sidebar-brand-sub">Operational Control Center</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.group} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
              return (
                <button key={item.href} type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={() => router.push(item.href)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className={`nav-badge ${item.badgeColor || 'green'}`}>{item.badge}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-user-panel">
        <div className="s-avatar">{initials}</div>
        <div className="s-info">
          <div className="s-uname">{user.name}</div>
          <div className="s-urole">{user.role}</div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Déconnexion">⏻</button>
      </div>
    </aside>
  )
}
