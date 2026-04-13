import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const timestamp = new Date().toISOString()
  const version = process.env.npm_package_version || '1.0.0'

  // Ping Supabase avec un timeout de 3s
  const supabase = createServiceClient()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  let db: 'connected' | 'error' = 'connected'
  let status: 'ok' | 'degraded' = 'ok'

  try {
    const { error } = await supabase
      .from('apps')
      .select('id', { count: 'exact', head: true })
      .abortSignal(controller.signal)

    if (error) {
      db = 'error'
      status = 'degraded'
    }
  } catch {
    db = 'error'
    status = 'degraded'
  } finally {
    clearTimeout(timeoutId)
  }

  return NextResponse.json(
    { status, db, timestamp, version },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
