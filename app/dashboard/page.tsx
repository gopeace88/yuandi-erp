import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { MobileDashboard } from '@/components/dashboard/mobile-dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <MobileDashboard />
}