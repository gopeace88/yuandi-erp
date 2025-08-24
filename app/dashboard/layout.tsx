import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar user={session.user} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header user={session.user} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}