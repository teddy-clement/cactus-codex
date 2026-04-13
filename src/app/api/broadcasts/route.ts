import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { BroadcastSchema } from '@/lib/schemas'

// ── GET : liste des broadcasts envoyés depuis Codex ──────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error, count } = await supabase
    .from('codex_broadcasts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], total: count || 0, limit: 50 })
}

// ── POST : envoie un broadcast dans l'app cliente via son endpoint webhook ──
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const parsed = BroadcastSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { titre, message, niveau, expires_in_hours, app_key } = parsed.data

  // Charger webhook_url + webhook_secret depuis la table apps
  const supabase = createServiceClient()
  const { data: app } = await supabase
    .from('apps')
    .select('webhook_url, webhook_secret, name')
    .eq('app_key', app_key)
    .maybeSingle()

  const expires_at = new Date(Date.now() + expires_in_hours * 3600 * 1000).toISOString()

  // Si webhook_url null → skip silencieusement la livraison, on log quand meme
  let delivered = false
  let deliveryError: string | null = null

  if (!app?.webhook_url) {
    deliveryError = `Aucun webhook configuré pour l'app "${app_key}".`
  } else {
    try {
      const res = await fetch(app.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-codex-webhook-secret': app.webhook_secret || '',
        },
        body: JSON.stringify({ titre, message, niveau, expires_at, created_by: session.user.name }),
      })
      delivered = res.ok
      if (!res.ok) {
        const errBody = await res.text()
        deliveryError = `App a refusé la requête (${res.status}): ${errBody}`
      }
    } catch (e) {
      deliveryError = `Impossible de joindre l'app : ${String(e)}`
    }
  }

  // Log dans Codex independamment du resultat
  await supabase.from('codex_broadcasts').insert({
    titre,
    message,
    niveau,
    expires_at,
    created_by: session.user.name,
    delivered,
    error: deliveryError,
  })

  const appName = app?.name || app_key
  await log(
    delivered ? 'ok' : 'warn',
    `Broadcast Codex envoyé vers ${appName} — "${titre}" (${niveau})${delivered ? '' : ' — ÉCHEC livraison'}`,
    session.user.name
  )

  if (!delivered) {
    return NextResponse.json({
      ok: false,
      warning: `Broadcast enregistré mais la livraison vers ${appName} a échoué.`,
      detail: deliveryError,
    }, { status: 207 })
  }

  return NextResponse.json({ ok: true })
}
