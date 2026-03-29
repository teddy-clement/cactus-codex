import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const body = await req.json()
  const { app_id, app_name, scheduled_at, estimated_duration, message } = body

  if (!app_id || !app_name || !scheduled_at || !estimated_duration) {
    return NextResponse.json({ error: 'Champs requis : app_id, app_name, scheduled_at, estimated_duration.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .insert({
      app_id,
      app_name,
      scheduled_at,
      estimated_duration,
      message: message || null,
      created_by: session.user.name,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await log('info', `Maintenance planifiée pour "${app_name}" le ${new Date(scheduled_at).toLocaleString('fr-FR')}`, session.user.name)
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('maintenance_schedules').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await log('info', `Maintenance planifiée supprimée (id: ${id})`, session.user.name)
  return NextResponse.json({ ok: true })
}
