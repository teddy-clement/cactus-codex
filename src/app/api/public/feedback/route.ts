import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyIngest } from '@/lib/ingest'

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
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  if (typeof body.app_key !== 'string' || !body.app_key.trim()) {
    return NextResponse.json({ error: 'app_key requis.' }, { status: 400 })
  }
  if (typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'message requis.' }, { status: 400 })
  }

  const appKey = body.app_key.trim()

  // Vérification ingest_key per-app (avec fallback CoTrain pré-migration)
  const header = req.headers.get('x-codex-ingest-key') || ''
  const auth = await verifyIngest(header, appKey)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const severity = typeof body.severity === 'string' && ['info', 'warn', 'critical'].includes(body.severity)
    ? body.severity
    : 'info'

  const supabase = createServiceClient()
  const { error } = await supabase.from('user_feedbacks').insert({
    app_key: appKey,
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
