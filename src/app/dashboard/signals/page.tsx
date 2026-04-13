'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/dashboard/AppContext'
import { createClient } from '@/lib/supabase/client'
import SkeletonRow from '@/components/ui/SkeletonRow'
import SkeletonCard from '@/components/ui/SkeletonCard'
import type { AppSignal } from '@/types'

const SEV_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#4ade80' }
const SEV_FILL: Record<string, string> = { error: 'rgba(239,68,68,.08)', warn: 'rgba(245,158,11,.08)', info: 'rgba(74,222,128,.06)' }

const FILTER_STORAGE_KEY = 'codex_filter_app'

export default function SignalsPage() {
  const [signals, setSignals] = useState<AppSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all')
  const [appFilter, setAppFilter] = useState<string>('all')
  const { showToast } = useToast()
  const { apps } = useApp()

  // Restore filter from localStorage au mount
  useEffect(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) setAppFilter(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, appFilter)
  }, [appFilter])

  async function loadSignals(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/signals?limit=50')
      const json = await res.json()
      setSignals(json.data || json)
    } catch {
      if (!silent) showToast('Erreur de chargement des signaux', 'er')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { loadSignals() }, [])

  // ── Realtime : ecouter les INSERT sur app_signals ──
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('signals-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_signals' }, (payload) => {
        const signal = payload.new as AppSignal
        setSignals(prev => [signal, ...prev].slice(0, 50))
        if (signal.severity === 'error') {
          showToast(`⚠ Nouveau signal : ${signal.title}`, 'er')
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [showToast])

  async function refresh() {
    await loadSignals()
    showToast('Signaux rafraîchis', 'ok')
  }

  // Map app_id → app_key pour le filtre par app
  const appIdToKey: Record<string, string> = {}
  apps.forEach(a => { if (a.app_key) appIdToKey[a.id] = a.app_key })

  const filtered = signals.filter(s => {
    if (severityFilter !== 'all' && s.severity !== severityFilter) return false
    if (appFilter !== 'all' && appIdToKey[s.app_id] !== appFilter) return false
    return true
  })

  const counts = {
    all: signals.length,
    error: signals.filter(s => s.severity === 'error').length,
    warn: signals.filter(s => s.severity === 'warn').length,
    info: signals.filter(s => s.severity === 'info').length,
  }

  return (
    <>
      <div className="signals-top">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
          <select
            value={appFilter}
            onChange={e => setAppFilter(e.target.value)}
            className="bg-[#0a120c] border border-[#233428] rounded-md px-3 py-1.5 text-xs font-mono text-[#d8eedd] outline-none focus:border-[#2d6b45]"
          >
            <option value="all">Toutes les apps</option>
            {apps.map(a => (
              <option key={a.id} value={a.app_key || a.id}>{a.name}</option>
            ))}
          </select>
          <div className="filter-group">
            {(['all', 'error', 'warn', 'info'] as const).map(f => (
              <button
                key={f}
                className={`filter-btn ${severityFilter === f ? 'active' : ''}`}
                style={severityFilter === f ? { borderColor: SEV_COLOR[f] || '#4ade80', color: SEV_COLOR[f] || '#4ade80' } : {}}
                onClick={() => setSeverityFilter(f)}
              >
                {f === 'all' ? 'Tous' : f} <span className="filter-count">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <button className="refresh-btn" onClick={refresh} disabled={loading}>
          {loading ? '…' : '↺ Rafraîchir'}
        </button>
      </div>

      <div className="panel">
        <div className="ph">
          <div className="pht">Signaux structurels</div>
          <div className="phg">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse-dot" />
              LIVE
            </span>
            <span className="ml-2">// {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {loading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
            <div className="sm:hidden">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty">✓ Aucun signal pour ce filtre</div>
        )}

        {!loading && filtered.map(signal => (
          <div key={signal.id} className="signal-row" style={{ borderLeft: `3px solid ${SEV_COLOR[signal.severity] || '#4ade80'}`, background: SEV_FILL[signal.severity] }}>
            <div className="signal-left">
              <span className="sev" style={{ color: SEV_COLOR[signal.severity] }}>{signal.severity.toUpperCase()}</span>
              <span className="sig-type">{signal.signal_type}</span>
            </div>
            <div className="signal-body">
              <div className="sig-title">{signal.title}</div>
              {signal.body && <div className="sig-body">{signal.body}</div>}
              {signal.metadata && Object.keys(signal.metadata).length > 0 && (
                <div className="sig-meta">
                  {Object.entries(signal.metadata).map(([k, v]) => (
                    <span key={k} className="meta-tag"><span className="meta-k">{k}</span>{String(v)}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="signal-right">
              <div className="sig-source">{signal.source}</div>
              <time className="sig-time">
                {new Date(signal.created_at).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })}
              </time>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
