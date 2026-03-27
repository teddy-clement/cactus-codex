import { NextResponse } from 'next/server'
import { clearSession, getSession } from '@/lib/auth'
import { log } from '@/lib/logger'

export async function POST() {
  const session = await getSession()
  if (session?.user) {
    await log('info', `Déconnexion — ${session.user.email}`, session.user.name)
  }
  await clearSession()
  return NextResponse.json({ success: true })
}
