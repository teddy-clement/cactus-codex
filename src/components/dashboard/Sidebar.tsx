'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useNotifications } from '@/components/dashboard/DashboardShell'
import type { CCUser } from '@/types'

type NavItem = { label: string; icon: string; href: string }

const NAV: NavItem[] = [
  { label: 'Accueil',    icon: '◈', href: '/dashboard' },
  { label: 'Apps',       icon: '⬡', href: '/dashboard/apps' },
  { label: 'Broadcasts', icon: '📢', href: '/dashboard/broadcasts' },
  { label: 'Signaux',    icon: '◉', href: '/dashboard/analytics' },
  { label: 'Logs',       icon: '≡', href: '/dashboard/logs' },
  { label: 'Réglages',   icon: '⚙', href: '/dashboard/settings' },
]

export default function Sidebar({ user }: { user: CCUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { newFeedbacks } = useNotifications()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = user.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside
      className="hidden md:flex fixed top-0 left-0 bottom-0 z-40 group flex-col
                 w-16 hover:w-[220px] transition-[width] duration-200
                 bg-[#060b07]/95 backdrop-blur-xl border-r border-white/5
                 overflow-hidden"
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: 'radial-gradient(circle at 30% 20%, rgba(74,222,128,.2), transparent 60%), #0c1610', border: '1px solid rgba(74,222,128,.2)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoseulblanc-cactuscodex.png" alt="Codex" width={22} height={22} className="object-contain" />
        </div>
        <div className="font-mono text-xs text-white tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          CODEX
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
        {NAV.map(item => {
          const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          const showBadge = item.href === '/dashboard/feedbacks' && newFeedbacks > 0
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all relative
                ${active
                  ? 'bg-[#1a4a2e] text-[#4ade80]'
                  : 'text-[#6fa876] hover:bg-white/5 hover:text-white'}`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#4ade80] rounded-r" />}
              <span className="w-5 text-center text-base flex-shrink-0">{item.icon}</span>
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {item.label}
              </span>
              {showBadge && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {newFeedbacks > 9 ? '9+' : newFeedbacks}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── User panel ── */}
      <div className="px-2 py-3 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold font-display"
               style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', color: '#c8f3d4' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="text-xs font-semibold text-white truncate">{user.name}</div>
            <div className="font-mono text-[9px] text-[#6fa876] tracking-wider">{user.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-7 h-7 rounded-md border border-white/10 bg-white/5 text-[#7ebd92] hover:text-white hover:bg-white/10 flex items-center justify-center"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}
