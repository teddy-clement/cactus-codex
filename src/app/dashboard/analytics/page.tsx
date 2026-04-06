'use client'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

type AnalyticsData = {
  summary: {
    total_signals_30d: number
    page_views_30d: number
    logins_30d: number
    active_heartbeats_24h: number
    errors_24h: number
    warnings_24h: number
    signals_24h: number
  }
  by_day: { date: string; count: number }[]
  by_type: { type: string; count: number }[]
  latest: Array<{
    id: string
    signal_type: string
    severity: string
    title: string
    body: string | null
    created_at: string
    source: string
  }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then((d: AnalyticsData) => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); setError(true); showToast('Erreur de chargement des analytics', 'er') })
  }, [showToast])

  useEffect(() => {
    if (!chartRef.current || !data) return
    chartRef.current.innerHTML = ''
    const max = Math.max(...data.by_day.map(d => d.count), 1)
    data.by_day.forEach((d, i) => {
      const bar = document.createElement('div')
      bar.className = 'bar' + (i === data.by_day.length - 1 ? ' bar-today' : '')
      bar.style.height = Math.max((d.count / max) * 100, 3) + '%'
      bar.title = `${d.date} : ${d.count}`
      chartRef.current!.appendChild(bar)
    })
  }, [data])

  if (loading) return <div className="p-6 text-[#6fa876] font-mono text-xs">Chargement…</div>
  if (error || !data) return <div className="p-6 text-red-500 font-mono text-xs">Erreur de chargement</div>

  const { summary } = data
  const SEVERITY_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#4ade80' }

  const stats = [
    { icon: '📡', val: String(summary.signals_24h), label: 'Signaux (24h)', delta: `${summary.errors_24h} erreurs · ${summary.warnings_24h} warnings`, al: summary.errors_24h > 0 ? '#ef4444' : '#4ade80' },
    { icon: '👁', val: String(summary.page_views_30d), label: 'Pages vues (30j)', delta: `${summary.total_signals_30d} signaux totaux`, al: '#3b82f6' },
    { icon: '🔑', val: String(summary.logins_30d), label: 'Connexions (30j)', delta: `Heartbeats actifs : ${summary.active_heartbeats_24h}`, al: '#4ade80' },
    { icon: '⚡', val: String(summary.total_signals_30d), label: 'Signaux totaux (30j)', delta: data.by_type[0]?.type || 'Aucun signal', al: '#f59e0b' },
  ]

  return (
    <>
      <div className="g4 mb">
        {stats.map((s, i) => (
          <div key={i} className="stat" style={{ '--al': s.al } as React.CSSProperties}>
            <div className="si">{s.icon}</div>
            <div className="sv">{s.val}</div>
            <div className="sl">{s.label}</div>
            <div className="sd">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        <div className="panel">
          <div className="ph"><div className="pht">Page views / jour — 30 derniers jours</div><div className="phg">// production</div></div>
          <div className="panel-body">
            <div ref={chartRef} className="barchart" />
            {data.by_day.length > 0 && (
              <div className="chart-labels">
                <span>{data.by_day[0]?.date?.slice(5)}</span>
                <span>{data.by_day[9]?.date?.slice(5)}</span>
                <span>{data.by_day[19]?.date?.slice(5)}</span>
                <span>{data.by_day[29]?.date?.slice(5)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Signaux par type</div><div className="phg">// 30 derniers jours</div></div>
          <div className="panel-body">
            {data.by_type.slice(0, 8).map(t => (
              <div key={t.type} className="role-bar">
                <div className="rbl">{t.type}</div>
                <div className="rbb"><div className="rbf" style={{ width: (t.count / (data.by_type[0]?.count || 1) * 100) + '%', background: '#2d6b45' }} /></div>
                <div className="rbp">{t.count}</div>
              </div>
            ))}
            {data.by_type.length === 0 && <div className="font-mono text-[11px] text-[#384e3c]">Aucun signal pour le moment</div>}
          </div>
        </div>
      </div>

      <div className="panel mt-[17px]">
        <div className="ph"><div className="pht">Derniers signaux</div><div className="phg">// 20 plus récents</div></div>
        <div className="signal-list">
          {data.latest.length === 0 && <div className="empty">Aucun signal reçu.</div>}
          {data.latest.map(s => (
            <div key={s.id} className="signal-row">
              <span className="sev-badge" style={{ background: SEVERITY_COLOR[s.severity] + '22', color: SEVERITY_COLOR[s.severity], borderColor: SEVERITY_COLOR[s.severity] + '44' }}>{s.severity}</span>
              <div className="signal-body">
                <div className="signal-title">{s.title}</div>
                {s.body && <div className="signal-sub">{s.body}</div>}
              </div>
              <div className="signal-meta">
                <div className="signal-type">{s.signal_type}</div>
                <time className="signal-time">{new Date(s.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
