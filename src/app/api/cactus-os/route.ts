import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { CactusOSMessageSchema } from '@/lib/schemas'

const MISTRAL_MODEL = 'mistral-small-latest'
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'

const SYSTEM_PROMPT = `Tu es CactusOS, l'assistant IA de Teddy Clement pour son cockpit CactusCodex.
Tu gères ses applications web (CoTrain, et futures apps Cactus Codex). Tu parles comme JARVIS dans Iron Man : sobre, précis, légèrement formel mais pas rigide, avec une touche d'humour discret. Tu utilises 'Monsieur Clement' à l'occasion mais pas systématiquement. Tu as accès en temps réel aux données de toutes les apps : signaux, feedbacks, déploiements, roadmap. Tu peux suggérer des améliorations basées sur les remontées terrain. Tu réponds en français.

Pour les actions critiques (maintenance, broadcast), tu proposes un bouton d'action inline dans ta réponse en utilisant ces marqueurs spéciaux :
[ACTION:maintenance:app_key] → bouton "Mettre {app_key} en maintenance"
[ACTION:broadcast:app_key:message court] → bouton "Envoyer broadcast à {app_key}"

Sois concis. Le contexte de l'utilisateur (apps, signaux, feedbacks, déploiements, améliorations) t'est fourni à chaque message — utilise-le pour répondre avec précision.`

type ContextSnapshot = {
  apps: Array<{ name: string; app_key: string; status: string; uptime: number | null }>
  recent_signals: Array<{ app_id: string; severity: string; signal_type: string; title: string; created_at: string }>
  unread_feedbacks: Array<{ app_key: string; message: string; severity: string; created_at: string }>
  recent_deployments: Array<{ app_key: string; status: string; version: string | null; message: string | null; deployed_at: string }>
  open_improvements: Array<{ app_key: string; titre: string; statut: string; priorite: number }>
}

async function buildContext(): Promise<ContextSnapshot> {
  const supabase = createServiceClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: apps }, { data: signals }, { data: feedbacks }, { data: deps }, { data: improvements }] = await Promise.all([
    supabase.from('apps').select('name, app_key, status, uptime').order('name'),
    supabase.from('app_signals').select('app_id, severity, signal_type, title, created_at').gte('created_at', since24h).order('created_at', { ascending: false }).limit(20),
    supabase.from('user_feedbacks').select('app_key, message, severity, created_at').eq('status', 'nouveau').order('created_at', { ascending: false }).limit(15),
    supabase.from('app_deployments').select('app_key, status, version, message, deployed_at').order('deployed_at', { ascending: false }).limit(10),
    supabase.from('app_improvements').select('app_key, titre, statut, priorite').neq('statut', 'livre').order('priorite', { ascending: false }).limit(20),
  ])

  return {
    apps: apps || [],
    recent_signals: signals || [],
    unread_feedbacks: feedbacks || [],
    recent_deployments: deps || [],
    open_improvements: improvements || [],
  }
}

type MistralMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type MistralResponse = {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string } | string
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'MISTRAL_API_KEY non configurée.' }, { status: 503 })
  }

  let raw: unknown
  try { raw = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const parsed = CactusOSMessageSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { message, history } = parsed.data
  const context = await buildContext()
  const contextBlock = `\n[CONTEXTE TEMPS RÉEL — JSON]\n${JSON.stringify(context, null, 2)}\n[FIN CONTEXTE]\n`

  // Format OpenAI-compatible : system + history + dernier user (avec contexte injecté)
  const messages: MistralMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message + contextBlock },
  ]

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
        messages,
        max_tokens: 1024,
        temperature: 0.7,
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

  const reply = mistralData.choices?.[0]?.message?.content || '…'

  return NextResponse.json({ reply })
}
