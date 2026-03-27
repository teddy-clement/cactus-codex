'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CactusLogo from '@/components/ui/CactusLogo'

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
        // Stocker l'email en session storage pour l'étape OTP
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
    <div className="auth-wrap">
      <div className="auth-grid" />
      <div className="auth-card animate-rise">
        <div className="auth-head">
          <CactusLogo size={76} />
          <div className="auth-brand">
            <div className="auth-name">CACTUS CODEX</div>
            <div className="auth-tag">Control Center — Accès restreint</div>
          </div>
        </div>
        <div className="auth-div" />
        <div className="auth-step">// <span>01</span> — Identification</div>

        {error && <div className="auth-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
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
          <div className="field">
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
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Vérification...' : 'Accéder →'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .auth-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: radial-gradient(ellipse 80% 55% at 50% 0%, rgba(26,74,46,.32) 0%, transparent 70%), #060d08;
        }
        .auth-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(#192b1b 1px, transparent 1px), linear-gradient(90deg, #192b1b 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 65% 65% at 50% 50%, black 30%, transparent 75%);
        }
        .auth-card {
          width: 416px;
          background: linear-gradient(160deg, #172019 0%, #111a12 100%);
          border: 1px solid #233428;
          border-radius: 13px;
          padding: 42px 38px 38px;
          position: relative;
          box-shadow: 0 0 0 1px rgba(74,222,128,.04), 0 24px 64px rgba(0,0,0,.65), 0 0 80px rgba(26,74,46,.12);
        }
        .auth-card::before {
          content: '';
          position: absolute; top: -1px; left: 18%; right: 18%; height: 2px;
          background: linear-gradient(90deg, transparent, #4ade80, transparent);
          opacity: .65; border-radius: 2px;
        }
        .auth-head { display: flex; flex-direction: column; align-items: center; gap: 13px; margin-bottom: 32px; }
        .auth-brand { text-align: center; }
        .auth-name { font-family: 'Barlow Condensed', sans-serif; font-size: 25px; font-weight: 800; color: #4ade80; letter-spacing: .08em; line-height: 1; }
        .auth-tag { font-family: 'DM Mono', monospace; font-size: 9px; color: #384e3c; letter-spacing: .26em; text-transform: uppercase; margin-top: 4px; }
        .auth-div { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, #233428, transparent); margin-bottom: 26px; }
        .auth-step { font-family: 'DM Mono', monospace; font-size: 10px; color: #384e3c; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 18px; }
        .auth-step span { color: #4ade80; }
        .auth-err { background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); border-radius: 5px; padding: 9px 13px; font-family: 'DM Mono', monospace; font-size: 11px; color: #ef4444; margin-bottom: 13px; }
        .field { margin-bottom: 15px; }
        .field label { display: block; font-family: 'DM Mono', monospace; font-size: 9px; color: #384e3c; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 6px; }
        .field input { width: 100%; background: #0a120c; border: 1px solid #233428; border-radius: 5px; padding: 11px 13px; color: #d8eedd; font-family: 'DM Mono', monospace; font-size: 12px; outline: none; transition: border-color .17s, box-shadow .17s; }
        .field input:focus { border-color: #2d6b45; box-shadow: 0 0 0 3px rgba(74,222,128,.07); }
        .field input::placeholder { color: #384e3c; }
        .btn { display: block; width: 100%; padding: 13px; background: #1a4a2e; color: #4ade80; border: 1px solid #2d6b45; border-radius: 5px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; transition: all .2s; margin-top: 6px; }
        .btn:hover:not(:disabled) { background: #2d6b45; color: #fff; box-shadow: 0 0 26px rgba(74,222,128,.18); transform: translateY(-1px); }
        .btn:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
