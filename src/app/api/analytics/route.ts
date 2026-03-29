import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()

  // Récupère les signaux des 30 derniers jours
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: signals } = await supabase
    .from('app_signals')
    .select('*')
    .gte('created_at', since30d)
    .order('created_at', { ascending: true })

  const all = signals || []

  // Sessions approximées par heartbeat (1 heartbeat = 1 session active à ce moment)
  const heartbeats = all.filter(s => s.signal_type === 'heartbeat')
  const pageViews = all.filter(s => s.signal_type === 'page_view')
  const loginSuccess = all.filter(s => s.signal_type === 'login_success')
  const errors24h = all.filter(s => s.severity === 'error' && s.created_at >= since24h)
  const warnings24h = all.filter(s => s.severity === 'warn' && s.created_at >= since24h)
  const signals24h = all.filter(s => s.created_at >= since24h)

  // Agréger par jour (30 derniers jours)
  const dayMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dayMap[key] = 0
  }
  for (const s of pageViews) {
    const key = s.created_at.slice(0, 10)
    if (key in dayMap) dayMap[key]++
  }

  // Distribution par signal_type
  const typeCounts: Record<string, number> = {}
  for (const s of all) {
    typeCounts[s.signal_type] = (typeCounts[s.signal_type] || 0) + 1
  }

  // Derniers signaux (toutes sévérités)
  const latest = [...all].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 20)

  return NextResponse.json({
    summary: {
      total_signals_30d: all.length,
      page_views_30d: pageViews.length,
      logins_30d: loginSuccess.length,
      active_heartbeats_24h: heartbeats.filter(s => s.created_at >= since24h).length,
      errors_24h: errors24h.length,
      warnings_24h: warnings24h.length,
      signals_24h: signals24h.length,
    },
    by_day: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
    by_type: Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    latest,
  })
}
