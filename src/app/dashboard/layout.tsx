import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import BottomNav from '@/components/dashboard/BottomNav'
import DashboardShell from '@/components/dashboard/DashboardShell'
import AmbientOrbs from '@/components/dashboard/AmbientOrbs'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <DashboardShell>
      <AmbientOrbs />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar user={session.user} />
        <div className="md:ml-16 flex-1 flex flex-col min-h-screen min-w-0">
          <Topbar user={session.user} />
          <main className="flex-1 px-4 md:px-6 py-4 md:py-6 main-safe-bottom">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </DashboardShell>
  )
}
