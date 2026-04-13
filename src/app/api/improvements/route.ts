import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { ImprovementCreateSchema, ImprovementPatchSchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const url = new URL(req.url)
  const appKey = url.searchParams.get('app_key')
  const statut = url.searchParams.get('statut')

  const supabase = createServiceClient()
  let query = supabase
    .from('app_improvements')
    .select('*', { count: 'exact' })

  if (appKey) query = query.eq('app_key', appKey)
  if (statut && ['idee', 'planifie', 'en_cours', 'livre'].includes(statut)) {
    query = query.eq('statut', statut)
  }

  const { data, error, count } = await query
    .order('priorite', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], total: count || 0 })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  let raw: unknown
  try { raw = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const parsed = ImprovementCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('app_improvements')
    .insert({
      ...parsed.data,
      created_by: session.user.name,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await log('info', `Nouvelle idée "${parsed.data.titre}" sur ${parsed.data.app_key}`, session.user.name)
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  let raw: unknown
  try { raw = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const parsed = ImprovementPatchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { id, ...fields } = parsed.data

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('app_improvements')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('app_improvements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
