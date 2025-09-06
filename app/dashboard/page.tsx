import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { MobileDashboard } from '@/components/dashboard/mobile-dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  return <MobileDashboard />
}