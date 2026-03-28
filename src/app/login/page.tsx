'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Identifiants incorrects.')
        setPassword('')
      } else {
        sessionStorage.setItem('cc_pending_email', email)
        router.push('/otp')
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <div className="login-ambient login-ambient-a" />
      <div className="login-ambient login-ambient-b" />
      <div className="login-grid" />
      <div className="login-scanline" />

      <section className="login-panel animate-rise">
        <div className="login-hero">
          <div className="login-badge">Cactus Codex · Secure Access Node</div>
          <div className="login-logo-wrap">
            <Image
              src="/cactus-codex-logo.png"
              alt="Logo Cactus Codex"
              width={176}
              height={176}
              priority
              className="login-logo"
            />
          </div>
          <h1 className="login-title">CACTUS CODEX</h1>
          <p className="login-subtitle">Operational Control Platform</p>
          <p className="login-copy">
            Centre de pilotage premium pour applications, opérations, maintenance et supervision.
          </p>

          <div className="login-status-row" aria-hidden="true">
            <span className="login-status-dot animate-pulse-dot" />
            <span>Système sécurisé</span>
            <span className="login-status-sep" />
            <span>Accès restreint</span>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-top">
            <div>
              <div className="login-kicker">// 01 — Identification</div>
              <h2 className="login-card-title">Connexion au centre de contrôle</h2>
            </div>
            <div className="login-card-chip">Encrypted Session</div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="t.clement@cactus-codex.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              <span>{loading ? 'Vérification en cours…' : 'Accéder au système'}</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="login-card-footer">
            <span>Authentification sécurisée</span>
            <span>OTP requis à l’étape suivante</span>
          </div>
        </div>
      </section>
    </main>
  )
}
