import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// ── GET : liste des broadcasts envoyés depuis Codex ──────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('codex_broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// ── POST : envoie un broadcast dans CoTrain via son endpoint webhook ──────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const body = await req.json()
  const { titre, message, niveau, expires_in_hours = 4 } = body

  if (!titre || !message || !niveau) {
    return NextResponse.json({ error: 'Champs requis : titre, message, niveau.' }, { status: 400 })
  }
  if (!['faible', 'moyen', 'important'].includes(niveau)) {
    return NextResponse.json({ error: 'niveau doit être : faible | moyen | important' }, { status: 400 })
  }

  const cotrainWebhookUrl = process.env.COTRAIN_WEBHOOK_URL || ''
  const cotrainWebhookSecret = process.env.COTRAIN_WEBHOOK_SECRET || ''

  if (!cotrainWebhookUrl) {
    return NextResponse.json({ error: 'COTRAIN_WEBHOOK_URL non configurée.' }, { status: 500 })
  }

  const expires_at = new Date(Date.now() + expires_in_hours * 3600 * 1000).toISOString()

  // Appel vers CoTrain
  let cotrainOk = false
  let cotrainError = null
  try {
    const res = await fetch(cotrainWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codex-webhook-secret': cotrainWebhookSecret,
      },
      body: JSON.stringify({ titre, message, niveau, expires_at, created_by: session.user.name }),
    })
    cotrainOk = res.ok
    if (!res.ok) {
      const errBody = await res.text()
      cotrainError = `CoTrain a refusé la requête (${res.status}): ${errBody}`
    }
  } catch (e) {
    cotrainError = `Impossible de joindre CoTrain : ${String(e)}`
  }

  // Log dans Codex indépendamment du résultat
  const supabase = createServiceClient()
  await supabase.from('codex_broadcasts').insert({
    titre,
    message,
    niveau,
    expires_at,
    created_by: session.user.name,
    delivered: cotrainOk,
    error: cotrainError,
  })

  await log(
    cotrainOk ? 'ok' : 'warn',
    `Broadcast Codex envoyé vers CoTrain — "${titre}" (${niveau})${cotrainOk ? '' : ' — ÉCHEC livraison'}`,
    session.user.name
  )

  if (!cotrainOk) {
    return NextResponse.json({
      ok: false,
      warning: 'Broadcast enregistré mais la livraison vers CoTrain a échoué.',
      detail: cotrainError,
    }, { status: 207 })
  }

  return NextResponse.json({ ok: true })
}
