'use client'
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

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
  const nextId = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'ok') => {
    const id = ++nextId.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const border = { ok: 'border-l-[3px] border-l-cc-lit', wn: 'border-l-[3px] border-l-amber-400', er: 'border-l-[3px] border-l-red-500' }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[300]">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`bg-surface border border-border-2 rounded-lg px-4 py-3 font-mono text-xs text-[#d8eedd] shadow-[0_20px_40px_rgba(0,0,0,.5)] animate-slideUp max-w-[360px] ${border[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
