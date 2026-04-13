'use client'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { useToast } from '@/components/ui/Toast'

// Marqueurs supportes :
//   [ACTION:maintenance:app_key]
//   [ACTION:broadcast:app_key:message]
const ACTION_RE = /\[ACTION:([a-z_-]+):([a-z0-9_-]+)(?::([^\]]+))?\]/gi

interface ActionMatch {
  raw: string
  type: string
  appKey: string
  payload?: string
  index: number
}

function parseActions(text: string): { segments: Array<string | ActionMatch> } {
  const segments: Array<string | ActionMatch> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  ACTION_RE.lastIndex = 0
  while ((match = ACTION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index))
    }
    segments.push({
      raw: match[0],
      type: match[1],
      appKey: match[2],
      payload: match[3],
      index: match.index,
    })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }
  return { segments }
}

function ActionButton({ action }: { action: ActionMatch }) {
  const { showToast } = useToast()
  const [running, setRunning] = React.useState(false)

  async function execute() {
    setRunning(true)
    try {
      if (action.type === 'maintenance') {
        // Charger l'app pour récupérer son ID puis bascule le status
        const appsRes = await fetch('/api/apps').then(r => r.json())
        const list = (Array.isArray(appsRes) ? appsRes : appsRes.data || []) as Array<{ id: string; app_key: string; name: string }>
        const target = list.find(a => a.app_key === action.appKey)
        if (!target) { showToast(`App "${action.appKey}" introuvable`, 'er'); return }
        const res = await fetch('/api/apps', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: target.id, status: 'maintenance' }),
        })
        if (res.ok) showToast(`✓ ${target.name} en maintenance`, 'ok')
        else showToast('Échec maintenance', 'er')
        return
      }

      if (action.type === 'broadcast') {
        const message = action.payload || 'Message envoyé via CactusOS'
        const res = await fetch('/api/broadcasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titre: 'Annonce CactusOS',
            message,
            niveau: 'moyen',
            expires_in_hours: 4,
            app_key: action.appKey,
          }),
        })
        if (res.ok || res.status === 207) showToast(`✓ Broadcast vers ${action.appKey}`, 'ok')
        else showToast('Échec broadcast', 'er')
        return
      }

      showToast(`Action inconnue : ${action.type}`, 'er')
    } catch {
      showToast('Erreur lors de l\'exécution', 'er')
    } finally {
      setRunning(false)
    }
  }

  const labels: Record<string, string> = {
    maintenance: `⚠ Mettre ${action.appKey} en maintenance`,
    broadcast: `📢 Envoyer broadcast à ${action.appKey}`,
  }
  const label = labels[action.type] || `Exécuter ${action.type}`

  return (
    <button
      onClick={execute}
      disabled={running}
      className="inline-flex items-center gap-1.5 my-1 px-3 py-1.5 rounded-md bg-[#4ade80]/15 border border-[#4ade80]/40 text-[#4ade80] text-xs font-mono tracking-wider hover:bg-[#4ade80]/25 disabled:opacity-50 transition-colors"
    >
      {running ? '…' : label}
    </button>
  )
}

// Composants markdown personnalises :
// - **gras** → font-semibold text-white
// - listes → list-disc pl-4, puces propres
// - liens → vert Codex
// - code → monospace sur fond sombre
const MD_COMPONENTS: Components = {
  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-white/90">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="marker:text-[#4ade80]/60">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#4ade80] underline underline-offset-2 hover:text-[#4ade80]/80">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded bg-white/10 text-[#4ade80] font-mono text-[11px]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-[#d8eedd] overflow-x-auto">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#4ade80]/40 pl-3 my-2 text-white/80 italic">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="font-display text-base font-bold text-white my-2">{children}</h1>,
  h2: ({ children }) => <h2 className="font-display text-sm font-bold text-white my-2">{children}</h2>,
  h3: ({ children }) => <h3 className="font-display text-sm font-semibold text-white my-1.5">{children}</h3>,
  hr: () => <hr className="my-2 border-white/10" />,
}

export function MessageContent({ text }: { text: string }) {
  const { segments } = parseActions(text)

  return (
    <div className="break-words">
      {segments.map((seg, i) => {
        if (typeof seg === 'string') {
          return (
            <ReactMarkdown key={i} components={MD_COMPONENTS}>
              {seg}
            </ReactMarkdown>
          )
        }
        return <ActionButton key={i} action={seg} />
      })}
    </div>
  )
}
