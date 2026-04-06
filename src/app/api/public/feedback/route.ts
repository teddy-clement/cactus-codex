import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function corsOrigin() {
  return process.env.ALLOWED_ORIGINS || ''
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin(),
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-codex-ingest-key',
    },
  })
}

export async function POST(req: NextRequest) {
  const ingestKey = process.env.CACTUS_CODEX_INGEST_KEY
  const header = req.headers.get('x-codex-ingest-key') || ''
  if (!ingestKey || header !== ingestKey) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (typeof body.app_key !== 'string' || !body.app_key.trim()) {
    return NextResponse.json({ error: 'app_key requis.' }, { status: 400 })
  }
  if (typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'message requis.' }, { status: 400 })
  }

  const severity = ['info', 'warn', 'critical'].includes(body.severity) ? body.severity : 'info'

  const supabase = createServiceClient()
  const { error } = await supabase.from('user_feedbacks').insert({
    app_key: body.app_key.trim(),
    user_email: typeof body.user_email === 'string' ? body.user_email : null,
    user_role: typeof body.user_role === 'string' ? body.user_role : null,
    message: body.message.trim(),
    severity,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, {
    headers: { 'Access-Control-Allow-Origin': corsOrigin() },
  })
}
