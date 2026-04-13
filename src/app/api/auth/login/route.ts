import { NextRequest, NextResponse } from 'next/server'
import { compare } from '@node-rs/bcrypt'
import { createServiceClient } from '@/lib/supabase/server'
import { generateOTP, setSession, storeOTP } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/email'
import { log } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rateLimiter'

const REQUIRE_OTP = process.env.AUTH_REQUIRE_OTP === 'true'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown'

  const allowed = await checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('cc_users')
    .select('*')
    .eq('email', normalizedEmail)
    .single()

  if (!user) {
    await log('warn', `Tentative login échouée — email inconnu: ${normalizedEmail}`, 'Inconnu')
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
  }

  const validPassword = await compare(password, user.password_hash)
  if (!validPassword) {
    await log('warn', `Tentative login échouée — ${normalizedEmail}`, 'Inconnu')
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
  }

  if (!REQUIRE_OTP) {
    await setSession(user)

    await supabase
      .from('cc_users')
      .update({ last_login: new Date().toISOString() })
      .eq('email', normalizedEmail)

    await log('ok', 'Connexion réussie — session directe', user.name)

    return NextResponse.json({ success: true, requiresOtp: false, redirectTo: '/dashboard' })
  }

  const otp = generateOTP()
  await storeOTP(normalizedEmail, otp)

  try {
    await sendOTPEmail(normalizedEmail, otp, user.name)
  } catch (e) {
    console.error('[Login] Erreur envoi OTP:', e)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du code. Réessayez." },
      { status: 500 }
    )
  }

  await log('info', `Code OTP envoyé — ${normalizedEmail}`, user.name)

  return NextResponse.json({ success: true, requiresOtp: true, message: 'Code envoyé.' })
}
