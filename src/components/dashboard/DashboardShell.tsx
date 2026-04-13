'use client'
import { ReactNode, createContext, useContext, useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ToastProvider } from '@/components/ui/Toast'
import { AppProvider } from '@/components/dashboard/AppContext'
import { createClient } from '@/lib/supabase/client'
import CactusOSFloating from '@/components/cactus-os/FloatingButton'

// ── Mobile nav ───────────────────────────────────────────────────
interface MobileNavContextType {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
}

const MobileNavCtx = createContext<MobileNavContextType>({ open: false, setOpen: () => {}, toggle: () => {} })
export function useMobileNav() { return useContext(MobileNavCtx) }

// ── Notifications (badges sidebar) ───────────────────────────────
interface NotificationsContextType {
  newFeedbacks: number
  resetFeedbacks: () => void
}

const NotificationsCtx = createContext<NotificationsContextType>({ newFeedbacks: 0, resetFeedbacks: () => {} })
export function useNotifications() { return useContext(NotificationsCtx) }

function NotificationsProvider({ children }: { children: ReactNode }) {
  const [newFeedbacks, setNewFeedbacks] = useState(0)
  const pathname = usePathname()

  const resetFeedbacks = useCallback(() => setNewFeedbacks(0), [])

  // Auto-reset quand on arrive sur la page feedbacks
  useEffect(() => {
    if (pathname === '/dashboard/feedbacks') setNewFeedbacks(0)
  }, [pathname])

  // Subscribe Realtime aux nouveaux feedbacks
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('sidebar-feedbacks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_feedbacks' }, () => {
        // On incremente le badge uniquement si on n'est pas deja sur la page
        if (window.location.pathname !== '/dashboard/feedbacks') {
          setNewFeedbacks(n => n + 1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <NotificationsCtx.Provider value={{ newFeedbacks, resetFeedbacks }}>
      {children}
    </NotificationsCtx.Provider>
  )
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const toggle = useCallback(() => setOpen(v => !v), [])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <MobileNavCtx.Provider value={{ open, setOpen, toggle }}>
      <AppProvider>
        <ToastProvider>
          <NotificationsProvider>
            {children}
            <CactusOSFloating />
          </NotificationsProvider>
        </ToastProvider>
      </AppProvider>
    </MobileNavCtx.Provider>
  )
}
