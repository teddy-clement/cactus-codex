import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const url = new URL(req.url)
  const appKey = url.searchParams.get('app_key')
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10))

  const supabase = createServiceClient()
  let query = supabase
    .from('app_deployments')
    .select('*', { count: 'exact' })
    .order('deployed_at', { ascending: false })
    .limit(limit)

  if (appKey) query = query.eq('app_key', appKey)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [], total: count || 0 })
}
