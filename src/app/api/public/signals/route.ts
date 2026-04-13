import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { SignalIngestSchema } from '@/lib/schemas'
import { verifyIngest } from '@/lib/ingest'

// ── CORS : origines autorisées uniquement ──
function corsOrigin() {
  const origins = process.env.ALLOWED_ORIGINS
  if (!origins) {
    console.warn('[Codex] ALLOWED_ORIGINS non défini — CORS refusé par défaut')
    return ''
  }
  return origins
}

// OPTIONS — preflight CORS
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
  let raw: unknown
  try { raw = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const parsed = SignalIngestSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { app_key: appKey, source, signal_type, severity, title, body, metadata } = parsed.data

  // Vérification ingest_key per-app (avec fallback CoTrain pré-migration)
  const header = req.headers.get('x-codex-ingest-key') || ''
  const auth = await verifyIngest(header, appKey)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const payload = {
    app_id: auth.app.id,
    source: source ?? appKey,
    signal_type,
    severity,
    title,
    body: body ? body.trim() || null : null,
    metadata,
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('app_signals').insert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
