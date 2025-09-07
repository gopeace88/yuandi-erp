import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { UsersContent } from '@/components/dashboard/users-content'

export const dynamic = 'force-dynamic'

async function getUserStats(supabase: any) {
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('role, active')

  if (error) {
    return { totalUsers: 0, activeUsers: 0, adminUsers: 0, regularUsers: 0 }
  }

  const totalUsers = users.length
  const activeUsers = users.filter((u: any) => u.active).length
  const adminUsers = users.filter((u: any) => u.role === 'admin').length
  const regularUsers = users.filter((u: any) => u.role !== 'admin').length

  return { totalUsers, activeUsers, adminUsers, regularUsers }
}

export default async function UsersPage() {
  const session = await getServerSession()
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is admin
  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = await createServerSupabase()
  
  // Fetch users and stats from database
  const [{ data: users, error }, stats] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    getUserStats(supabase)
  ])

  if (error) {
    console.error('Error fetching users:', error)
  }

  return <UsersContent stats={stats} users={users || []} />
}