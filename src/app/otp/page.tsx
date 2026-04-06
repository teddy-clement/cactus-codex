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
  const [resendError, setResendError] = useState('')
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
    setResendError('')
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 429) {
        setResendError('Trop de renvois. Patientez.')
      } else {
        setResendCooldown(60)
      }
    } catch {
      setResendError('Erreur réseau. Réessayez.')
    }
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
          <span className="font-mono text-[10px] text-[#384e3c]">Valable 10 minutes</span>
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
          className="btn-auth"
          onClick={() => submitCode()}
          disabled={loading || digits.join('').length !== 6}
        >
          {loading ? 'Vérification...' : 'Valider →'}
        </button>

        {resendError && <div className="auth-err mt-3">{resendError}</div>}

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
    </div>
  )
}
