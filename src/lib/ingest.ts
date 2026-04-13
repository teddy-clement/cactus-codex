import { createServiceClient } from './supabase/server'

export type IngestApp = { id: string; name: string; app_key: string }

export type IngestResult =
  | { ok: true; app: IngestApp }
  | { ok: false; status: number; error: string }

/**
 * Vérifie la clé d'ingestion pour une app donnée.
 * Priorité : apps.ingest_key (multi-apps).
 * Rétrocompat : si app_key === 'cotrain' ET ingest_key est NULL,
 * on accepte la clé globale CACTUS_CODEX_INGEST_KEY (migration 004 pré-exécutée sans rotation).
 */
export async function verifyIngest(headerKey: string, appKey: string): Promise<IngestResult> {
  if (!headerKey) return { ok: false, status: 403, error: 'Forbidden' }
  if (!appKey) return { ok: false, status: 400, error: 'app_key requis.' }

  const supabase = createServiceClient()
  const { data: app } = await supabase
    .from('apps')
    .select('id, name, app_key, ingest_key')
    .eq('app_key', appKey)
    .single()

  if (!app) return { ok: false, status: 404, error: 'Application introuvable.' }

  // Cas normal : ingest_key définie en DB → compare stricte
  if (app.ingest_key) {
    if (app.ingest_key !== headerKey) return { ok: false, status: 403, error: 'Forbidden' }
    return { ok: true, app: { id: app.id, name: app.name, app_key: app.app_key } }
  }

  // Rétrocompat : CoTrain sans ingest_key en DB → fallback env var globale
  if (appKey === 'cotrain') {
    const globalKey = process.env.CACTUS_CODEX_INGEST_KEY
    if (globalKey && headerKey === globalKey) {
      return { ok: true, app: { id: app.id, name: app.name, app_key: app.app_key } }
    }
  }

  return { ok: false, status: 403, error: 'Forbidden' }
}
