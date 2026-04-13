import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// Charge webhook_url + webhook_secret depuis la table apps pour l'app_key donnee.
// app_key est passe en query param ?app=cotrain (defaut: 'cotrain' pour retrocompat).
async function loadWebhook(appKey: string): Promise<{ url: string; secret: string } | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('apps')
    .select('webhook_url, webhook_secret')
    .eq('app_key', appKey)
    .maybeSingle()

  if (!data || !data.webhook_url) return null
  return { url: data.webhook_url, secret: data.webhook_secret || '' }
}

function base(url: string) {
  return url.replace('/api/codex/broadcast', '')
}

// ── GET : liste les broadcasts actifs dans l'app cliente ────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const url = new URL(req.url)
  const appKey = url.searchParams.get('app') || 'cotrain'

  const webhook = await loadWebhook(appKey)
  if (!webhook) return NextResponse.json({ error: `Aucun webhook configuré pour l'app "${appKey}".` }, { status: 503 })

  try {
    const res = await fetch(`${base(webhook.url)}/api/codex/broadcasts-list`, {
      headers: { 'x-codex-webhook-secret': webhook.secret },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ error: `App a répondu ${res.status}` }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: `App injoignable : ${String(e)}` }, { status: 503 })
  }
}

// ── DELETE : désactive un broadcast dans l'app cliente ──────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const body = await req.json()
  const { id, app: appKey = 'cotrain' } = body
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const webhook = await loadWebhook(appKey)
  if (!webhook) return NextResponse.json({ error: `Aucun webhook configuré pour l'app "${appKey}".` }, { status: 503 })

  try {
    const res = await fetch(`${base(webhook.url)}/api/codex/broadcasts-list`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-codex-webhook-secret': webhook.secret,
      },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) return NextResponse.json({ error: `App a refusé (${res.status})` }, { status: res.status })

    await log('ok', `Broadcast #${id} désactivé sur "${appKey}" depuis Codex`, session.user.name)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: `App injoignable : ${String(e)}` }, { status: 503 })
  }
}
