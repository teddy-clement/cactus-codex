import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={session.user} />
      <div style={{ marginLeft: '248px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar user={session.user} />
        <main style={{ flex: 1, padding: '24px 26px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
