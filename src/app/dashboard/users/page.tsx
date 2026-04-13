'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import type { CCUser } from '@/types'

const ROLE_CLS: Record<string, string> = { SUPERADMIN: 'role-sa', ADMIN: 'role-ad', VIEWER: 'role-v' }

function formatDate(d: string | null) {
  if (!d) return 'Jamais'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Maintenant'
  if (mins < 60) return `Il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  return new Date(d).toLocaleDateString('fr-FR')
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type EditUser = { id: string; name: string; role: string; organisation: string; new_password: string }

export default function UsersPage() {
  const [users, setUsers] = useState<CCUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditUser | null>(null)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    fetch('/api/users')
      .then(r => { if (r.status === 403) throw new Error('forbidden'); return r.json() })
      .then((data: CCUser[]) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => showToast('Accès refusé ou erreur', 'er'))
      .finally(() => setLoading(false))
  }, [showToast])

  function openEdit(user: CCUser) {
    setEditing({ id: user.id, name: user.name, role: user.role, organisation: user.organisation || '', new_password: '' })
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const payload: Record<string, string> = { id: editing.id }
      if (editing.name) payload.name = editing.name
      if (editing.role) payload.role = editing.role
      payload.organisation = editing.organisation
      if (editing.new_password) payload.new_password = editing.new_password

      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
        setEditing(null)
        showToast('Utilisateur mis à jour', 'ok')
      } else {
        const err = await res.json()
        showToast(err.error || 'Erreur', 'er')
      }
    } catch { showToast('Erreur réseau', 'er') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="panel"><div className="empty">Chargement…</div></div>

  return (
    <>
      <div className="panel">
        <div className="ph">
          <div className="pht">Gestion des accès</div>
          <div className="phg">// {users.length} utilisateurs</div>
        </div>
        <div className="trow thead" style={{ gridTemplateColumns: '34px 2fr 1.5fr 1fr 1fr 60px' }}>
          <span /><span>Nom / Email</span><span>Organisation</span><span>Rôle</span><span>Dernier accès</span><span />
        </div>
        {users.map(user => (
          <div key={user.id} className="trow" style={{ gridTemplateColumns: '34px 2fr 1.5fr 1fr 1fr 60px' }}>
            <div className="mav">{initials(user.name)}</div>
            <div>
              <div className="font-semibold text-[13px] text-white">{user.name}</div>
              <div className="font-mono text-[9.5px] text-[#384e3c]">{user.email}</div>
            </div>
            <div className="text-xs text-[#6fa876]">{user.organisation || '—'}</div>
            <div><span className={`role ${ROLE_CLS[user.role]}`}>{user.role}</span></div>
            <div className="font-mono text-[10px] text-[#6fa876]">{formatDate(user.last_login ?? null)}</div>
            <div><button className="ibtn" title="Modifier" onClick={() => openEdit(user)}>✏</button></div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md bg-surface-2 border border-border-2 rounded-xl p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,.65)] animate-rise max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="font-display text-lg font-extrabold text-white mb-4">Modifier l'utilisateur</div>
            <form onSubmit={saveEdit}>
              <div className="field">
                <label>Nom</label>
                <input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Rôle</label>
                <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
              <div className="field">
                <label>Organisation</label>
                <input type="text" value={editing.organisation} onChange={e => setEditing({ ...editing, organisation: e.target.value })} />
              </div>
              <div className="field">
                <label>Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                <input type="password" value={editing.new_password} onChange={e => setEditing({ ...editing, new_password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="btn-action flex-1" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
                <button type="button" className="ibtn-del px-4 py-3" onClick={() => setEditing(null)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
