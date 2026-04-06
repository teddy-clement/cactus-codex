'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { App } from '@/types'

interface AppContextType {
  apps: App[]
  currentApp: App | null
  selectApp: (appKey: string) => void
  loading: boolean
}

const AppCtx = createContext<AppContextType>({ apps: [], currentApp: null, selectApp: () => {}, loading: true })

const STORAGE_KEY = 'cc_selected_app'

export function AppProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<App[]>([])
  const [currentApp, setCurrentApp] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/apps')
      .then(r => r.json())
      .then((data: App[]) => {
        const list = Array.isArray(data) ? data : []
        setApps(list)
        const savedKey = localStorage.getItem(STORAGE_KEY)
        const saved = savedKey ? list.find(a => a.app_key === savedKey) : null
        setCurrentApp(saved || list[0] || null)
      })
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  const selectApp = useCallback((appKey: string) => {
    const found = apps.find(a => a.app_key === appKey)
    if (found) {
      setCurrentApp(found)
      localStorage.setItem(STORAGE_KEY, appKey)
    }
  }, [apps])

  return (
    <AppCtx.Provider value={{ apps, currentApp, selectApp, loading }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  return useContext(AppCtx)
}
