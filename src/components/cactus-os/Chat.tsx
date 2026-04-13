'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { MessageContent } from './actions'

type Msg = { role: 'user' | 'assistant'; content: string }

interface ChatProps {
  variant?: 'panel' | 'page'
  onClose?: () => void
}

const WELCOME = "Salut. Tout tourne. CoTrain est en ligne, aucune alerte. Je suis là si t'as besoin — ou juste pour papoter. 🌵"

export default function CactusOSChat({ variant = 'panel', onClose }: ChatProps) {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const newHistory = [...messages, { role: 'user' as const, content: text }]
    setMessages(newHistory)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/cactus-os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages, // historique sans le nouveau message
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(m => [...m, { role: 'assistant', content: `⚠ ${data.error?.formErrors?.[0] || data.error || 'Erreur Gemini'}` }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '⚠ Connexion à Gemini impossible.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={variant === 'panel' ? 'flex flex-col h-full' : 'flex flex-col h-full'}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 p-1"
               style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)' }}>
            <Image
              src="/cactus-os-logo.png"
              alt="CactusOS"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-white tracking-wide">CactusOS</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1 h-1 rounded-full bg-[#4ade80] animate-pulse-dot" />
              <span className="font-mono text-[9px] text-[#6fa876] tracking-wider">Mistral · Connecté</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-md text-[#6fa876] hover:text-white hover:bg-white/5 transition-colors" aria-label="Fermer">
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 rounded-br-sm'
                  : 'bg-[#1a4a2e]/40 text-white border border-white/5 rounded-bl-sm'
              }`}
            >
              <MessageContent text={m.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#1a4a2e]/40 border border-white/5">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-3 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Demandez quelque chose…"
            disabled={loading}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-[#384e3c] focus:border-[#4ade80]/50 focus:outline-none transition-colors resize-none max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-lg bg-[#4ade80] text-black flex items-center justify-center hover:bg-[#4ade80]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Envoyer"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
