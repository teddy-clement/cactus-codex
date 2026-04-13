'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/dashboard/AppContext'
import SkeletonRow from '@/components/ui/SkeletonRow'
import SkeletonCard from '@/components/ui/SkeletonCard'
import type { ActivityLog } from '@/types'

const LV_CLS: Record<string, string> = { ok: 'lv-ok', info: 'lv-info', warn: 'lv-warn', error: 'lv-err' }
const LV_LABEL: Record<string, string> = { ok: 'OK', info: 'INFO', warn: 'WARN', error: 'ERR' }
const PAGE_SIZE = 50
const FILTER_STORAGE_KEY = 'codex_filter_app'

function formatTs(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [appFilter, setAppFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()
  const { apps } = useApp()

  useEffect(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) setAppFilter(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, appFilter)
  }, [appFilter])

  async function load(p: number, app: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (app !== 'all') {
        const appObj = apps.find(a => a.app_key === app)
        if (appObj) params.set('app', appObj.name)
      }
      const res = await fetch(`/api/logs?${params}`)
      const json = await res.json()
      setLogs(json.data || [])
      setTotal(json.total || 0)
    } catch {
      showToast('Erreur de chargement des journaux', 'er')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Attendre que les apps soient chargees avant le premier load (pour le filtre)
    load(page, appFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appFilter, apps.length])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const warns = logs.filter(l => l.level === 'warn' || l.level === 'error').length

  function changePage(newPage: number) {
    setPage(Math.min(totalPages, Math.max(1, newPage)))
  }

  return (
    <>
      <div className="signals-top">
        <select
          value={appFilter}
          onChange={e => { setAppFilter(e.target.value); setPage(1) }}
          className="bg-[#0a120c] border border-[#233428] rounded-md px-3 py-1.5 text-xs font-mono text-[#d8eedd] outline-none focus:border-[#2d6b45]"
        >
          <option value="all">Toutes les apps</option>
          {apps.map(a => (
            <option key={a.id} value={a.app_key || ''}>{a.name}</option>
          ))}
        </select>
        <div className="font-mono text-[10px] text-[#384e3c] whitespace-nowrap">
          {total} entrée{total !== 1 ? 's' : ''} · {warns} alerte{warns !== 1 ? 's' : ''} (page)
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <div className="pht">Journal d&apos;activité</div>
          <div className="phg">// page {page} / {totalPages}</div>
        </div>

        <div className="lr lr-head">
          <span>TIMESTAMP</span>
          <span>NIVEAU</span>
          <span>ÉVÉNEMENT</span>
          <span>UTILISATEUR</span>
        </div>

        {loading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
            <div className="sm:hidden">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        )}

        {!loading && logs.length === 0 && (
          <div className="empty">Aucun journal disponible.</div>
        )}

        {!loading && logs.map(log => (
          <div key={log.id} className="lr">
            <div className="ts">{formatTs(log.timestamp)}</div>
            <div><span className={`lv ${LV_CLS[log.level]}`}>{LV_LABEL[log.level]}</span></div>
            <div className="lm">{log.message}</div>
            <div className="lu">{log.user}</div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            className="px-4 py-2 rounded-md border border-[#4ade80]/30 text-[#4ade80] font-mono text-xs hover:bg-[#4ade80]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            onClick={() => changePage(page - 1)}
            disabled={page === 1 || loading}
          >
            ← Précédent
          </button>
          <span className="font-mono text-xs text-[#6fa876]">
            Page <span className="text-[#4ade80] font-bold">{page}</span> / {totalPages}
          </span>
          <button
            className="px-4 py-2 rounded-md border border-[#4ade80]/30 text-[#4ade80] font-mono text-xs hover:bg-[#4ade80]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            onClick={() => changePage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Suivant →
          </button>
        </div>
      )}
    </>
  )
}
