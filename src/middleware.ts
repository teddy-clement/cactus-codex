import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

if (!process.env.AUTH_SECRET) {
  throw new Error('[FATAL] AUTH_SECRET manquant — impossible de vérifier les sessions. Définir AUTH_SECRET dans .env')
}
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)
const COOKIE_NAME = 'cc_session'
const SESSION_DURATION = 60 * 60 * 8              // 8h
const SESSION_REFRESH_THRESHOLD = 60 * 60 * 4     // 4h

const PUBLIC_ROUTES = [
  '/login',
  '/otp',
  '/api/auth/login',
  '/api/auth/otp',
  '/api/auth/logout',
  '/api/auth/resend-otp',
  '/api/public',
  '/api/health',
]

// Routes exemptees de la protection CSRF (webhooks externes + flow auth avant token)
const CSRF_EXEMPT_PREFIXES = [
  '/api/public/',  // webhooks depuis apps clientes (no Origin header possible)
  '/api/auth/',    // flow login / otp : Origin normalement present, mais exemption defensive
]

// Build CSP avec nonce dynamique (compatible Next.js inline scripts/styles)
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

// Verification CSRF : Origin ou Referer doit matcher le host courant
function checkCsrf(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  if (!host) return false

  // Comparer host de Origin (prioritaire) ou Referer avec le host courant
  const source = origin || referer
  if (!source) return false

  try {
    return new URL(source).host === host
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // ── Génération nonce + CSP pour chaque requête HTML/API ──
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
  const csp = buildCsp(nonce)

  // Transmet le nonce aux server components via header x-nonce
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // ── CSRF : verifier Origin sur POST/PATCH/DELETE depuis navigateur ──
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    const isExempt = CSRF_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))
    if (!isExempt && !checkCsrf(request)) {
      return NextResponse.json(
        { error: 'CSRF : origine non autorisee.' },
        { status: 403 }
      )
    }
  }

  // ── Routes publiques : bypass auth ──
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // ── Verification session ──
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, SECRET)

    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', csp)

    // ── Sliding expiration : refresh si age > 4h ──
    const iat = typeof payload.iat === 'number' ? payload.iat : 0
    const now = Math.floor(Date.now() / 1000)
    if (iat && now - iat >= SESSION_REFRESH_THRESHOLD) {
      const user = payload.user
      if (user) {
        try {
          const newToken = await new SignJWT({ user })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(now + SESSION_DURATION)
            .sign(SECRET)

          response.cookies.set(COOKIE_NAME, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_DURATION,
            path: '/',
          })
        } catch {
          // En cas d'echec du refresh, on laisse passer avec l'ancien token
        }
      }
    }

    return response
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts|images).*)',
  ],
}
