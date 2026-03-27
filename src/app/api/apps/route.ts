import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('apps')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const body = await req.json()
  const { id, status, maintenance_message } = body
  if (!id || !status) return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })

  const supabase = createServiceClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'maintenance') {
    updates.maintenance_since = new Date().toISOString()
    updates.maintenance_message = maintenance_message || '🔧 Maintenance en cours. Retour très bientôt.'
    updates.maintenance_by = session.user.name
  } else if (status === 'online') {
    updates.maintenance_since = null
    updates.maintenance_message = null
    updates.maintenance_by = null
  }

  const { data, error } = await supabase
    .from('apps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const action = status === 'maintenance' ? 'mise en maintenance' : 'remise en ligne'
  await log(
    status === 'maintenance' ? 'warn' : 'ok',
    `App "${data.name}" ${action}`,
    session.user.name
  )

  return NextResponse.json(data)
}
