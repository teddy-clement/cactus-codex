'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CactusLogo from '@/components/ui/CactusLogo'

export default function OTPPage() {
  const router = useRouter()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [email, setEmail] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const pending = sessionStorage.getItem('cc_pending_email')
    if (!pending) { router.push('/login'); return }
    setEmail(pending)
    inputs.current[0]?.focus()
  }, [router])

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(r => r - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendCooldown])

  function onInput(val: string, i: number) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
    if (i === 5 && v) {
      // Auto-submit quand le dernier chiffre est saisi
      const code = [...next].join('')
      if (code.length === 6) submitCode(code)
    }
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  async function submitCode(code?: string) {
    const finalCode = code || digits.join('')
    if (finalCode.length !== 6) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: finalCode }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Code incorrect.')
        setDigits(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
      } else {
        sessionStorage.removeItem('cc_pending_email')
        router.push('/dashboard')
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  async function resendOTP() {
    if (resendCooldown > 0) return
    try {
      await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendCooldown(60)
    } catch {}
  }

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, '$1•••$2')
    : '•••@•••'

  return (
    <div className="auth-wrap">
      <div className="auth-grid" />
      <div className="auth-card animate-rise">
        <div className="auth-head">
          <CactusLogo size={56} />
          <div className="auth-brand">
            <div className="auth-name">CACTUS CODEX</div>
            <div className="auth-tag">Vérification en deux étapes</div>
          </div>
        </div>
        <div className="auth-div" />
        <div className="auth-step">// <span>02</span> — Code de vérification</div>

        <div className="otp-hint">
          Code à 6 chiffres envoyé à <strong>{maskedEmail}</strong>
          <br />
          <span style={{ fontSize: '10px', color: '#384e3c' }}>Valable 10 minutes</span>
        </div>

        {error && <div className="auth-err">{error}</div>}

        <div className="otp-row">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => onInput(e.target.value, i)}
              onKeyDown={e => onKeyDown(e, i)}
              className="otp-input"
            />
          ))}
        </div>

        <button
          className="btn"
          onClick={() => submitCode()}
          disabled={loading || digits.join('').length !== 6}
        >
          {loading ? 'Vérification...' : 'Valider →'}
        </button>

        <div
          className={`resend ${resendCooldown > 0 ? 'disabled' : ''}`}
          onClick={resendOTP}
        >
          {resendCooldown > 0
            ? `↻ Renvoyer dans ${resendCooldown}s`
            : '↻ Renvoyer un nouveau code'}
        </div>

        <div className="back-link" onClick={() => router.push('/login')}>
          ← Revenir à la connexion
        </div>
      </div>

      <style jsx>{`
        .auth-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; position:relative; background:radial-gradient(ellipse 80% 55% at 50% 0%,rgba(26,74,46,.32) 0%,transparent 70%),#060d08; }
        .auth-grid { position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(#192b1b 1px,transparent 1px),linear-gradient(90deg,#192b1b 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse 65% 65% at 50% 50%,black 30%,transparent 75%); }
        .auth-card { width:416px;background:linear-gradient(160deg,#172019 0%,#111a12 100%);border:1px solid #233428;border-radius:13px;padding:42px 38px 38px;position:relative;box-shadow:0 24px 64px rgba(0,0,0,.65); }
        .auth-card::before { content:'';position:absolute;top:-1px;left:18%;right:18%;height:2px;background:linear-gradient(90deg,transparent,#4ade80,transparent);opacity:.65;border-radius:2px; }
        .auth-head { display:flex;flex-direction:column;align-items:center;gap:13px;margin-bottom:32px; }
        .auth-brand { text-align:center; }
        .auth-name { font-family:'Barlow Condensed',sans-serif;font-size:25px;font-weight:800;color:#4ade80;letter-spacing:.08em;line-height:1; }
        .auth-tag { font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.26em;text-transform:uppercase;margin-top:4px; }
        .auth-div { width:100%;height:1px;background:linear-gradient(90deg,transparent,#233428,transparent);margin-bottom:26px; }
        .auth-step { font-family:'DM Mono',monospace;font-size:10px;color:#384e3c;letter-spacing:.2em;text-transform:uppercase;margin-bottom:18px; }
        .auth-step span { color:#4ade80; }
        .auth-err { background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:5px;padding:9px 13px;font-family:'DM Mono',monospace;font-size:11px;color:#ef4444;margin-bottom:13px; }
        .otp-hint { font-family:'DM Mono',monospace;font-size:11px;color:#6fa876;text-align:center;line-height:2;margin-bottom:20px; }
        .otp-hint strong { color:#4ade80; }
        .otp-row { display:flex;gap:8px;justify-content:center;margin-bottom:18px; }
        .otp-input { width:50px;height:60px;text-align:center;background:#0a120c;border:1px solid #233428;border-radius:5px;color:#4ade80;font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;outline:none;transition:border-color .15s,box-shadow .15s;caret-color:#4ade80; }
        .otp-input:focus { border-color:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.1); }
        .btn { display:block;width:100%;padding:13px;background:#1a4a2e;color:#4ade80;border:1px solid #2d6b45;border-radius:5px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-top:6px; }
        .btn:hover:not(:disabled) { background:#2d6b45;color:#fff;box-shadow:0 0 26px rgba(74,222,128,.18);transform:translateY(-1px); }
        .btn:disabled { opacity:.6;cursor:not-allowed; }
        .resend { text-align:center;margin-top:14px;font-family:'DM Mono',monospace;font-size:10px;color:#384e3c;cursor:pointer;letter-spacing:.1em;transition:color .2s; }
        .resend:hover:not(.disabled) { color:#6fa876; }
        .resend.disabled { cursor:default;opacity:.5; }
        .back-link { text-align:center;margin-top:10px;font-family:'DM Mono',monospace;font-size:10px;color:#384e3c;cursor:pointer;transition:color .2s; }
        .back-link:hover { color:#6fa876; }
      `}</style>
    </div>
  )
}
