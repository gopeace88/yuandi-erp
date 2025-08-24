import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession()
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <main>
        <DashboardContent />
      </main>
    </div>
  )
}