import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import AppCard from '@/components/dashboard/AppCard'
import ActivitySparkline from '@/components/dashboard/ActivitySparkline'
import type { App, AppSignal, UserFeedback } from '@/types'

const NIV_COLOR: Record<string, string> = {
  important: '#ef4444',
  moyen: '#f59e0b',
  faible: '#4ade80',
}

type BroadcastRow = {
  id: string
  titre: string
  message: string
  niveau: 'faible' | 'moyen' | 'important'
  created_at: string
  created_by: string
  delivered: boolean
}

async function getCockpitData() {
  const supabase = createServiceClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: apps },
    { data: signals24h },
    { data: feedbacks },
    { data: broadcasts },
    { data: allSignals },
  ] = await Promise.all([
    supabase.from('apps').select('*').order('name'),
    supabase.from('app_signals').select('app_id, severity, signal_type, created_at').gte('created_at', since24h),
    supabase.from('user_feedbacks').select('app_key, status').eq('status', 'nouveau'),
    supabase.from('codex_broadcasts').select('id, titre, message, niveau, created_at, created_by, delivered').order('created_at', { ascending: false }).limit(3),
    supabase.from('app_signals').select('created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // Agregat par app
  const signalsByApp = new Map<string, AppSignal[]>()
  const heartbeatByApp = new Map<string, string>()
  for (const s of (signals24h as AppSignal[]) || []) {
    if (!signalsByApp.has(s.app_id)) signalsByApp.set(s.app_id, [])
    signalsByApp.get(s.app_id)!.push(s)
    if (s.signal_type === 'heartbeat') {
      const current = heartbeatByApp.get(s.app_id)
      if (!current || s.created_at > current) heartbeatByApp.set(s.app_id, s.created_at)
    }
  }

  const feedbacksByApp = new Map<string, number>()
  for (const f of (feedbacks as Pick<UserFeedback, 'app_key' | 'status'>[]) || []) {
    feedbacksByApp.set(f.app_key, (feedbacksByApp.get(f.app_key) || 0) + 1)
  }

  // Sparkline 7j
  const dayMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    dayMap[key] = 0
  }
  for (const s of (allSignals as { created_at: string }[]) || []) {
    const key = s.created_at.slice(0, 10)
    if (key in dayMap) dayMap[key]++
  }

  return {
    apps: (apps as App[]) || [],
    signalsByApp,
    heartbeatByApp,
    feedbacksByApp,
    broadcasts: (broadcasts as BroadcastRow[]) || [],
    sparkline: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
  }
}

function formatRelative(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'à l\'instant'
  if (diffMin < 60) return `il y a ${diffMin}min`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

export default async function DashboardPage() {
  const { apps, signalsByApp, heartbeatByApp, feedbacksByApp, broadcasts, sparkline } = await getCockpitData()

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const activeApps = apps.filter(a => a.status === 'online').length

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <header className="animate-slideUp">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-wide">
          Cockpit
        </h1>
        <p className="font-mono text-xs text-[#6fa876] mt-1 tracking-wider">
          {today.charAt(0).toUpperCase() + today.slice(1)} · {activeApps} application{activeApps !== 1 ? 's' : ''} active{activeApps !== 1 ? 's' : ''}
        </p>
      </header>

      {/* ── Grille AppCards ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">
            // Applications
          </h2>
          <Link
            href="/dashboard/apps/new"
            className="font-mono text-[10px] text-[#4ade80] tracking-wider uppercase hover:text-white transition-colors"
          >
            + Nouvelle app
          </Link>
        </div>
        {apps.length === 0 ? (
          <div className="glass p-8 text-center font-mono text-sm text-[#6fa876]">
            Aucune application enregistrée.
            <div className="mt-3">
              <Link
                href="/dashboard/apps/new"
                className="inline-block px-4 py-2 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/20 transition-colors font-mono text-xs uppercase tracking-wider"
              >
                Créer la première
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {apps.map((app, i) => {
              const appSignals = signalsByApp.get(app.id) || []
              const errors = appSignals.filter(s => s.severity === 'error').length
              const warnings = appSignals.filter(s => s.severity === 'warn').length
              const unread = app.app_key ? feedbacksByApp.get(app.app_key) || 0 : 0
              const hb = heartbeatByApp.get(app.id) || null
              return (
                <AppCard
                  key={app.id}
                  app={app}
                  signals24h={appSignals.length}
                  feedbacksUnread={unread}
                  lastHeartbeat={hb}
                  errors24h={errors}
                  warnings24h={warnings}
                  index={i}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* ── Broadcasts récents + Sparkline activité ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5 md:p-6 animate-slideUp" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">
              // Broadcasts récents
            </h2>
            <Link
              href="/dashboard/broadcasts"
              className="font-mono text-[10px] text-[#6fa876] tracking-wider uppercase hover:text-white transition-colors"
            >
              Voir tout →
            </Link>
          </div>
          {broadcasts.length === 0 ? (
            <div className="font-mono text-xs text-[#6fa876] py-6 text-center">Aucun broadcast récent.</div>
          ) : (
            <div className="space-y-2">
              {broadcasts.map(b => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  style={{ borderLeftColor: NIV_COLOR[b.niveau], borderLeftWidth: 3 }}
                >
                  <span
                    className="font-mono text-[9px] font-bold tracking-wider uppercase flex-shrink-0 mt-0.5"
                    style={{ color: NIV_COLOR[b.niveau] }}
                  >
                    {b.niveau}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{b.titre}</div>
                    <div className="font-mono text-[10px] text-[#6fa876] mt-0.5 truncate">{b.message}</div>
                  </div>
                  <time className="font-mono text-[9px] text-[#6fa876] flex-shrink-0 mt-0.5">
                    {formatRelative(b.created_at)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-5 md:p-6 animate-slideUp" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">
              // Activité 7 jours
            </h2>
            <Link
              href="/dashboard/analytics"
              className="font-mono text-[10px] text-[#6fa876] tracking-wider uppercase hover:text-white transition-colors"
            >
              Analytiques →
            </Link>
          </div>
          <ActivitySparkline data={sparkline} />
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <span className="font-mono text-[10px] text-[#6fa876] tracking-wider uppercase">Total</span>
            <span className="font-display text-xl font-bold text-white">
              {sparkline.reduce((sum, d) => sum + d.count, 0)}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
