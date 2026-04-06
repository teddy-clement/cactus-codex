'use client'
import { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { AppProvider } from '@/components/dashboard/AppContext'

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>{children}</ToastProvider>
    </AppProvider>
  )
}
