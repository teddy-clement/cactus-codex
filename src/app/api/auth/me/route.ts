import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { user } = session
  return NextResponse.json({
    email: user.email,
    name: user.name,
    role: user.role,
    organisation: user.organisation,
    last_login: user.last_login,
  })
}
