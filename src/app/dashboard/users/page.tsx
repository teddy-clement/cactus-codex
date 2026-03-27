import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { CCUser } from '@/types'

async function getUsers(): Promise<CCUser[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('cc_users')
    .select('id, email, name, role, organisation, last_login, created_at')
    .order('created_at')
  return (data as CCUser[]) || []
}

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

export default async function UsersPage() {
  const session = await getSession()
  if (session?.user.role !== 'SUPERADMIN') redirect('/dashboard')

  const users = await getUsers()

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
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{user.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: '#384e3c' }}>{user.email}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#6fa876' }}>{user.organisation || '—'}</div>
            <div><span className={`role ${ROLE_CLS[user.role]}`}>{user.role}</span></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#6fa876' }}>
              {formatDate(user.last_login)}
            </div>
            <div><button className="ibtn" title="Modifier">✏</button></div>
          </div>
        ))}
      </div>

    </>
  )
}
