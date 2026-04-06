import { NextRequest, NextResponse } from 'next/server'
import { generateOTP, storeOTP, getUserByEmail } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/email'

// ── Rate limiting : 3 renvois OTP / IP / 15 min ──
const resendAttempts = new Map<string, { count: number; resetAt: number }>()

function checkResendRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = resendAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    resendAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown'

  if (!checkResendRateLimit(ip)) {
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
