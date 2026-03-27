import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { generateOTP, storeOTP } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/email'
import { log } from '@/lib/logger'

// Limite : 5 tentatives par IP toutes les 15 min
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  let body: { email?: string; password?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }) }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Récupérer l'utilisateur
  const { data: user } = await supabase
    .from('cc_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (!user) {
    await log('warn', `Tentative login échouée — email inconnu: ${email}`, 'Inconnu')
    // Réponse générique pour éviter l'énumération d'emails
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
  }

  // Vérifier le mot de passe
  const validPassword = await bcrypt.compare(password, user.password_hash)
  if (!validPassword) {
    await log('warn', `Tentative login échouée — ${email}`, 'Inconnu')
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
  }

  // Générer et envoyer l'OTP
  const otp = generateOTP()
  await storeOTP(email, otp)

  try {
    await sendOTPEmail(email, otp, user.name)
  } catch (e) {
    console.error('[Login] Erreur envoi OTP:', e)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du code. Réessayez.' },
      { status: 500 }
    )
  }

  await log('info', `Code OTP envoyé — ${email}`, user.name)

  return NextResponse.json({ success: true, message: 'Code envoyé.' })
}
