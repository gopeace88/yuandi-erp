import type { Database } from '@/lib/supabase/database.types'

export type User = Database['public']['Tables']['profiles']['Row']

export interface Session {
  user: User
  access_token: string
  refresh_token: string
}

/**
 * Check if user has required role (client-safe utility)
 */
export function hasRole(user: User, role: User['role'] | User['role'][]): boolean {
  const roles = Array.isArray(role) ? role : [role]
  return roles.includes(user.role)
}

/**
 * Check if user is admin (client-safe utility)
 */
export function isAdmin(user: User): boolean {
  return user.role === 'Admin'
}

/**
 * Get role display name in Korean
 */
export function getRoleDisplayName(role: User['role']): string {
  switch (role) {
    case 'Admin':
      return '관리자'
    case 'OrderManager':
      return '주문관리자'
    case 'ShipManager':
      return '배송관리자'
    case 'Customer':
      return '고객'
    default:
      return role
  }
}