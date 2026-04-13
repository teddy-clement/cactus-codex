'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Dynamic import recharts (pas de SSR)
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })

interface ActivitySparklineProps {
  data?: { date: string; count: number }[]
}

export default function ActivitySparkline({ data: initialData }: ActivitySparklineProps) {
  const [data, setData] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) {
      setData(initialData.slice(-7).map(d => ({ name: d.date.slice(5), value: d.count })))
      return
    }
    fetch('/api/analytics')
      .then(r => r.json())
      .then((json: { by_day: { date: string; count: number }[] }) => {
        setData(json.by_day.slice(-7).map(d => ({ name: d.date.slice(5), value: d.count })))
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [initialData])

  if (loading) {
    return <div className="h-16 flex items-center justify-center font-mono text-[10px] text-[#6fa876]">Chargement…</div>
  }

  if (data.length === 0) {
    return <div className="h-16 flex items-center justify-center font-mono text-[10px] text-[#6fa876]">Pas de données</div>
  }

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={1} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              background: '#111a12',
              border: '1px solid #233428',
              borderRadius: 6,
              fontSize: 10,
              fontFamily: 'DM Mono, monospace',
              padding: '4px 8px',
            }}
            labelStyle={{ color: '#6fa876' }}
            itemStyle={{ color: '#4ade80' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="url(#sparkline-gradient)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: '#4ade80', stroke: '#111a12', strokeWidth: 1 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
