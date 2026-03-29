'use client'
import { useEffect, useRef, useState } from 'react'

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
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then((d: AnalyticsData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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

  if (loading) return <div style={{ padding: 24, color: '#6fa876', fontFamily: 'monospace', fontSize: 12 }}>Chargement…</div>
  if (!data) return <div style={{ padding: 24, color: '#ef4444', fontFamily: 'monospace', fontSize: 12 }}>Erreur de chargement</div>

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
          <div className="ph"><div className="pht">Page views / jour — 30 derniers jours</div><div className="phg">// CoTrain production</div></div>
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
            {data.by_type.length === 0 && <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#384e3c' }}>Aucun signal pour le moment</div>}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 17 }}>
        <div className="ph"><div className="pht">Derniers signaux CoTrain</div><div className="phg">// 20 plus récents</div></div>
        <div className="signal-list">
          {data.latest.length === 0 && <div style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: 11, color: '#384e3c' }}>Aucun signal reçu.</div>}
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

      <style jsx>{`
        .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:17px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:17px}.mb{margin-bottom:17px}
        .stat{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:17px 19px;position:relative;overflow:hidden}
        .stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--al,#4ade80);opacity:.4}
        .si{font-size:17px;margin-bottom:9px}.sv{font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px}
        .sl{font-family:'DM Mono',monospace;font-size:9.5px;color:#6fa876;letter-spacing:.14em;text-transform:uppercase}
        .sd{font-family:'DM Mono',monospace;font-size:9.5px;color:#4ade80;margin-top:5px}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .panel-body{padding:19px}
        .barchart{display:flex;align-items:flex-end;gap:3px;height:60px;margin-top:13px}
        :global(.bar){flex:1;border-radius:2px 2px 0 0;min-height:3px;background:#1a4a2e;opacity:.72}
        :global(.bar-today){background:#4ade80;opacity:.9}
        .chart-labels{display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;margin-top:6px}
        .role-bar{display:flex;align-items:center;gap:11px;margin-bottom:11px}.role-bar:last-child{margin-bottom:0}
        .rbl{font-size:11px;color:#d8eedd;width:130px;flex-shrink:0;font-family:'DM Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .rbb{flex:1;height:4px;background:var(--border2);border-radius:2px;overflow:hidden}
        .rbf{height:100%;border-radius:2px}
        .rbp{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;width:40px;text-align:right;flex-shrink:0}
        .signal-list{display:flex;flex-direction:column}
        .signal-row{padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:12px}.signal-row:last-child{border-bottom:none}
        .sev-badge{flex-shrink:0;padding:2px 7px;border-radius:4px;font-family:'DM Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:1px solid;margin-top:2px}
        .signal-body{flex:1;min-width:0}
        .signal-title{font-size:12px;font-weight:600;color:#d8eedd;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .signal-sub{font-family:'DM Mono',monospace;font-size:10px;color:#384e3c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .signal-meta{flex-shrink:0;text-align:right}
        .signal-type{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.1em;text-transform:uppercase}
        .signal-time{font-family:'DM Mono',monospace;font-size:9px;color:#6fa876;display:block;margin-top:2px}
      `}</style>
    </>
  )
}
