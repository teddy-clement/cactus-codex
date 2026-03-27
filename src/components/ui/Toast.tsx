'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'ok' | 'wn' | 'er'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const showToast = useCallback((message: string, type: ToastType = 'ok') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3600)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
      <style jsx>{`
        .toast-container { position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;gap:8px;z-index:300; }
        .toast { background:#111a12;border:1px solid #233428;border-radius:9px;padding:12px 17px;font-family:'DM Mono',monospace;font-size:12px;color:#d8eedd;box-shadow:0 20px 40px rgba(0,0,0,.5);animation:slideUp .3s cubic-bezier(.22,.68,0,1.2) both;max-width:360px; }
        .toast-ok { border-left:3px solid #4ade80; }
        .toast-wn { border-left:3px solid #f59e0b; }
        .toast-er { border-left:3px solid #ef4444; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
