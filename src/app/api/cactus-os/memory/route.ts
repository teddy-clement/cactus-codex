import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: lastSummary }, { count }] = await Promise.all([
    supabase
      .from('cactus_os_memory')
      .select('summary, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cactus_os_messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
  ])

  return NextResponse.json({
    lastSummary: lastSummary?.summary || null,
    summaryCreatedAt: lastSummary?.created_at || null,
    messageCount: count || 0,
  })
}
