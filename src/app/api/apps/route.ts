import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

const allowedStatuses = new Set(['online', 'maintenance', 'offline'])

function normalizePatch(body: Record<string, unknown>, actor: string) {
  const updates: Record<string, unknown> = {}

  if (typeof body.status === 'string' && allowedStatuses.has(body.status)) {
    updates.status = body.status

    if (body.status === 'maintenance') {
      updates.maintenance_since = new Date().toISOString()
      updates.maintenance_by = actor
      updates.maintenance_message =
        typeof body.maintenance_message === 'string' && body.maintenance_message.trim().length > 0
          ? body.maintenance_message.trim()
          : '🔧 Maintenance en cours. Retour très bientôt.'
    }

    if (body.status === 'online') {
      updates.maintenance_since = null
      updates.maintenance_by = null
      updates.maintenance_message = null
    }
  }

  const textFields = [
    'maintenance_message',
    'public_login_message',
    'public_home_message',
    'control_note',
  ]

  for (const field of textFields) {
    if (field in body) {
      const value = body[field]
      updates[field] = typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
    }
  }

  const boolFields = ['login_notice_enabled', 'home_notice_enabled', 'reboot_required']
  for (const field of boolFields) {
    if (typeof body[field] === 'boolean') {
      updates[field] = body[field]
    }
  }

  if (body.last_restart_at === 'now') {
    updates.last_restart_at = new Date().toISOString()
    updates.reboot_required = false
  }

  return updates
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('apps').select('*').order('name')

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
  const { id } = body
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const supabase = createServiceClient()
  const updates = normalizePatch(body, session.user.name)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour.' }, { status: 400 })
  }

  const { data, error } = await supabase.from('apps').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const label = data.name || 'Application'

  if ('status' in updates) {
    const action = data.status === 'maintenance' ? 'mise en maintenance' : data.status === 'online' ? 'remise en ligne' : 'mise hors ligne'
    await log(data.status === 'maintenance' ? 'warn' : data.status === 'offline' ? 'error' : 'ok', `App "${label}" — ${action}`, session.user.name)
  }

  if ('public_login_message' in updates || 'public_home_message' in updates || 'login_notice_enabled' in updates || 'home_notice_enabled' in updates) {
    await log('info', `App "${label}" — messages publics mis à jour`, session.user.name)
  }

  if ('reboot_required' in updates) {
    await log(updates.reboot_required ? 'warn' : 'ok', `App "${label}" — drapeau redémarrage ${updates.reboot_required ? 'activé' : 'levé'}`, session.user.name)
  }

  if ('last_restart_at' in updates) {
    await log('ok', `App "${label}" — redémarrage confirmé`, session.user.name)
  }

  return NextResponse.json(data)
}
