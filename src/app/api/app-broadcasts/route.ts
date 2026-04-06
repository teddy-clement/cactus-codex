import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { log } from '@/lib/logger'

// TODO: À terme, stocker webhook_url et webhook_secret dans la table `apps`
// pour supporter plusieurs apps. Pour l'instant, env vars uniquement.
const APP_WEBHOOK_URL = process.env.COTRAIN_WEBHOOK_URL || ''
const APP_WEBHOOK_SECRET = process.env.COTRAIN_WEBHOOK_SECRET || ''

function appBase() {
  const url = APP_WEBHOOK_URL.replace('/api/codex/broadcast', '')
  return url || ''
}

// ── GET : liste les broadcasts actifs dans l'app cliente ────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const base = appBase()
  if (!base) return NextResponse.json({ error: 'Webhook URL non configurée.' }, { status: 503 })

  try {
    const res = await fetch(`${base}/api/codex/broadcasts-list`, {
      headers: { 'x-codex-webhook-secret': APP_WEBHOOK_SECRET },
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

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const base = appBase()
  if (!base) return NextResponse.json({ error: 'Webhook URL non configurée.' }, { status: 503 })

  try {
    const res = await fetch(`${base}/api/codex/broadcasts-list`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-codex-webhook-secret': APP_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) return NextResponse.json({ error: `App a refusé (${res.status})` }, { status: res.status })

    await log('ok', `Broadcast #${id} désactivé depuis Codex`, session.user.name)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: `App injoignable : ${String(e)}` }, { status: 503 })
  }
}
