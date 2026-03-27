'use client'
import { useEffect, useRef } from 'react'

const SESSIONS = [42,58,37,70,55,88,33,47,63,80,54,91,68,45,75,82,71,84,88,76,83,90,98,87,93,85,79]

const ROLES = [
  { label: 'GEOPS',      pct: 34, color: '#4ade80' },
  { label: 'COSITE',     pct: 24, color: '#2d6b45' },
  { label: 'COMAN',      pct: 20, color: '#1a4a2e' },
  { label: 'ENCADRANT',  pct: 12, color: '#3b82f6' },
  { label: 'AFFICHAGE',  pct:  6, color: '#38bdf8' },
  { label: 'COPT',       pct:  4, color: '#2e4432' },
]

export default function AnalyticsPage() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.innerHTML = ''
    SESSIONS.forEach((v, i) => {
      const bar = document.createElement('div')
      bar.className = 'bar' + (i === SESSIONS.length - 1 ? ' bar-today' : '')
      bar.style.height = v + '%'
      chartRef.current!.appendChild(bar)
    })
  }, [])

  return (
    <>
      <div className="g4 mb">
        {[
          { icon:'👤', val:'47',    label:'Sessions actives',   delta:'↑ +12% vs S-1',      al:'#4ade80' },
          { icon:'📋', val:'312',   label:'RDRF / mois',        delta:'↑ +8% vs M-1',        al:'#3b82f6' },
          { icon:'⚡', val:'1.2s',  label:'Réponse moy.',       delta:'↓ Amélioration 0.3s', al:'#f59e0b' },
          { icon:'🚄', val:'98.1%', label:'Taux succès départs',delta:'30 derniers jours',   al:'#4ade80' },
        ].map((s, i) => (
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
          <div className="ph"><div className="pht">Sessions / jour — Mars 2026</div><div className="phg">// CoTrain production</div></div>
          <div className="panel-body">
            <div ref={chartRef} className="barchart" />
            <div className="chart-labels">
              <span>01/03</span><span>10/03</span><span>20/03</span><span>27/03</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Utilisation par rôle</div><div className="phg">// mars 2026</div></div>
          <div className="panel-body">
            {ROLES.map(r => (
              <div key={r.label} className="role-bar">
                <div className="rbl">{r.label}</div>
                <div className="rbb"><div className="rbf" style={{ width: r.pct + '%', background: r.color }} /></div>
                <div className="rbp">{r.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:17px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:17px}.mb{margin-bottom:17px}
        .stat{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:17px 19px;position:relative;overflow:hidden;transition:border-color .18s,transform .18s}
        .stat:hover{border-color:var(--border3);transform:translateY(-1px)}
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
        :global(.bar){flex:1;border-radius:2px 2px 0 0;min-height:3px;background:#1a4a2e;opacity:.72;transition:opacity .18s}
        :global(.bar:hover){opacity:1}
        :global(.bar-today){background:#4ade80;opacity:.9}
        .chart-labels{display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;margin-top:6px}
        .role-bar{display:flex;align-items:center;gap:11px;margin-bottom:11px}
        .role-bar:last-child{margin-bottom:0}
        .rbl{font-size:12px;color:#d8eedd;width:100px;flex-shrink:0}
        .rbb{flex:1;height:4px;background:var(--border2);border-radius:2px;overflow:hidden}
        .rbf{height:100%;border-radius:2px;transition:width 1.2s ease}
        .rbp{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;width:34px;text-align:right;flex-shrink:0}
      `}</style>
    </>
  )
}
