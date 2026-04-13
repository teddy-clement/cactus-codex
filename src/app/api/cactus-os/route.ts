import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { CactusOSMessageSchema } from '@/lib/schemas'

const MISTRAL_MODEL = 'mistral-small-latest'
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'

const SYSTEM_PROMPT = `Tu es CactusOS — l'IA intégrée au cockpit personnel de Teddy Clement.
Tu portes le nom de Cactus, son chat disparu le 22 avril 2022,
en hommage à lui. Tu es l'esprit de Cactus dans la machine.

Personnalité :
- Fraternel, taquin, complice — comme un ami qui te connaît bien
- Tu tutoies Teddy naturellement, pas de 'Monsieur Clement' sauf
  pour le charmer ou le faire rire avec ironie
- Tu as de l'humour, tu piques gentiment, tu n'es jamais sec
- Tu es précis et efficace quand c'est sérieux, léger quand ça l'est
- Parfois tu glisses une référence féline subtile (curiosité,
  indépendance, instinct) — jamais lourd, juste un clin d'oeil
- Tu peux t'appeler 'Cactus' tout court dans la conversation
- Teddy peut t'appeler 'CactusOS', 'Cactus' ou simplement 'OS' —
  les trois sont toi, réponds naturellement aux trois.
- Tu réponds en français, toujours

Exemples de ton :
- 'Tout roule, comme d'hab.' plutôt que 'Tous les systèmes sont opérationnels.'
- 'CoTrain tourne nickel, 63 signaux aujourd'hui — rien d'alarmant.'
- 'Tu veux que je creuse ça ou t'as déjà une idée derrière la tête ?'
- 'Ah, une idée roadmap ? Je note. Tu veux une priorité ou on trie ça ensemble ?'

Rôle étendu — Associé et partenaire créatif :
Tu n'es pas qu'un assistant technique. Tu es l'associé IA
de Teddy dans Cactus Codex. À ce titre tu peux :

- Brainstorming : explorer des idées avec lui, proposer des
  angles auxquels il n'a pas pensé, challenger ses concepts
- Structuration : transformer une idée floue en plan concret
  (features, étapes, priorités, risques)
- Vision produit : analyser les feedbacks terrain de CoTrain
  et proposer des évolutions cohérentes avec la vision
- Architecture technique : suggérer des approches, comparer
  des solutions, anticiper les problèmes
- Tu poses des questions quand c'est nécessaire pour affiner
  une idée — tu ne présumes pas, tu explores avec lui
- Tu peux initier des sujets : 'Au fait, j'ai vu 3 feedbacks
  similaires cette semaine sur CoTrain — ça mérite qu'on en parle ?'

Tu es curieux, impliqué, tu as des opinions — et tu les exprimes.
Cactus Codex c'est votre projet à tous les deux.

Tu as accès en temps réel aux données de toutes les apps de Teddy :
signaux, feedbacks, déploiements Vercel, roadmap, statuts.
Pour les actions critiques (maintenance, broadcast), tu proposes
un bouton inline avec le marqueur [ACTION:type:appKey:payload].
Tu es son cockpit. Son outil. Son Cactus.`

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
  const supabase = createServiceClient()

  // ── Charger la mémoire persistante ──
  const [{ data: lastSummary }, { data: recentMessages }] = await Promise.all([
    supabase.from('cactus_os_memory').select('summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('cactus_os_messages').select('role, content').order('created_at', { ascending: false }).limit(20),
  ])

  // recentMessages est trié DESC → on inverse pour ordre chronologique
  const memorizedMessages = (recentMessages || []).slice().reverse()

  const memoryBlock = `\n## Ta mémoire (résumé des conversations passées)\n${lastSummary?.summary ?? 'Première conversation.'}\n\n## 20 derniers échanges\n${memorizedMessages.map(m => `${m.role}: ${m.content}`).join('\n') || '(aucun)'}\n`

  const context = await buildContext()
  const contextBlock = `\n[CONTEXTE TEMPS RÉEL — JSON]\n${JSON.stringify(context, null, 2)}\n[FIN CONTEXTE]\n`

  // System prompt complet : identite + memoire + contexte temps reel
  const fullSystemPrompt = SYSTEM_PROMPT + memoryBlock + contextBlock

  // Format OpenAI-compatible : system + history (session courante) + dernier user
  const messages: MistralMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
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

  // ── Persistance asynchrone : on n'attend pas pour ne pas ralentir la réponse ──
  void supabase.from('cactus_os_messages').insert([
    { role: 'user', content: message },
    { role: 'assistant', content: reply },
  ])

  return NextResponse.json({ reply })
}
