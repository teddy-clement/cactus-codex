import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <DashboardShell>
      <div className="flex min-h-screen">
        <Sidebar user={session.user} />
        <div className="ml-[248px] flex-1 flex flex-col min-h-screen">
          <Topbar user={session.user} />
          <main className="flex-1 px-[26px] py-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardShell>
  )
}
