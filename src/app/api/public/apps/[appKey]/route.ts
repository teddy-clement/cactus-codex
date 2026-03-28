import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { App } from '@/types'

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export async function GET(_: Request, { params }: { params: { appKey: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('apps').select('*').order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const app = ((data as App[]) || []).find((item) => {
    const key = item.app_key || slugify(item.name)
    return key === params.appKey
  })

  if (!app) return NextResponse.json({ error: 'Application introuvable.' }, { status: 404 })

  return NextResponse.json({
    key: app.app_key || slugify(app.name),
    name: app.name,
    status: app.status,
    env: app.env,
    maintenance_message: app.maintenance_message,
    login_notice_enabled: !!app.login_notice_enabled,
    home_notice_enabled: !!app.home_notice_enabled,
    public_login_message: app.public_login_message,
    public_home_message: app.public_home_message,
    reboot_required: !!app.reboot_required,
    last_restart_at: app.last_restart_at,
    updated_at: new Date().toISOString(),
  })
}
