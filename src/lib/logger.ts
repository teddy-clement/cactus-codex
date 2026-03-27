import { createServiceClient } from './supabase/server'

type LogLevel = 'ok' | 'info' | 'warn' | 'error'

export async function log(
  level: LogLevel,
  message: string,
  user: string = 'Système'
) {
  try {
    const supabase = createServiceClient()
    await supabase.from('activity_logs').insert({
      level,
      message,
      user,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[Logger] Erreur:', e)
  }
}
