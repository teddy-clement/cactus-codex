import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { log } from '@/lib/logger'

const COTRAIN_WEBHOOK_URL = process.env.COTRAIN_WEBHOOK_URL || ''
const COTRAIN_WEBHOOK_SECRET = process.env.COTRAIN_WEBHOOK_SECRET || ''

// Base URL de CoTrain pour appeler ses API internes
function cotrainBase() {
  const url = COTRAIN_WEBHOOK_URL.replace('/api/codex/broadcast', '')
  return url || 'https://cotrain-vbeta.vercel.app'
}

// ── GET : liste les broadcasts actifs dans CoTrain ────────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const res = await fetch(`${cotrainBase()}/api/codex/broadcasts-list`, {
      headers: { 'x-codex-webhook-secret': COTRAIN_WEBHOOK_SECRET },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ error: `CoTrain a répondu ${res.status}` }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: `CoTrain injoignable : ${String(e)}` }, { status: 503 })
  }
}

// ── DELETE : désactive un broadcast dans CoTrain ─────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  try {
    const res = await fetch(`${cotrainBase()}/api/codex/broadcasts-list`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-codex-webhook-secret': COTRAIN_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) return NextResponse.json({ error: `CoTrain a refusé (${res.status})` }, { status: res.status })

    await log('ok', `Broadcast CoTrain #${id} désactivé depuis Codex`, session.user.name)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: `CoTrain injoignable : ${String(e)}` }, { status: 503 })
  }
}
