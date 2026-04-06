import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP, setSession, getUserByEmail } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// ── Rate limiting : 5 tentatives OTP / IP / 15 min ──
const otpAttempts = new Map<string, { count: number; resetAt: number }>()

function checkOtpRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = otpAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    otpAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown'

  if (!checkOtpRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }
  let body: { email?: string; code?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const { email, code } = body
  if (!email || !code) {
    return NextResponse.json({ error: 'Email et code requis.' }, { status: 400 })
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Code invalide.' }, { status: 400 })
  }

  const valid = await verifyOTP(email, code)
  if (!valid) {
    await log('warn', `Code OTP invalide — ${email}`, 'Inconnu')
    return NextResponse.json({ error: 'Code incorrect ou expiré.' }, { status: 401 })
  }

  const user = await getUserByEmail(email)
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }

  // Mettre à jour last_login
  const supabase = createServiceClient()
  await supabase
    .from('cc_users')
    .update({ last_login: new Date().toISOString() })
    .eq('email', email)

  // Créer la session JWT
  await setSession(user)

  await log('ok', `Connexion réussie — 2FA validé`, user.name)

  return NextResponse.json({ success: true })
}
