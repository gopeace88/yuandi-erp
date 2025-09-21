import type { SupabaseClient } from '@supabase/supabase-js'

type Database = any

export type UserRole = 'admin' | 'order_manager' | 'ship_manager' | null

export async function getUserRole(
  supabase: SupabaseClient<Database>,
  userId?: string | null
): Promise<UserRole> {
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch user role:', error)
    return null
  }

  return (data?.role as UserRole) ?? null
}

export function isRoleAllowed(role: UserRole, allowed: UserRole[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}
