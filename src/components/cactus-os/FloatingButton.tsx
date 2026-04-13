'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import CactusOSChat from './Chat'

export default function CactusOSFloating() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Fermer le panel a chaque changement de route
  useEffect(() => { setOpen(false) }, [pathname])

  // Ne pas afficher le bouton flottant sur la page dediee
  if (pathname === '/dashboard/cactus-os') return null

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir CactusOS"
        className={`fixed z-40 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all
          ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100 hover:scale-110'}`}
        style={{
          right: 'max(env(safe-area-inset-right, 0px) + 20px, 20px)',
          bottom: 'max(env(safe-area-inset-bottom, 0px) + 88px, 88px)',
          background: 'radial-gradient(circle at 30% 20%, rgba(74,222,128,.4), transparent 60%), #0c1610',
          border: '1px solid rgba(74,222,128,.5)',
          boxShadow: '0 0 24px rgba(74,222,128,.3), 0 8px 24px rgba(0,0,0,.4)',
          color: '#4ade80',
        }}
      >
        ✦
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200
          ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel slide-in */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 transition-transform duration-300
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="CactusOS"
        aria-hidden={!open}
      >
        <div className="h-full glass !rounded-none sm:!rounded-l-2xl border-l border-white/10 flex flex-col">
          <CactusOSChat variant="panel" onClose={() => setOpen(false)} />
        </div>
      </div>
    </>
  )
}
