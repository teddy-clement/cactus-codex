import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50))
  const appFilter = url.searchParams.get('app')
  const offset = (page - 1) * limit

  const supabase = createServiceClient()
  let query = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })

  if (appFilter) {
    // activity_logs n'a pas de colonne app_key — match dans le message
    query = query.ilike('message', `%${appFilter}%`)
  }

  const { data, error, count } = await query
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], total: count || 0, page, limit })
}
