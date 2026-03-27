'use client'
import { usePathname, useRouter } from 'next/navigation'
import CactusLogo from '@/components/ui/CactusLogo'
import type { CCUser } from '@/types'

type NavItem = {
  label: string
  icon: string
  href: string
  badge?: string
  badgeColor?: string
}

const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Vue générale', items: [
    { label: 'Tableau de bord', icon: '◈', href: '/dashboard' },
  ]},
  { group: 'Applications', items: [
    { label: 'Gestion des apps',  icon: '⬡', href: '/dashboard/apps',        badge: '4' },
    { label: 'Maintenance',       icon: '⚙', href: '/dashboard/maintenance',  badge: '1', badgeColor: 'amber' },
  ]},
  { group: 'Pilotage', items: [
    { label: 'Analytiques', icon: '▲', href: '/dashboard/analytics' },
    { label: 'Roadmap',     icon: '◫', href: '/dashboard/roadmap' },
  ]},
  { group: 'Administration', items: [
    { label: 'Utilisateurs', icon: '◉', href: '/dashboard/users', badge: '4' },
    { label: 'Journaux',     icon: '≡', href: '/dashboard/logs',  badge: '3', badgeColor: 'red' },
  ]},
]

export default function Sidebar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <aside className="sidebar">
        <div className="s-top">
          <CactusLogo size={32} />
          <div className="s-brand">
            <div className="s-name">CACTUS CODEX</div>
            <div className="s-sub">Control Center</div>
          </div>
        </div>

        <nav className="s-nav">
          {NAV.map(group => (
            <div key={group.group} className="nav-group">
              <div className="nav-group-label">{group.group}</div>
              {group.items.map(item => {
                const active = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
                return (
                  <div
                    key={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => router.push(item.href)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`nav-badge ${item.badgeColor || 'green'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="s-user">
          <div className="s-avatar">{initials}</div>
          <div className="s-info">
            <div className="s-uname">{user.name}</div>
            <div className="s-urole">{user.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Déconnexion">⏻</button>
        </div>
      </aside>

      <style jsx>{`
        .sidebar { position:fixed;left:0;top:0;bottom:0;width:228px;background:linear-gradient(180deg,#0a120c 0%,#060d08 100%);border-right:1px solid #192b1b;display:flex;flex-direction:column;z-index:100; }
        .s-top { padding:18px 17px 16px;border-bottom:1px solid #192b1b;display:flex;align-items:center;gap:10px; }
        .s-brand .s-name { font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;color:#4ade80;letter-spacing:.06em;line-height:1; }
        .s-brand .s-sub { font-family:'DM Mono',monospace;font-size:8.5px;color:#384e3c;letter-spacing:.22em;text-transform:uppercase;margin-top:3px; }
        .s-nav { flex:1;padding:13px 9px;overflow-y:auto; }
        .nav-group { margin-bottom:20px; }
        .nav-group-label { font-family:'DM Mono',monospace;font-size:8.5px;color:#384e3c;letter-spacing:.26em;text-transform:uppercase;padding:0 10px;margin-bottom:5px; }
        .nav-item { display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:5px;cursor:pointer;color:#6fa876;font-size:13px;margin-bottom:2px;border:1px solid transparent;transition:all .13s;user-select:none; }
        .nav-item:hover { background:#172019;color:#d8eedd; }
        .nav-item.active { background:rgba(74,222,128,.1);color:#4ade80;border-color:rgba(74,222,128,.14); }
        .nav-icon { font-size:13px;width:15px;text-align:center;flex-shrink:0; }
        .nav-badge { margin-left:auto;font-family:'DM Mono',monospace;font-size:9px;padding:1px 7px;border-radius:20px; }
        .nav-badge.green { background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.18); }
        .nav-badge.amber { background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.18); }
        .nav-badge.red   { background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.18); }
        .s-user { padding:13px 15px;border-top:1px solid #192b1b;display:flex;align-items:center;gap:9px; }
        .s-avatar { width:31px;height:31px;border-radius:50%;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.18);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:12px;color:#4ade80;font-weight:800;flex-shrink:0; }
        .s-info .s-uname { font-size:13px;font-weight:600;color:#d8eedd;line-height:1.2; }
        .s-info .s-urole { font-family:'DM Mono',monospace;font-size:8.5px;color:#384e3c;letter-spacing:.15em;text-transform:uppercase; }
        .logout-btn { margin-left:auto;background:none;border:none;color:#384e3c;cursor:pointer;font-size:15px;padding:4px;border-radius:4px;transition:color .14s,background .14s; }
        .logout-btn:hover { color:#ef4444;background:rgba(239,68,68,.07); }
      `}</style>
    </>
  )
}
