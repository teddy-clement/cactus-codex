import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createServiceClient } from './supabase/server'
import type { CCUser, Session } from '@/types'

if (!process.env.AUTH_SECRET) {
  throw new Error('[FATAL] AUTH_SECRET manquant — impossible de signer les sessions. Définir AUTH_SECRET dans .env')
}
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)
export const COOKIE_NAME = 'cc_session'
export const SESSION_DURATION = 60 * 60 * 8 // 8 heures (secondes)
// Seuil de refresh : a mi-chemin de la fenetre (4h) on emet un nouveau token
export const SESSION_REFRESH_THRESHOLD = 60 * 60 * 4

// ── Créer un token JWT signé ──────────────────────────
export async function createSessionToken(user: CCUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION)
    .sign(SECRET)
}

// ── Vérifier & décoder un token ──────────────────────
export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as Session
  } catch {
    return null
  }
}

// ── Refresh sliding : emet un nouveau token si l'actuel a plus de 4h ──
// Retourne le nouveau token si refresh necessaire, null si le token existant
// est encore suffisamment jeune (ou invalide).
export async function refreshSession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const iat = typeof payload.iat === 'number' ? payload.iat : 0
    const now = Math.floor(Date.now() / 1000)
    const age = now - iat

    if (age < SESSION_REFRESH_THRESHOLD) return null

    const user = (payload as unknown as Session).user
    if (!user) return null

    return new SignJWT({ user })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(now + SESSION_DURATION)
      .sign(SECRET)
  } catch {
    return null
  }
}

// ── Lire la session depuis le cookie ─────────────────
export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// ── Créer la session (set cookie) ────────────────────
export async function setSession(user: CCUser) {
  const token = await createSessionToken(user)
  const cookieStore = cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  })
}

// ── Supprimer la session ──────────────────────────────
export async function clearSession() {
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ── Générer un code OTP 6 chiffres ───────────────────
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ── Stocker l'OTP en base ────────────────────────────
export async function storeOTP(email: string, otp: string) {
  const supabase = createServiceClient()
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

  await supabase
    .from('otp_codes')
    .upsert({ email, code: otp, expires_at, used: false }, { onConflict: 'email' })
}

// ── Vérifier l'OTP ───────────────────────────────────
export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) return false

  // Marquer comme utilisé
  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('email', email)

  return true
}

// ── Récupérer un user par email ──────────────────────
export async function getUserByEmail(email: string): Promise<CCUser | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('cc_users')
    .select('*')
    .eq('email', email)
    .single()
  return data as CCUser | null
}
