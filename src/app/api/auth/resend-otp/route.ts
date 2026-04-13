import { NextRequest, NextResponse } from 'next/server'
import { generateOTP, storeOTP, getUserByEmail } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimiter'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown'

  const allowed = await checkRateLimit(`resend-otp:${ip}`, 3, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de renvois. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  let body: { email?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const { email } = body
  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  const user = await getUserByEmail(email)
  if (!user) return NextResponse.json({ success: true }) // Silencieux — pas d'énumération

  const otp = generateOTP()
  await storeOTP(email, otp)
  await sendOTPEmail(email, otp, user.name)

  return NextResponse.json({ success: true })
}
