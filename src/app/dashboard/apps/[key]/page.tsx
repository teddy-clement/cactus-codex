'use client'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import ActivitySparkline from '@/components/dashboard/ActivitySparkline'
import type { App, AppSignal, UserFeedback, AppDeployment, AppImprovement } from '@/types'

type Tab = 'overview' | 'signals' | 'feedbacks' | 'roadmap' | 'settings'

const SEV_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#4ade80', critical: '#ef4444' }
const STATUS_LABEL: Record<string, string> = { online: 'Opérationnel', maintenance: 'Maintenance', offline: 'Erreur' }
const STATUS_COLOR: Record<string, string> = { online: '#4ade80', maintenance: '#f59e0b', offline: '#ef4444' }
const FB_STATUS_LABEL: Record<string, string> = { nouveau: 'Nouveau', en_cours: 'En cours', 'résolu': 'Résolu', 'ignoré': 'Ignoré' }
const DEP_COLOR: Record<string, string> = { READY: '#4ade80', ERROR: '#ef4444', BUILDING: '#f59e0b', QUEUED: '#6fa876', CANCELED: '#6fa876' }

function formatRel(iso: string | null) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

export default function AppPage() {
  const params = useParams<{ key: string }>()
  const appKey = params.key
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const initialTab = (searchParams.get('tab') as Tab) || 'overview'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [app, setApp] = useState<App | null>(null)
  const [signals, setSignals] = useState<AppSignal[]>([])
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([])
  const [loading, setLoading] = useState(true)

  function changeTab(newTab: Tab) {
    setTab(newTab)
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', newTab)
    router.replace(`/dashboard/apps/${appKey}?${p.toString()}`, { scroll: false })
  }

  useEffect(() => {
    async function load() {
      try {
        const appsRes = await fetch('/api/apps').then(r => r.json())
        const appsList = (Array.isArray(appsRes) ? appsRes : appsRes.data || []) as App[]
        const current = appsList.find(a => a.app_key === appKey)
        if (!current) {
          showToast('Application introuvable', 'er')
          router.push('/dashboard')
          return
        }
        setApp(current)

        const sigRes = await fetch('/api/signals?limit=100').then(r => r.json())
        const allSigs = (Array.isArray(sigRes) ? sigRes : sigRes.data || []) as AppSignal[]
        setSignals(allSigs.filter(s => s.app_id === current.id))

        const fbRes = await fetch(`/api/feedbacks?limit=50`).then(r => r.json())
        const allFbs = (Array.isArray(fbRes) ? fbRes : fbRes.data || []) as UserFeedback[]
        setFeedbacks(allFbs.filter(f => f.app_key === appKey))
      } catch {
        showToast('Erreur de chargement', 'er')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [appKey, router, showToast])

  // Realtime
  useEffect(() => {
    if (!app) return
    const supabase = createClient()
    const channel = supabase
      .channel(`app-${app.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_signals', filter: `app_id=eq.${app.id}` }, (payload) => {
        setSignals(prev => [payload.new as AppSignal, ...prev].slice(0, 100))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_feedbacks', filter: `app_key=eq.${appKey}` }, (payload) => {
        setFeedbacks(prev => [payload.new as UserFeedback, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [app, appKey])

  const toggleMaintenance = useCallback(async () => {
    if (!app) return
    const newStatus = app.status === 'maintenance' ? 'online' : 'maintenance'
    const res = await fetch('/api/apps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setApp(updated)
      showToast(newStatus === 'maintenance' ? `${app.name} en maintenance` : `${app.name} remis en ligne`, 'ok')
    } else {
      showToast('Erreur lors de la bascule', 'er')
    }
  }, [app, showToast])

  const updateFeedbackStatus = async (id: string, status: string) => {
    const res = await fetch('/api/feedbacks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setFeedbacks(prev => prev.map(f => f.id === id ? updated : f))
      showToast(`Feedback → ${FB_STATUS_LABEL[status]}`, 'ok')
    }
  }

  const kpi = useMemo(() => {
    const since24h = Date.now() - 24 * 60 * 60 * 1000
    const recent = signals.filter(s => new Date(s.created_at).getTime() > since24h)
    return {
      signals24h: recent.length,
      errors24h: recent.filter(s => s.severity === 'error').length,
      warnings24h: recent.filter(s => s.severity === 'warn').length,
      feedbacksUnread: feedbacks.filter(f => f.status === 'nouveau').length,
      lastHeartbeat: recent.find(s => s.signal_type === 'heartbeat')?.created_at || null,
    }
  }, [signals, feedbacks])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-10 w-64 rounded bg-white/5 animate-pulse" />
        <div className="glass p-8 animate-pulse h-48" />
      </div>
    )
  }

  if (!app) return null

  const statusColor = STATUS_COLOR[app.status]

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── Breadcrumb + header ── */}
      <div className="animate-slideUp">
        <div className="font-mono text-[10px] text-[#6fa876] tracking-wider mb-2">
          <Link href="/dashboard" className="hover:text-white transition-colors">Cockpit</Link>
          <span className="mx-2">›</span>
          <span className="text-[#4ade80]">{app.name}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {app.logo_url ? (
              <Image
                src={app.logo_url}
                alt={app.name}
                width={48}
                height={48}
                className="rounded-xl flex-shrink-0 border border-white/10 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-display font-bold text-[#4ade80]"
                   style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.25)' }}>
                ⬡
              </div>
            )}
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-wide truncate">
              {app.name}
            </h1>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border flex-shrink-0"
              style={{ borderColor: statusColor + '40', background: statusColor + '15' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: statusColor }} />
              <span className="font-mono text-[9px] tracking-wider uppercase" style={{ color: statusColor }}>
                {STATUS_LABEL[app.status]}
              </span>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            className={`px-4 py-2 rounded-lg font-mono text-xs tracking-wider uppercase transition-colors border
              ${app.status === 'maintenance'
                ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/20'
                : 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20'
              }`}
          >
            {app.status === 'maintenance' ? '↺ Remettre en ligne' : '⚠ Mettre en maintenance'}
          </button>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 -mx-4 px-4 md:mx-0 md:px-0">
        {(['overview', 'signals', 'feedbacks', 'roadmap', 'settings'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { overview: 'Aperçu', signals: 'Signaux', feedbacks: 'Feedbacks', roadmap: 'Roadmap', settings: 'Réglages' }
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => changeTab(t)}
              className={`px-4 py-2.5 font-mono text-xs tracking-wider uppercase whitespace-nowrap transition-colors relative
                ${active ? 'text-[#4ade80]' : 'text-[#6fa876] hover:text-white'}`}
            >
              {labels[t]}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4ade80]" />}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <OverviewTab app={app} kpi={kpi} signals={signals} appKey={appKey} />}
      {tab === 'signals' && <SignalsTab signals={signals} />}
      {tab === 'feedbacks' && <FeedbacksTab feedbacks={feedbacks} updateStatus={updateFeedbackStatus} />}
      {tab === 'roadmap' && <RoadmapTab appKey={appKey} />}
      {tab === 'settings' && <SettingsTab app={app} onUpdate={setApp} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Onglet Aperçu (avec déploiements)
// ─────────────────────────────────────────────────────
function OverviewTab({ app, kpi, signals, appKey }: {
  app: App
  kpi: { signals24h: number; errors24h: number; warnings24h: number; feedbacksUnread: number; lastHeartbeat: string | null }
  signals: AppSignal[]
  appKey: string
}) {
  const { showToast } = useToast()
  const [deployments, setDeployments] = useState<AppDeployment[]>([])
  const [syncing, setSyncing] = useState(false)

  const loadDeployments = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`/api/vercel/deployments?app_key=${appKey}&limit=5`)
      const json = await res.json()
      setDeployments(json.data || [])
    } catch {
      if (!silent) showToast('Erreur chargement déploiements', 'er')
    }
  }, [appKey, showToast])

  useEffect(() => { loadDeployments(true) }, [loadDeployments])

  async function syncVercel() {
    setSyncing(true)
    try {
      const res = await fetch('/api/vercel/sync')
      const json = await res.json()
      if (res.ok) {
        setDeployments(json.deployments || [])
        showToast(`✓ ${json.synced} déploiement(s) synchronisé(s)`, 'ok')
      } else {
        showToast(json.error || 'Erreur sync Vercel', 'er')
      }
    } catch {
      showToast('Erreur réseau', 'er')
    } finally {
      setSyncing(false)
    }
  }

  const sparklineData = useMemo(() => {
    const dayMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      dayMap[key] = 0
    }
    for (const s of signals) {
      const key = s.created_at.slice(0, 10)
      if (key in dayMap) dayMap[key]++
    }
    return Object.entries(dayMap).map(([date, count]) => ({ date, count }))
  }, [signals])

  return (
    <div className="space-y-4 animate-slideUp">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass p-4">
          <div className="font-display text-2xl font-bold text-white leading-none">{kpi.signals24h}</div>
          <div className="font-mono text-[9px] text-[#6fa876] mt-2 tracking-wider uppercase">Signaux 24h</div>
        </div>
        <div className="glass p-4">
          <div className={`font-display text-2xl font-bold leading-none ${kpi.errors24h > 0 ? 'text-red-400' : 'text-white'}`}>
            {kpi.errors24h}
          </div>
          <div className="font-mono text-[9px] text-[#6fa876] mt-2 tracking-wider uppercase">Erreurs 24h</div>
        </div>
        <div className="glass p-4">
          <div className={`font-display text-2xl font-bold leading-none ${kpi.feedbacksUnread > 0 ? 'text-[#f59e0b]' : 'text-white'}`}>
            {kpi.feedbacksUnread}
          </div>
          <div className="font-mono text-[9px] text-[#6fa876] mt-2 tracking-wider uppercase">Feedbacks</div>
        </div>
        <div className="glass p-4">
          <div className="font-mono text-sm text-white leading-tight">{formatRel(kpi.lastHeartbeat)}</div>
          <div className="font-mono text-[9px] text-[#6fa876] mt-2 tracking-wider uppercase">Heartbeat</div>
        </div>
      </div>

      {/* Activité 7 jours */}
      <div className="glass p-5 md:p-6">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Activité 7 jours</div>
        <ActivitySparkline data={sparklineData} />
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 font-mono text-xs">
          <span className="text-[#6fa876] tracking-wider uppercase">Uptime</span>
          <span className="text-white">{app.uptime?.toFixed?.(1) ?? app.uptime ?? '—'}%</span>
        </div>
      </div>

      {/* Déploiements Vercel */}
      <div className="glass p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">// Déploiements Vercel</div>
          <button
            onClick={syncVercel}
            disabled={syncing}
            className="px-3 py-1.5 rounded-md bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] font-mono text-[10px] tracking-wider uppercase hover:bg-[#4ade80]/20 disabled:opacity-50 transition-colors"
          >
            {syncing ? '…' : '↻ Sync Vercel'}
          </button>
        </div>
        {deployments.length === 0 ? (
          <div className="font-mono text-xs text-[#6fa876] py-4 text-center">
            Aucun déploiement synchronisé. Cliquez sur Sync.
          </div>
        ) : (
          <div className="space-y-2">
            {deployments.map(d => {
              const color = DEP_COLOR[d.status] || '#6fa876'
              return (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <span
                    className="font-mono text-[9px] font-bold tracking-wider uppercase flex-shrink-0 mt-0.5 w-14 text-center px-1.5 py-0.5 rounded"
                    style={{ color, background: color + '15', border: `1px solid ${color}40` }}
                  >
                    {d.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {d.message || 'Déploiement'}
                    </div>
                    <div className="font-mono text-[10px] text-[#6fa876] mt-0.5 truncate">
                      {d.version || '—'} · déployé il y a {formatRel(d.deployed_at)}
                    </div>
                  </div>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-[#6fa876] hover:text-[#4ade80] flex-shrink-0 mt-0.5"
                    >
                      ↗
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Endpoint */}
      <div className="glass p-5 md:p-6">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase mb-3">// Endpoint public</div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-xs text-[#4ade80] overflow-x-auto">
          <span className="flex-shrink-0">GET</span>
          <span className="truncate">/api/public/apps/{app.app_key}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Onglet Signaux
// ─────────────────────────────────────────────────────
function SignalsTab({ signals }: { signals: AppSignal[] }) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all')
  const filtered = filter === 'all' ? signals : signals.filter(s => s.severity === filter)
  const counts = {
    all: signals.length,
    error: signals.filter(s => s.severity === 'error').length,
    warn: signals.filter(s => s.severity === 'warn').length,
    info: signals.filter(s => s.severity === 'info').length,
  }

  return (
    <div className="space-y-3 animate-slideUp">
      <div className="flex items-center gap-2 overflow-x-auto">
        {(['all', 'error', 'warn', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-md font-mono text-[10px] tracking-wider uppercase border whitespace-nowrap transition-colors"
            style={
              filter === f
                ? { background: (SEV_COLOR[f] || '#4ade80') + '15', borderColor: (SEV_COLOR[f] || '#4ade80') + '50', color: SEV_COLOR[f] || '#4ade80' }
                : { background: 'transparent', borderColor: 'rgba(255,255,255,.1)', color: '#6fa876' }
            }
          >
            {f === 'all' ? 'Tous' : f} · {counts[f]}
          </button>
        ))}
      </div>

      <div className="glass overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse-dot" />
          <span className="font-mono text-[9px] text-[#4ade80] tracking-[0.2em] uppercase">LIVE · {filtered.length} signaux</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#6fa876]">✓ Aucun signal</div>
        ) : (
          filtered.map(s => (
            <div key={s.id} className="px-4 py-3 border-b border-white/5 last:border-0 flex items-start gap-3" style={{ borderLeftColor: SEV_COLOR[s.severity], borderLeftWidth: 3 }}>
              <span className="font-mono text-[9px] font-bold tracking-wider uppercase flex-shrink-0 mt-0.5 w-12" style={{ color: SEV_COLOR[s.severity] }}>
                {s.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{s.title}</div>
                {s.body && <div className="font-mono text-[10px] text-[#6fa876] mt-1 truncate">{s.body}</div>}
              </div>
              <time className="font-mono text-[9px] text-[#6fa876] flex-shrink-0 mt-0.5">
                {new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Onglet Feedbacks
// ─────────────────────────────────────────────────────
function FeedbacksTab({ feedbacks, updateStatus }: { feedbacks: UserFeedback[]; updateStatus: (id: string, status: string) => Promise<void> }) {
  return (
    <div className="space-y-3 animate-slideUp">
      <div className="glass overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse-dot" />
          <span className="font-mono text-[9px] text-[#4ade80] tracking-[0.2em] uppercase">LIVE · {feedbacks.length} remontées</span>
        </div>
        {feedbacks.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#6fa876]">✓ Aucun feedback</div>
        ) : (
          feedbacks.map(fb => (
            <div key={fb.id} className="px-4 py-3 border-b border-white/5 last:border-0 flex items-start gap-3" style={{ borderLeftColor: SEV_COLOR[fb.severity], borderLeftWidth: 3 }}>
              <span className="font-mono text-[9px] font-bold tracking-wider uppercase flex-shrink-0 mt-0.5 w-16" style={{ color: SEV_COLOR[fb.severity] }}>
                {fb.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{fb.message}</div>
                <div className="font-mono text-[10px] text-[#6fa876] mt-1">
                  {fb.user_email || 'Anonyme'}{fb.user_role ? ` · ${fb.user_role}` : ''} · {FB_STATUS_LABEL[fb.status]}
                </div>
              </div>
              {fb.status === 'nouveau' && (
                <div className="flex flex-shrink-0 gap-1">
                  <button onClick={() => updateStatus(fb.id, 'en_cours')} title="En cours" className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-[#f59e0b] hover:bg-white/10">▶</button>
                  <button onClick={() => updateStatus(fb.id, 'résolu')} title="Résolu" className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-[#4ade80] hover:bg-white/10">✓</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Onglet Roadmap (Kanban)
// ─────────────────────────────────────────────────────
const KANBAN_COLS: Array<{ key: AppImprovement['statut']; label: string; color: string }> = [
  { key: 'idee', label: 'Idée', color: '#6fa876' },
  { key: 'planifie', label: 'Planifié', color: '#3b82f6' },
  { key: 'en_cours', label: 'En cours', color: '#f59e0b' },
  { key: 'livre', label: 'Livré', color: '#4ade80' },
]

const SOURCE_LABEL: Record<AppImprovement['source'], { color: string; bg: string; label: string }> = {
  manual: { color: '#94a3b8', bg: 'rgba(148,163,184,.15)', label: 'manuel' },
  terrain: { color: '#f59e0b', bg: 'rgba(245,158,11,.15)', label: 'terrain' },
  'cactus-os': { color: '#4ade80', bg: 'rgba(74,222,128,.15)', label: 'cactus-os' },
}

function RoadmapTab({ appKey }: { appKey: string }) {
  const { showToast } = useToast()
  const [items, setItems] = useState<AppImprovement[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [draftTitre, setDraftTitre] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftPriorite, setDraftPriorite] = useState(3)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/improvements?app_key=${appKey}`)
      const json = await res.json()
      setItems(json.data || [])
    } catch {
      showToast('Erreur de chargement', 'er')
    } finally {
      setLoading(false)
    }
  }, [appKey, showToast])

  useEffect(() => { load() }, [load])

  async function createItem(e: React.FormEvent) {
    e.preventDefault()
    if (!draftTitre.trim()) return
    const res = await fetch('/api/improvements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: appKey,
        titre: draftTitre.trim(),
        description: draftDescription.trim() || null,
        priorite: draftPriorite,
      }),
    })
    if (res.ok) {
      const created = await res.json() as AppImprovement
      setItems(prev => [created, ...prev])
      setDraftTitre('')
      setDraftDescription('')
      setDraftPriorite(3)
      setAdding(false)
      showToast('Idée ajoutée', 'ok')
    } else {
      showToast('Erreur création', 'er')
    }
  }

  async function moveItem(id: string, newStatut: AppImprovement['statut']) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, statut: newStatut } : i))
    const res = await fetch('/api/improvements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut: newStatut }),
    })
    if (!res.ok) {
      showToast('Erreur sauvegarde', 'er')
      load()
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Supprimer cette idée ?')) return
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/improvements?id=${id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4 animate-slideUp">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">// Roadmap · {items.length} idée{items.length !== 1 ? 's' : ''}</div>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 rounded-md bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] font-mono text-[10px] tracking-wider uppercase hover:bg-[#4ade80]/20"
        >
          + Idée
        </button>
      </div>

      {/* Modal d'ajout */}
      {adding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setAdding(false)}>
          <form onSubmit={createItem} onClick={e => e.stopPropagation()} className="glass w-full max-w-md p-5 space-y-3">
            <div className="font-display text-lg font-bold text-white">Nouvelle idée</div>
            <input
              autoFocus
              value={draftTitre}
              onChange={e => setDraftTitre(e.target.value)}
              placeholder="Titre"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-[#4ade80]/50 focus:outline-none"
            />
            <textarea
              value={draftDescription}
              onChange={e => setDraftDescription(e.target.value)}
              placeholder="Description (optionnel)"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-[#4ade80]/50 focus:outline-none resize-none"
            />
            <div>
              <label className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">Priorité</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraftPriorite(n)}
                    className={`flex-1 py-2 rounded-md font-mono text-xs transition-colors ${draftPriorite === n ? 'bg-[#4ade80]/20 border border-[#4ade80]/50 text-[#4ade80]' : 'bg-white/5 border border-white/10 text-[#6fa876]'}`}
                  >
                    {'★'.repeat(n)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 rounded-lg bg-[#4ade80] text-black font-display font-bold text-xs tracking-wider uppercase">
                Ajouter
              </button>
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-[#6fa876] hover:text-white text-xs font-mono uppercase tracking-wider">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="glass p-4 h-32 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {KANBAN_COLS.map(col => {
            const colItems = items.filter(i => i.statut === col.key)
            return (
              <div
                key={col.key}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (draggedId) {
                    moveItem(draggedId, col.key)
                    setDraggedId(null)
                  }
                }}
                className="glass p-3 min-h-[200px]"
                style={{ borderTop: `2px solid ${col.color}` }}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: col.color }}>
                    {col.label}
                  </span>
                  <span className="font-mono text-[10px] text-[#6fa876]">{colItems.length}</span>
                </div>
                <div className="space-y-2">
                  {colItems.map(item => {
                    const src = SOURCE_LABEL[item.source]
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggedId(item.id)}
                        onDragEnd={() => setDraggedId(null)}
                        className={`p-3 rounded-lg bg-white/5 border border-white/10 cursor-grab active:cursor-grabbing hover:border-[#4ade80]/30 transition-colors ${draggedId === item.id ? 'opacity-40' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="text-sm font-semibold text-white leading-tight">{item.titre}</div>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="font-mono text-[10px] text-[#6fa876] hover:text-red-400 flex-shrink-0"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                        {item.description && (
                          <div className="font-mono text-[10px] text-[#6fa876] line-clamp-2 mb-2">{item.description}</div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded"
                            style={{ color: src.color, background: src.bg }}
                          >
                            {src.label}
                          </span>
                          <span className="font-mono text-[10px]" style={{ color: '#f59e0b' }}>
                            {'★'.repeat(item.priorite)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {colItems.length === 0 && (
                    <div className="font-mono text-[10px] text-[#384e3c] text-center py-4">—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Onglet Réglages (avec upload logo)
// ─────────────────────────────────────────────────────
function SettingsTab({ app, onUpdate }: { app: App; onUpdate: (a: App) => void }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [name, setName] = useState(app.name)
  const [url, setUrl] = useState(app.url)
  const [webhookUrl, setWebhookUrl] = useState(app.webhook_url || '')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [description, setDescription] = useState(app.control_note || '')
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showIngest, setShowIngest] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function save() {
    setSaving(true)
    const res = await fetch('/api/apps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: app.id,
        name,
        url,
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret || undefined,
        control_note: description,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
      setWebhookSecret('')
      showToast('Paramètres enregistrés', 'ok')
    } else {
      const err = await res.json()
      showToast(err.error || 'Erreur', 'er')
    }
  }

  async function regenerateIngestKey() {
    if (!confirm('Régénérer l\'ingest_key invalidera l\'ancienne clé. Continuer ?')) return
    const res = await fetch('/api/apps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, regenerate_ingest_key: true }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
      showToast('Nouvelle ingest_key générée', 'ok')
      setShowIngest(true)
    } else {
      showToast('Erreur lors de la régénération', 'er')
    }
  }

  async function deleteApp() {
    if (!confirm(`Supprimer définitivement "${app.name}" ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/apps?id=${app.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Application supprimée', 'ok')
      router.push('/dashboard')
    } else {
      const err = await res.json()
      showToast(err.error || 'Erreur', 'er')
    }
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) { showToast('Image requise', 'er'); return }
    if (file.size > 2 * 1024 * 1024) { showToast('Fichier trop volumineux (max 2 Mo)', 'er'); return }

    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('app_key', app.app_key || '')

    try {
      const res = await fetch('/api/apps/logo', { method: 'POST', body: formData })
      const json = await res.json()
      if (res.ok) {
        onUpdate({ ...app, logo_url: json.logo_url })
        showToast('Logo mis à jour', 'ok')
      } else {
        showToast(json.error || 'Erreur upload', 'er')
      }
    } catch {
      showToast('Erreur réseau', 'er')
    } finally {
      setUploadingLogo(false)
    }
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadLogo(file)
  }

  function onLogoDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) uploadLogo(file)
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-[#4ade80]/50 focus:outline-none transition-colors'

  return (
    <div className="space-y-4 animate-slideUp">
      {/* Logo upload */}
      <div className="glass p-5 md:p-6 space-y-3">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">// Logo</div>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={onLogoDrop}
          className="border-2 border-dashed border-white/10 rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-[#4ade80]/40 hover:bg-white/5 transition-colors"
        >
          {app.logo_url ? (
            <Image
              src={app.logo_url}
              alt="Logo actuel"
              width={64}
              height={64}
              className="rounded-xl flex-shrink-0 border border-white/10 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl font-display font-bold text-[#4ade80]"
                 style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.25)' }}>
              ⬡
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-semibold mb-0.5">
              {uploadingLogo ? 'Upload en cours…' : 'Cliquer ou déposer un logo'}
            </div>
            <div className="font-mono text-[10px] text-[#6fa876]">
              512×512px recommandé · PNG, JPG ou WebP · max 2 Mo
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onLogoChange}
          className="hidden"
        />
      </div>

      {/* General */}
      <div className="glass p-5 md:p-6 space-y-4">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">// Général</div>
        <div>
          <label className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">Nom</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">URL publique</label>
          <input className={inputCls} type="url" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">Description</label>
          <textarea className={inputCls} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      {/* Webhook */}
      <div className="glass p-5 md:p-6 space-y-4">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">// Webhook broadcasts</div>
        <div>
          <label className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">URL du webhook</label>
          <input className={inputCls} type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://.../api/codex/broadcast" />
        </div>
        <div>
          <label className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">
            Secret webhook {app.webhook_url && <span className="text-[#4ade80]">· Défini</span>}
          </label>
          <div className="flex gap-2">
            <input
              className={inputCls + ' flex-1'}
              type={showSecret ? 'text' : 'password'}
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder="Laisser vide pour conserver le secret actuel"
            />
            <button type="button" onClick={() => setShowSecret(s => !s)} className="px-3 rounded-lg border border-white/10 bg-white/5 text-[#6fa876] hover:text-white">
              {showSecret ? '◌' : '●'}
            </button>
          </div>
        </div>
      </div>

      {/* Ingest key */}
      <div className="glass p-5 md:p-6 space-y-4">
        <div className="font-mono text-[10px] text-[#4ade80] tracking-[0.2em] uppercase">// Clé d&apos;ingestion</div>
        {showIngest && app.ingest_key ? (
          <div className="p-3 rounded-lg bg-black/30 border border-[#4ade80]/30 font-mono text-xs text-[#4ade80] break-all select-all">
            {app.ingest_key}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-xs text-[#6fa876]">
            {app.ingest_key ? '•••••••••••• (masquée)' : 'Non définie'}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          {app.ingest_key && (
            <button onClick={() => setShowIngest(s => !s)} className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-mono tracking-wider uppercase hover:bg-white/10">
              {showIngest ? 'Masquer' : 'Révéler'}
            </button>
          )}
          <button onClick={regenerateIngestKey} className="px-4 py-2 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] text-xs font-mono tracking-wider uppercase hover:bg-[#f59e0b]/20">
            ↻ Régénérer
          </button>
        </div>
        <div className="font-mono text-[10px] text-[#6fa876]">
          ⚠ La régénération invalide l&apos;ancienne clé. L&apos;app cliente devra être mise à jour.
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-[#4ade80] text-black font-display font-bold text-sm tracking-widest uppercase hover:bg-[#4ade80]/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="glass p-5 md:p-6 space-y-3 border-red-500/20">
        <div className="font-mono text-[10px] text-red-400 tracking-[0.2em] uppercase">// Zone dangereuse</div>
        <div className="font-mono text-xs text-[#6fa876]">
          Supprimer l&apos;application supprime aussi ses modules et ses signaux. Les feedbacks et logs sont conservés.
        </div>
        <button
          onClick={deleteApp}
          className="px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-display font-bold text-sm tracking-widest uppercase hover:bg-red-500/20 transition-colors"
        >
          Supprimer l&apos;application
        </button>
      </div>
    </div>
  )
}
