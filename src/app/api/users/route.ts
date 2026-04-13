import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { hash } from '@node-rs/bcrypt'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('cc_users')
    .select('id, email, name, role, organisation, last_login, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const { email, name, role, organisation, password } = await req.json()
  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 })
  }

  const password_hash = await hash(password, 12)
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cc_users')
    .insert({ email: email.toLowerCase(), name, role, organisation, password_hash })
    .select('id, email, name, role, organisation, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const body = await req.json()
  const { id, name, role, organisation, new_password } = body
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const supabase = createServiceClient()
  const updates: Record<string, unknown> = {}

  if (name) updates.name = name
  if (role && ['SUPERADMIN', 'ADMIN', 'VIEWER'].includes(role)) updates.role = role
  if (organisation !== undefined) updates.organisation = organisation || null
  if (new_password) updates.password_hash = await hash(new_password, 12)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cc_users')
    .update(updates)
    .eq('id', id)
    .select('id, email, name, role, organisation, last_login, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
