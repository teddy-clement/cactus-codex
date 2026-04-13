'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/components/dashboard/AppContext'

interface AppSelectorProps {
  className?: string
}

export default function AppSelector({ className = '' }: AppSelectorProps) {
  const { apps, currentApp, selectApp, loading } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer au clic en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (loading || apps.length === 0) return null

  const label = currentApp?.name || 'Sélectionner une app'

  // Une seule app : afficher le nom sans dropdown
  if (apps.length === 1) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#4ade80]/20 bg-[#0f1f0f] ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
        <span className="font-mono text-xs text-[#4ade80] font-semibold">{apps[0].name}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#4ade80]/20 bg-[#0f1f0f] hover:border-[#4ade80]/40 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
        <span className="font-mono text-xs text-[#4ade80] font-semibold truncate max-w-[120px]">{label}</span>
        <span className="text-[#4ade80] text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1.5 min-w-[200px] rounded-md border border-[#4ade80]/30 bg-[#0a120c] shadow-[0_10px_30px_rgba(0,0,0,.6)] overflow-hidden z-[80]"
        >
          {apps.map(app => {
            const active = currentApp?.id === app.id
            return (
              <button
                key={app.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { if (app.app_key) selectApp(app.app_key); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${active ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'text-[#d8eedd] hover:bg-[#4ade80]/5'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#4ade80]' : 'bg-[#2d6b45]'}`} />
                <span className="font-mono text-xs truncate flex-1">{app.name}</span>
                <span className="font-mono text-[9px] text-[#6fa876] uppercase">{app.env}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
