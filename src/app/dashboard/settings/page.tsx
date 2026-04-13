'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/dashboard/AppContext'
import { useToast } from '@/components/ui/Toast'

type Me = {
  email: string
  name: string
  role: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
  organisation: string | null
  last_login?: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { apps } = useApp()
  const { showToast } = useToast()
  const [me, setMe] = useState<Me | null>(null)
  const [health, setHealth] = useState<{ status: string; db: string; version: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setMe).catch(() => {})
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {})
  }, [])

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      showToast('Erreur lors de la déconnexion', 'er')
    }
  }

  const isSuperadmin = me?.role === 'SUPERADMIN'

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-slideUp">
      {/* ── Profil ── */}
      <section className="glass p-5 md:p-6">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Profil</div>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold font-display"
            style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', color: '#c8f3d4' }}
          >
            {me?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '··'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-lg">{me?.name || '—'}</div>
            <div className="font-mono text-xs text-[#6fa876] truncate">{me?.email || '—'}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-[#4ade80]/30 bg-[#4ade80]/10 text-[#4ade80] tracking-wider uppercase">
                {me?.role || '—'}
              </span>
              {me?.organisation && (
                <span className="font-mono text-[9px] text-[#6fa876]">{me.organisation}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Applications ── */}
      <section className="glass p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">// Applications</div>
          <span className="font-mono text-[10px] text-[#6fa876]">{apps.length} app{apps.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-2">
          {apps.map(a => (
            <button
              key={a.id}
              onClick={() => router.push(`/dashboard/apps/${a.app_key}`)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#4ade80]/30 transition-colors text-left"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: a.status === 'online' ? '#4ade80' : a.status === 'maintenance' ? '#f59e0b' : '#ef4444',
                  boxShadow: `0 0 8px ${a.status === 'online' ? 'rgba(74,222,128,.5)' : a.status === 'maintenance' ? 'rgba(245,158,11,.5)' : 'rgba(239,68,68,.5)'}`
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{a.name}</div>
                <div className="font-mono text-[9px] text-[#6fa876] truncate">{a.app_key}</div>
              </div>
              <span className="text-[#6fa876]">→</span>
            </button>
          ))}
        </div>
        {isSuperadmin && (
          <button
            onClick={() => router.push('/dashboard/apps/new')}
            className="mt-3 w-full py-2.5 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] font-mono text-xs tracking-wider uppercase hover:bg-[#4ade80]/20 transition-colors"
          >
            + Nouvelle application
          </button>
        )}
      </section>

      {/* ── Administration (SUPERADMIN only) ── */}
      {isSuperadmin && (
        <section className="glass p-5 md:p-6">
          <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Administration</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/dashboard/users')}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#4ade80]/30 transition-colors text-left"
            >
              <div className="font-semibold text-sm text-white">Utilisateurs</div>
              <div className="font-mono text-[10px] text-[#6fa876] mt-0.5">Gérer les accès admin</div>
            </button>
            <button
              onClick={() => router.push('/dashboard/logs')}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#4ade80]/30 transition-colors text-left"
            >
              <div className="font-semibold text-sm text-white">Journal</div>
              <div className="font-mono text-[10px] text-[#6fa876] mt-0.5">Audit des actions</div>
            </button>
            <button
              onClick={() => router.push('/dashboard/chantiers')}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#4ade80]/30 transition-colors text-left"
            >
              <div className="font-semibold text-sm text-white">Chantiers</div>
              <div className="font-mono text-[10px] text-[#6fa876] mt-0.5">Suivi dev</div>
            </button>
            <button
              onClick={() => router.push('/dashboard/roadmap')}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#4ade80]/30 transition-colors text-left"
            >
              <div className="font-semibold text-sm text-white">Roadmap</div>
              <div className="font-mono text-[10px] text-[#6fa876] mt-0.5">Planification</div>
            </button>
          </div>
        </section>
      )}

      {/* ── Système ── */}
      <section className="glass p-5 md:p-6">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Système</div>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="text-[#6fa876]">Statut</span>
            <span className={health?.status === 'ok' ? 'text-[#4ade80]' : 'text-red-400'}>
              {health?.status === 'ok' ? '✓ Opérationnel' : health?.status === 'degraded' ? '⚠ Dégradé' : '…'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="text-[#6fa876]">Base de données</span>
            <span className={health?.db === 'connected' ? 'text-[#4ade80]' : 'text-red-400'}>
              {health?.db === 'connected' ? '✓ Connectée' : health?.db === 'error' ? '✗ Erreur' : '…'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-[#6fa876]">Version</span>
            <span className="text-white">{health?.version || '—'}</span>
          </div>
        </div>
      </section>

      {/* ── Session ── */}
      <section className="glass p-5 md:p-6">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Session</div>
        <button
          onClick={logout}
          className="w-full py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-display font-bold tracking-widest uppercase text-sm hover:bg-red-500/20 transition-colors"
        >
          ⏻ Se déconnecter
        </button>
      </section>
    </div>
  )
}
