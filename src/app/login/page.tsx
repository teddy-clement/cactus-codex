'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AmbientOrbs from '@/components/dashboard/AmbientOrbs'

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
      } else if (data.requiresOtp) {
        sessionStorage.setItem('cc_pending_email', email)
        router.push('/otp')
      } else {
        sessionStorage.removeItem('cc_pending_email')
        router.push(data.redirectTo || '/dashboard')
        router.refresh()
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono placeholder-[#384e3c] focus:border-[#4ade80]/50 focus:outline-none focus:bg-white/[0.07] transition-all'

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0f0a' }}>
      <AmbientOrbs />

      <section className="relative z-10 w-full max-w-md animate-slideUp">
        <div className="glass p-7 md:p-8" style={{ borderRadius: 20 }}>
          {/* Logo + nom */}
          <div className="flex flex-col items-center text-center mb-7">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'radial-gradient(circle at 30% 20%, rgba(74,222,128,.2), transparent 60%), #0c1610',
                border: '1px solid rgba(74,222,128,.25)',
                boxShadow: '0 0 40px rgba(74,222,128,.1)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logoseulblanc-cactuscodex.png" alt="Cactus Codex" width={42} height={42} className="object-contain" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white tracking-[0.08em]">CACTUS CODEX</h1>
            <p className="font-mono text-[10px] text-[#6fa876] tracking-[0.24em] uppercase mt-1.5">
              Operational Control Center
            </p>
          </div>

          {/* Status pulse */}
          <div className="flex items-center justify-center gap-2 mb-6 pb-6 border-b border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse-dot" style={{ boxShadow: '0 0 8px rgba(74,222,128,.6)' }} />
            <span className="font-mono text-[10px] text-[#6fa876] tracking-wider">Système sécurisé · Session chiffrée</span>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/5 font-mono text-[11px] text-red-400 animate-fadeIn">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nom@cactus-codex.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="password" className="font-mono text-[9px] text-[#6fa876] tracking-wider uppercase mb-1.5 block">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-lg bg-[#4ade80] text-black font-display font-bold tracking-[0.12em] uppercase text-sm hover:bg-[#4ade80]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: '0 8px 32px rgba(74,222,128,.2)' }}
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                  <span>Ouverture…</span>
                </>
              ) : (
                <>
                  <span>Accéder au cockpit</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
            <span className="font-mono text-[9px] text-[#6fa876] tracking-wider">2FA · OTP</span>
            <span className="font-mono text-[9px] text-[#6fa876] tracking-wider">Cactus Codex © 2026</span>
          </div>
        </div>
      </section>
    </main>
  )
}
