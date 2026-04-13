'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type CreatedApp = {
  id: string
  name: string
  app_key: string
  ingest_key: string
}

export default function NewAppPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [appKey, setAppKey] = useState('')
  const [url, setUrl] = useState('')
  const [env, setEnv] = useState<'production' | 'staging' | 'preview' | 'cloud'>('production')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)

  const [created, setCreated] = useState<CreatedApp | null>(null)

  function onNameChange(value: string) {
    setName(value)
    // Auto-generer app_key tant qu'on ne l'a pas edite manuellement
    if (!keyManuallyEdited) {
      setAppKey(slugify(value))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !appKey.trim() || !url.trim()) {
      showToast('Nom, app_key et URL sont requis', 'er')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          app_key: appKey.trim(),
          url: url.trim(),
          env,
          webhook_url: webhookUrl.trim() || null,
          webhook_secret: webhookSecret.trim() || null,
          description: description.trim() || null,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        showToast(payload.error || 'Erreur lors de la creation', 'er')
        return
      }
      setCreated({ id: payload.id, name: payload.name, app_key: payload.app_key, ingest_key: payload.ingest_key })
      showToast('App enregistrée', 'ok')
    } catch {
      showToast('Erreur réseau', 'er')
    } finally {
      setSaving(false)
    }
  }

  async function copyKey() {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.ingest_key)
      showToast('Ingest key copiée', 'ok')
    } catch {
      showToast('Impossible de copier', 'er')
    }
  }

  // ── Ecran de confirmation : l'ingest_key n'est affichee qu'une fois ──
  if (created) {
    return (
      <div className="panel">
        <div className="ph">
          <div className="pht">Application enregistrée</div>
          <div className="phg">// {created.app_key}</div>
        </div>
        <div className="panel-body">
          <div className="flex items-start gap-4 mb-5">
            <div className="text-4xl" style={{ color: '#4ade80' }}>✓</div>
            <div className="flex-1">
              <div className="font-display text-lg font-bold text-white mb-1">{created.name}</div>
              <p className="font-mono text-[11px] text-[#6fa876] leading-relaxed">
                Conserve la clé d&apos;ingestion ci-dessous — elle ne sera plus affichée après cette page.
              </p>
            </div>
          </div>

          <div className="field">
            <label>INGEST KEY (à stocker dans l&apos;app cliente)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={created.ingest_key}
                readOnly
                onFocus={e => e.target.select()}
                className="flex-1 font-mono text-[12px] text-[#4ade80]"
                style={{ background: '#0a120c', border: '1px solid #2d6b45' }}
              />
              <button
                type="button"
                onClick={copyKey}
                className="px-4 py-2 rounded-md border border-[#4ade80]/30 text-[#4ade80] font-mono text-xs hover:bg-[#4ade80]/10 transition-colors whitespace-nowrap"
              >
                ⧉ Copier
              </button>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/5 font-mono text-[11px] text-[#f59e0b]">
            ⚠ Cette clé donne accès aux endpoints publics d&apos;ingestion (/api/public/signals, /api/public/feedback).
            Ne la partage qu&apos;avec l&apos;app cliente concernée.
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => router.push('/dashboard/apps')} className="btn-action flex-1">
              Voir les apps →
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-md border border-[#233428] text-[#6fa876] hover:text-white transition-colors font-display font-bold text-sm tracking-widest uppercase"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulaire de creation ──
  return (
    <div className="panel">
      <div className="ph">
        <div className="pht">Enregistrer une nouvelle application</div>
        <div className="phg">// multi-apps</div>
      </div>
      <div className="panel-body">
        <form onSubmit={submit}>
          <div className="g2-inner">
            <div className="field">
              <label>Nom de l&apos;application</label>
              <input
                type="text"
                value={name}
                onChange={e => onNameChange(e.target.value)}
                placeholder="ex: CoTrain"
                required
              />
            </div>
            <div className="field">
              <label>app_key (slug unique)</label>
              <input
                type="text"
                value={appKey}
                onChange={e => { setAppKey(e.target.value); setKeyManuallyEdited(true) }}
                placeholder="ex: cotrain"
                pattern="[a-z0-9_-]+"
                required
              />
            </div>
          </div>

          <div className="g2-inner">
            <div className="field">
              <label>URL publique</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
            <div className="field">
              <label>Environnement</label>
              <select value={env} onChange={e => setEnv(e.target.value as typeof env)}>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="preview">Preview</option>
                <option value="cloud">Cloud</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Webhook URL (broadcasts)</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://.../api/codex/broadcast"
            />
          </div>

          <div className="field">
            <label>Webhook secret</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder="Secret partagé avec l'app cliente"
            />
          </div>

          <div className="field">
            <label>Description / note de pilotage</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optionnel"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button type="submit" className="btn-action flex-1" disabled={saving}>
              {saving ? 'Création…' : 'Créer l\'application →'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/apps')}
              className="px-6 py-3 rounded-md border border-[#233428] text-[#6fa876] hover:text-white transition-colors font-display font-bold text-sm tracking-widest uppercase"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
