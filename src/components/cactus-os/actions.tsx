'use client'
import React from 'react'
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

export function MessageContent({ text }: { text: string }) {
  const { segments } = parseActions(text)

  return (
    <div className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) => {
        if (typeof seg === 'string') return <React.Fragment key={i}>{seg}</React.Fragment>
        return <ActionButton key={i} action={seg} />
      })}
    </div>
  )
}
