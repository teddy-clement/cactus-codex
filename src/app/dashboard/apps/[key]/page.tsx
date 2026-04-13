'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import ActivitySparkline from '@/components/dashboard/ActivitySparkline'
import type { App, AppSignal, UserFeedback } from '@/types'

type Tab = 'overview' | 'signals' | 'feedbacks' | 'settings'

const SEV_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#4ade80', critical: '#ef4444' }
const STATUS_LABEL: Record<string, string> = { online: 'Opérationnel', maintenance: 'Maintenance', offline: 'Erreur' }
const STATUS_COLOR: Record<string, string> = { online: '#4ade80', maintenance: '#f59e0b', offline: '#ef4444' }
const FB_STATUS_LABEL: Record<string, string> = { nouveau: 'Nouveau', en_cours: 'En cours', 'résolu': 'Résolu', 'ignoré': 'Ignoré' }

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
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    router.replace(`/dashboard/apps/${appKey}?${params.toString()}`, { scroll: false })
  }

  // Charge toutes les donnees
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

        // Signaux de cette app
        const sigRes = await fetch('/api/signals?limit=100').then(r => r.json())
        const allSigs = (Array.isArray(sigRes) ? sigRes : sigRes.data || []) as AppSignal[]
        setSignals(allSigs.filter(s => s.app_id === current.id))

        // Feedbacks de cette app
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

  // Realtime subscriptions (scope app)
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

  // ── Actions ──
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

  // ── KPIs calcules ──
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
        {(['overview', 'signals', 'feedbacks', 'settings'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { overview: 'Aperçu', signals: 'Signaux', feedbacks: 'Feedbacks', settings: 'Réglages' }
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

      {/* ── Contenu tab ── */}
      {tab === 'overview' && <OverviewTab app={app} kpi={kpi} signals={signals} />}
      {tab === 'signals' && <SignalsTab signals={signals} />}
      {tab === 'feedbacks' && <FeedbacksTab feedbacks={feedbacks} updateStatus={updateFeedbackStatus} />}
      {tab === 'settings' && <SettingsTab app={app} onUpdate={setApp} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Onglet Aperçu
// ─────────────────────────────────────────────────────
function OverviewTab({ app, kpi, signals }: {
  app: App
  kpi: { signals24h: number; errors24h: number; warnings24h: number; feedbacksUnread: number; lastHeartbeat: string | null }
  signals: AppSignal[]
}) {
  function formatRel(iso: string | null) {
    if (!iso) return '—'
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}min`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}j`
  }

  // Sparkline 7j de cette app
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

      {/* Infos app */}
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
// Onglet Réglages
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
        webhook_secret: webhookSecret || undefined, // ne pas écraser si vide
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

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-[#4ade80]/50 focus:outline-none transition-colors'

  return (
    <div className="space-y-4 animate-slideUp">
      {/* Edition générale */}
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
