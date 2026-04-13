'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useNotifications } from '@/components/dashboard/DashboardShell'

const NAV = [
  { label: 'Accueil',   icon: '◈', href: '/dashboard' },
  { label: 'Apps',      icon: '⬡', href: '/dashboard/apps' },
  { label: 'CactusOS',  icon: '✦', href: '/dashboard/cactus-os' },
  { label: 'Diffusion', icon: '📢', href: '/dashboard/broadcasts' },
  { label: 'Signaux',   icon: '◉', href: '/dashboard/analytics' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { newFeedbacks } = useNotifications()

  return (
    <nav
      aria-label="Navigation principale"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-[#0a0f0a]/95 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around">
        {NAV.map(item => {
          const active = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          const showBadge = item.href === '/dashboard/apps' && newFeedbacks > 0
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors
                ${active ? 'text-[#4ade80]' : 'text-[#6fa876]'}`}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className="text-lg leading-none"
                style={active ? { filter: 'drop-shadow(0 0 6px rgba(74,222,128,.6))' } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-[9px] font-mono tracking-wider uppercase">
                {item.label}
              </span>
              {showBadge && (
                <span className="absolute top-1.5 right-1/2 translate-x-[14px] min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {newFeedbacks > 9 ? '9+' : newFeedbacks}
                </span>
              )}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-[#4ade80]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
