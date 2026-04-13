import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

const MISTRAL_MODEL = 'mistral-small-latest'
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'

const SUMMARIZE_PROMPT = `Tu es CactusOS. Résume en moins de 500 mots les points clés de tes conversations des dernières 24h avec Teddy : décisions prises, idées explorées, problèmes résolus, sujets en cours, contexte important à retenir.
Sois concis et utile pour toi-même.`

type MistralResponse = {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string } | string
}

// Verifie le secret cron : Authorization: Bearer ${CRON_SECRET}
// Vercel Cron envoie automatiquement ce header si CRON_SECRET est defini en env vars.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const header = req.headers.get('authorization') || ''
  return header === `Bearer ${cronSecret}`
}

async function runSummarize(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'MISTRAL_API_KEY non configurée.' }, { status: 503 })
  }

  const supabase = createServiceClient()
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000)

  const { data: messages } = await supabase
    .from('cactus_os_messages')
    .select('role, content, created_at')
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString())
    .order('created_at', { ascending: true })

  const list = messages || []
  if (list.length < 5) {
    return NextResponse.json({ skipped: true, reason: 'Pas assez de messages (< 5).', count: list.length })
  }

  const transcript = list.map(m => `${m.role}: ${m.content}`).join('\n')

  let mistralData: MistralResponse
  try {
    const res = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: SUMMARIZE_PROMPT },
          { role: 'user', content: `Conversations des dernières 24h :\n\n${transcript}` },
        ],
        max_tokens: 800,
        temperature: 0.4,
      }),
    })
    mistralData = await res.json() as MistralResponse
    if (!res.ok) {
      const errMsg = typeof mistralData.error === 'string'
        ? mistralData.error
        : mistralData.error?.message || `Mistral ${res.status}`
      return NextResponse.json({ error: errMsg }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json({ error: `Mistral injoignable : ${String(e)}` }, { status: 503 })
  }

  const summary = mistralData.choices?.[0]?.message?.content?.trim()
  if (!summary) {
    return NextResponse.json({ error: 'Réponse Mistral vide.' }, { status: 502 })
  }

  const { error: insertError } = await supabase.from('cactus_os_memory').insert({
    summary,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await log('info', `CactusOS — résumé 24h sauvegardé (${list.length} messages, ${summary.length} chars)`, 'CactusOS')

  return NextResponse.json({
    ok: true,
    messages_summarized: list.length,
    summary_length: summary.length,
  })
}

// Vercel Cron utilise GET par défaut. POST exposé pour les déclenchements manuels.
export const GET = runSummarize
export const POST = runSummarize
