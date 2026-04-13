'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import CactusOSChat from '@/components/cactus-os/Chat'

type Snapshot = {
  apps: Array<{ name: string; app_key: string; status: string }>
  signals_24h: number
  feedbacks_unread: number
  deployments_recent: number
}

const STATUS_COLOR: Record<string, string> = { online: '#4ade80', maintenance: '#f59e0b', offline: '#ef4444' }
const STATUS_LABEL: Record<string, string> = { online: 'Opérationnel', maintenance: 'Maintenance', offline: 'Erreur' }

export default function CactusOSPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [appsRes, sigsRes, fbsRes, depsRes] = await Promise.all([
          fetch('/api/apps').then(r => r.json()),
          fetch('/api/signals?limit=200').then(r => r.json()),
          fetch('/api/feedbacks?status=nouveau').then(r => r.json()),
          fetch('/api/vercel/deployments?limit=10').then(r => r.json()),
        ])
        const apps = (Array.isArray(appsRes) ? appsRes : appsRes.data || [])
        const sigs = (Array.isArray(sigsRes) ? sigsRes : sigsRes.data || [])
        const fbs = (Array.isArray(fbsRes) ? fbsRes : fbsRes.data || [])
        const deps = (Array.isArray(depsRes) ? depsRes : depsRes.data || [])
        const since24h = Date.now() - 24 * 60 * 60 * 1000
        setSnapshot({
          apps: apps.map((a: { name: string; app_key: string; status: string }) => ({
            name: a.name, app_key: a.app_key, status: a.status,
          })),
          signals_24h: sigs.filter((s: { created_at: string }) => new Date(s.created_at).getTime() > since24h).length,
          feedbacks_unread: fbs.length,
          deployments_recent: deps.length,
        })
      } catch {
        setSnapshot({ apps: [], signals_24h: 0, feedbacks_unread: 0, deployments_recent: 0 })
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-160px)] md:h-[calc(100vh-130px)] grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 animate-slideUp">
      {/* ── Panneau gauche : contexte ── */}
      <aside className="hidden lg:flex flex-col gap-4 overflow-y-auto">
        <div className="glass p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 p-1"
                 style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)' }}>
              <Image
                src="/cactus-os-logo.png"
                alt="CactusOS"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <div>
              <div className="font-display text-base font-bold text-white tracking-wide">CactusOS</div>
              <div className="font-mono text-[9px] text-[#6fa876] tracking-wider">Contexte temps réel</div>
            </div>
          </div>
        </div>

        <div className="glass p-4">
          <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Apps</div>
          {snapshot ? (
            <div className="space-y-2">
              {snapshot.apps.map(a => (
                <div key={a.app_key} className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLOR[a.status], boxShadow: `0 0 6px ${STATUS_COLOR[a.status]}80` }}
                  />
                  <span className="font-mono text-xs text-white truncate flex-1">{a.name}</span>
                  <span className="font-mono text-[9px] tracking-wider" style={{ color: STATUS_COLOR[a.status] }}>
                    {STATUS_LABEL[a.status].slice(0, 4)}
                  </span>
                </div>
              ))}
              {snapshot.apps.length === 0 && (
                <div className="font-mono text-xs text-[#6fa876]">Aucune app</div>
              )}
            </div>
          ) : (
            <div className="font-mono text-xs text-[#6fa876]">Chargement…</div>
          )}
        </div>

        <div className="glass p-4">
          <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Activité 24h</div>
          {snapshot && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <div className="font-display text-2xl font-bold text-white">{snapshot.signals_24h}</div>
                <div className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mt-1">Signaux</div>
              </div>
              <div>
                <div className={`font-display text-2xl font-bold ${snapshot.feedbacks_unread > 0 ? 'text-[#f59e0b]' : 'text-white'}`}>
                  {snapshot.feedbacks_unread}
                </div>
                <div className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mt-1">Feedbacks non lus</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-white">{snapshot.deployments_recent}</div>
                <div className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mt-1">Déploiements</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat ── */}
      <div className="glass overflow-hidden flex flex-col min-h-0">
        <CactusOSChat variant="page" />
      </div>
    </div>
  )
}
