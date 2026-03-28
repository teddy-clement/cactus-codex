import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function ingestKey() {
  return process.env.CACTUS_CODEX_INGEST_KEY || process.env.AUTH_SECRET || ''
}

export async function POST(req: NextRequest) {
  const header = req.headers.get('x-codex-ingest-key') || ''
  if (!ingestKey() || header !== ingestKey()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const appKey = typeof body.app_key === 'string' ? body.app_key : 'cotrain'
  const supabase = createServiceClient()

  const { data: app } = await supabase.from('apps').select('id').eq('app_key', appKey).single()
  if (!app) return NextResponse.json({ error: 'Application introuvable.' }, { status: 404 })

  const payload = {
    app_id: app.id,
    source: typeof body.source === 'string' ? body.source : 'cotrain',
    signal_type: typeof body.signal_type === 'string' ? body.signal_type : 'event',
    severity: body.severity === 'warn' || body.severity === 'error' ? body.severity : 'info',
    title: typeof body.title === 'string' ? body.title : 'Signal',
    body: typeof body.body === 'string' && body.body.trim() ? body.body.trim() : null,
    metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
  }

  const { error } = await supabase.from('app_signals').insert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
