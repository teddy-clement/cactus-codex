import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

function ingestKey() {
  // Utilise CACTUS_CODEX_INGEST_KEY en priorité.
  // NE PAS utiliser AUTH_SECRET comme fallback — ce sont deux secrets distincts.
  const key = process.env.CACTUS_CODEX_INGEST_KEY
  if (!key) {
    console.warn('[Codex] CACTUS_CODEX_INGEST_KEY non définie — endpoint /api/public/signals désactivé')
  }
  return key || ''
}

export async function POST(req: NextRequest) {
  const header = req.headers.get('x-codex-ingest-key') || ''
  if (!ingestKey() || header !== ingestKey()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (typeof body.app_key !== 'string' || !body.app_key.trim()) {
    return NextResponse.json({ error: 'app_key requis.' }, { status: 400 })
  }
  const appKey = body.app_key.trim()
  const supabase = createServiceClient()

  const { data: app } = await supabase.from('apps').select('id').eq('app_key', appKey).single()
  if (!app) return NextResponse.json({ error: 'Application introuvable.' }, { status: 404 })

  const payload = {
    app_id: app.id,
    source: typeof body.source === 'string' ? body.source : appKey,
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
