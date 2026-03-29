import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { App, AppModule, AppSignal } from '@/types'

// Headers CORS ajoutés sur CHAQUE réponse (OPTIONS et GET)
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

function slugify(input: string) {
  return input.normalize('NFD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/\s+/g, '-')
}

export async function GET(_: Request, { params }: { params: { appKey: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('apps').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  const app = ((data as App[]) || []).find((item) => (item.app_key || slugify(item.name)) === params.appKey)
  if (!app) return NextResponse.json({ error: 'Application introuvable.' }, { status: 404, headers: corsHeaders() })

  const [{ data: modules }, { data: signals }] = await Promise.all([
    supabase.from('app_modules').select('*').eq('app_id', app.id).order('path_prefix'),
    supabase.from('app_signals').select('*').eq('app_id', app.id).order('created_at', { ascending: false }).limit(20),
  ])

  const moduleList = (modules as AppModule[] | null) || []
  const signalList = (signals as AppSignal[] | null) || []

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
    modules: moduleList.map((m) => ({
      module_key: m.module_key,
      name: m.name,
      path_prefix: m.path_prefix,
      status: m.status,
      maintenance_message: m.maintenance_message,
      public_message: m.public_message,
      reboot_required: !!m.reboot_required,
    })),
    telemetry: {
      total_signals_24h: signalList.filter((s) => Date.now() - new Date(s.created_at).getTime() < 86400000).length,
      errors_24h: signalList.filter((s) => s.severity === 'error' && Date.now() - new Date(s.created_at).getTime() < 86400000).length,
      warnings_24h: signalList.filter((s) => s.severity === 'warn' && Date.now() - new Date(s.created_at).getTime() < 86400000).length,
      latest: signalList.slice(0, 5),
    },
    updated_at: new Date().toISOString(),
  }, { headers: corsHeaders() })
}
