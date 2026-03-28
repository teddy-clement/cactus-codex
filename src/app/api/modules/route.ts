import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

const allowedStatuses = new Set(['online', 'maintenance', 'offline'])

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('app_modules').select('*').order('path_prefix')
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
  if (!body.id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body.status === 'string' && allowedStatuses.has(body.status)) {
    updates.status = body.status
    if (body.status === 'online') updates.maintenance_message = null
  }
  if ('maintenance_message' in body) {
    updates.maintenance_message = typeof body.maintenance_message === 'string' && body.maintenance_message.trim()
      ? body.maintenance_message.trim() : null
  }
  if ('public_message' in body) {
    updates.public_message = typeof body.public_message === 'string' && body.public_message.trim()
      ? body.public_message.trim() : null
  }
  if (typeof body.reboot_required === 'boolean') updates.reboot_required = body.reboot_required
  updates.updated_at = new Date().toISOString()

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('app_modules').update(updates).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await log(data.status === 'maintenance' ? 'warn' : 'info', `Module ${data.module_key} — statut ${data.status}`, session.user.name)
  return NextResponse.json(data)
}
