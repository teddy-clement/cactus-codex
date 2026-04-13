'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useMobileNav, useNotifications } from '@/components/dashboard/DashboardShell'
import AppSelector from '@/components/dashboard/AppSelector'
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
      { label: 'Signaux structurels', icon: '◉', href: '/dashboard/signals', badge: 'LIVE', badgeColor: 'amber' },
      { label: 'Broadcasts', icon: '📢', href: '/dashboard/broadcasts' },
    ],
  },
  {
    group: 'Pilotage',
    items: [
      { label: 'Analytiques', icon: '▲', href: '/dashboard/analytics' },
      { label: 'Chantiers', icon: '◧', href: '/dashboard/chantiers' },
      { label: 'Roadmap', icon: '◫', href: '/dashboard/roadmap' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { label: 'Remontées', icon: '◈', href: '/dashboard/feedbacks' },
      { label: 'Utilisateurs', icon: '◉', href: '/dashboard/users' },
      { label: 'Journaux', icon: '≡', href: '/dashboard/logs' },
    ],
  },
]

export default function Sidebar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { open, setOpen } = useMobileNav()
  const { newFeedbacks } = useNotifications()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = user.name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)

  const content = (
    <>
      <div className="sidebar-brand-panel">
        <div className="sidebar-brand-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoseulblanc-cactuscodex.png" alt="Cactus Codex" width={42} height={42} style={{ objectFit: "contain" }} />
        </div>
        <div className="sidebar-brand-copy">
          <div className="sidebar-brand-title">CACTUS CODEX</div>
          <div className="sidebar-brand-sub">Operational Control Center</div>
        </div>
      </div>

      {/* Selecteur d'app : visible uniquement sur mobile (desktop → Topbar) */}
      <div className="sm:hidden px-4 py-3 border-b border-[rgba(38,60,43,.9)]">
        <AppSelector className="w-full" />
      </div>

      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.group} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
              const showFeedbackBadge = item.href === '/dashboard/feedbacks' && newFeedbacks > 0
              return (
                <button key={item.href} type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={() => router.push(item.href)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {showFeedbackBadge ? (
                    <span className="nav-badge red">{newFeedbacks > 9 ? '9+' : newFeedbacks}</span>
                  ) : item.badge ? (
                    <span className={`nav-badge ${item.badgeColor || 'green'}`}>{item.badge}</span>
                  ) : null}
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
    </>
  )

  return (
    <>
      {/* ── Desktop : sidebar fixe ≥ 640px ── */}
      <aside className="sidebar hidden sm:flex">{content}</aside>

      {/* ── Mobile : overlay + drawer < 640px ── */}
      <div
        className={`fixed inset-0 z-[90] bg-black/70 transition-opacity duration-200 sm:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`sidebar sm:hidden fixed top-0 left-0 bottom-0 w-[280px] z-[100] transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
      >
        {content}
      </aside>
    </>
  )
}
