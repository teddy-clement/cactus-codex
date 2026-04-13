import { createServiceClient } from './supabase/server'

/**
 * Rate limiter distribue via Supabase.
 * Fonctionne correctement sur Vercel serverless multi-instance.
 *
 * @param key   Identifiant unique (ex: "login:192.168.1.1", "otp:1.2.3.4")
 * @param max   Nombre maximum d'appels autorises dans la fenetre
 * @param windowMs Duree de la fenetre en millisecondes
 * @returns true si l'appel est autorise, false si la limite est atteinte
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const supabase = createServiceClient()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + windowMs)

  // Nettoyage opportuniste des entrees expirees (1 chance sur 20)
  if (Math.random() < 0.05) {
    await supabase.from('rate_limits').delete().lt('expires_at', now.toISOString())
  }

  // Lire l'entree existante
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('count, expires_at')
    .eq('key', key)
    .maybeSingle()

  // Pas d'entree OU fenetre expiree → nouvelle fenetre
  if (!existing || new Date(existing.expires_at) < now) {
    const { error } = await supabase
      .from('rate_limits')
      .upsert({ key, count: 1, window_start: now.toISOString(), expires_at: expiresAt.toISOString() })
    if (error) {
      console.error('[rateLimiter] upsert error:', error.message)
      // Fail-open : autoriser si la table echoue (mieux vaut laisser passer que bloquer tout le monde)
      return true
    }
    return true
  }

  // Fenetre active : verifier le compteur
  if (existing.count >= max) return false

  // Incrementer
  const { error } = await supabase
    .from('rate_limits')
    .update({ count: existing.count + 1 })
    .eq('key', key)
  if (error) {
    console.error('[rateLimiter] update error:', error.message)
    return true // Fail-open
  }

  return true
}
