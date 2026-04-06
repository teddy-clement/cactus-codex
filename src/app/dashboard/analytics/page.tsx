'use client'
import { useEffect, useState, useCallback } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useToast } from '@/components/ui/Toast'
import CountUp from '@/components/ui/CountUp'

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

const SEVERITY_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#4ade80' }
const PIE_COLORS = ['#4ade80', '#2d6b45', '#f59e0b', '#3b82f6', '#38bdf8', '#ef4444', '#a855f7', '#6fa876']

const tooltipStyle = {
  contentStyle: { background: '#111a12', border: '1px solid #233428', borderRadius: 8, fontFamily: 'DM Mono, monospace', fontSize: 11 },
  labelStyle: { color: '#6fa876' },
  itemStyle: { color: '#d8eedd' },
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { showToast } = useToast()

  const loadData = useCallback(async (silent = false) => {
    try {
      const res = await fetch('/api/analytics')
      const d: AnalyticsData = await res.json()
      setData(d)
      if (!silent) setLoading(false)
    } catch {
      if (!silent) { setLoading(false); setError(true); showToast('Erreur de chargement des analytics', 'er') }
    }
  }, [showToast])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh 30s
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 30000)
    return () => clearInterval(interval)
  }, [loadData])

  if (loading) return <div className="p-6 text-[#6fa876] font-mono text-xs">Chargement...</div>
  if (error || !data) return <div className="p-6 text-red-500 font-mono text-xs">Erreur de chargement</div>

  const { summary } = data

  const stats = [
    { icon: '📡', val: summary.signals_24h, label: 'Signaux (24h)', delta: `${summary.errors_24h} err · ${summary.warnings_24h} warn`, al: summary.errors_24h > 0 ? '#ef4444' : '#4ade80' },
    { icon: '👁', val: summary.page_views_30d, label: 'Pages vues (30j)', delta: `${summary.total_signals_30d} signaux totaux`, al: '#3b82f6' },
    { icon: '🔑', val: summary.logins_30d, label: 'Connexions (30j)', delta: `${summary.active_heartbeats_24h} heartbeats actifs`, al: '#4ade80' },
    { icon: '⚡', val: summary.total_signals_30d, label: 'Signaux totaux (30j)', delta: data.by_type[0]?.type || 'Aucun signal', al: '#f59e0b' },
  ]

  const chartData = data.by_day.map(d => ({ name: d.date.slice(5), views: d.count }))
  const pieData = data.by_type.slice(0, 6).map(t => ({ name: t.type, value: t.count }))

  return (
    <>
      {/* ── Stats cards avec CountUp ── */}
      <div className="g4 mb">
        {stats.map((s, i) => (
          <div key={i} className="stat" style={{ '--al': s.al } as React.CSSProperties}>
            <div className="si">{s.icon}</div>
            <div className="sv"><CountUp value={s.val} /></div>
            <div className="sl">{s.label}</div>
            <div className="sd">{s.delta}</div>
          </div>
        ))}
      </div>

      {/* ── Area Chart + Pie Chart ── */}
      <div className="g2">
        <div className="panel">
          <div className="ph"><div className="pht">Activite / jour — 30 derniers jours</div><div className="phg">// production</div></div>
          <div className="panel-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#384e3c', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#384e3c', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="views" stroke="#4ade80" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: '#4ade80', stroke: '#111a12', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Signaux par type</div><div className="phg">// 30 derniers jours</div></div>
          <div className="panel-body flex items-center gap-6" style={{ height: 220 }}>
            {pieData.length > 0 ? (
              <>
                <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {pieData.map((t, i) => (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="font-mono text-[10px] text-[#d8eedd] flex-1 truncate">{t.name}</span>
                      <span className="font-mono text-[10px] text-[#6fa876]">{t.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="font-mono text-[11px] text-[#384e3c]">Aucun signal pour le moment</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bar chart distribution par severity ── */}
      <div className="panel mt-[17px]">
        <div className="ph"><div className="pht">Distribution par severite</div><div className="phg">// 24 dernieres heures</div></div>
        <div className="panel-body" style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Erreurs', count: summary.errors_24h, fill: '#ef4444' },
              { name: 'Warnings', count: summary.warnings_24h, fill: '#f59e0b' },
              { name: 'Signaux', count: summary.signals_24h, fill: '#4ade80' },
            ]} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: '#384e3c', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#6fa876', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                {[0, 1, 2].map(i => <Cell key={i} fill={['#ef4444', '#f59e0b', '#4ade80'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Derniers signaux ── */}
      <div className="panel mt-[17px]">
        <div className="ph"><div className="pht">Derniers signaux</div><div className="phg">// 20 plus recents</div></div>
        <div className="signal-list">
          {data.latest.length === 0 && <div className="empty">Aucun signal recu.</div>}
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
