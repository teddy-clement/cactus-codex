import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

type VercelDeployment = {
  uid: string
  name: string
  url: string
  state: string
  readyState?: string
  created: number
  meta?: {
    githubCommitSha?: string
    githubCommitMessage?: string
    githubCommitRef?: string
  }
}

const APP_KEY = 'cotrain'  // Pour l'instant un seul projet Vercel mappe.
                            // À étendre quand d'autres apps auront leur VERCEL_*_PROJECT_ID.

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_COTRAIN_PROJECT_ID
  if (!token || !projectId) {
    return NextResponse.json({ error: 'VERCEL_TOKEN ou VERCEL_COTRAIN_PROJECT_ID manquant.' }, { status: 503 })
  }

  let deployments: VercelDeployment[] = []
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=10`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!res.ok) {
      const errBody = await res.text()
      return NextResponse.json({ error: `Vercel API ${res.status}: ${errBody}` }, { status: 502 })
    }
    const data = await res.json() as { deployments?: VercelDeployment[] }
    deployments = data.deployments || []
  } catch (e) {
    return NextResponse.json({ error: `Vercel injoignable : ${String(e)}` }, { status: 503 })
  }

  // Upsert dans app_deployments
  const supabase = createServiceClient()
  const rows = deployments.map(d => ({
    app_key: APP_KEY,
    deployment_id: d.uid,
    version: d.meta?.githubCommitSha?.slice(0, 7) || d.meta?.githubCommitRef || null,
    message: d.meta?.githubCommitMessage || null,
    status: d.readyState || d.state || 'UNKNOWN',
    deployed_at: new Date(d.created).toISOString(),
    url: d.url ? `https://${d.url}` : null,
  }))

  // Insert avec ON CONFLICT DO NOTHING (pas de UPSERT car le statut peut changer mais on n'est pas en charge)
  let synced = 0
  for (const row of rows) {
    const { error } = await supabase
      .from('app_deployments')
      .upsert(row, { onConflict: 'deployment_id', ignoreDuplicates: true })
    if (!error) synced++
  }

  await log('info', `Vercel sync : ${synced} déploiement(s) synchronisé(s)`, session.user.name)

  // Retourne les 10 derniers depuis la DB
  const { data: stored } = await supabase
    .from('app_deployments')
    .select('*')
    .eq('app_key', APP_KEY)
    .order('deployed_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ synced, deployments: stored || [] })
}
