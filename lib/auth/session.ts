import { createServerSupabase } from '@/lib/supabase/server'
import { Database } from '@/types/supabase.types'
import { cookies } from 'next/headers'
import type { User, Session } from './types'

/**
 * Server-side session management for YUANDI
 * Uses Supabase Auth for session management
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    // Get user profile from database
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return null
    }
    
    return {
      user: {
        id: user.id,
        email: user.email || '',
        name: profile.name || '',
        role: profile.role || 'user',
        language: profile.language || 'ko',
        timezone: profile.timezone || 'Asia/Seoul',
        active: profile.is_active || false
      },
      token: '', // Token is managed by Supabase internally
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }
    
  } catch (error) {
    console.error('Session error:', error)
    return null
  }
}

/**
 * Client-side session hook
 */
export function useSession() {
  // For client-side, we'll use Supabase auth hooks
  // This is a placeholder for the server-side version
  throw new Error('useSession should only be called on client-side')
}

/**
 * Sign out user
 */
export async function signOut() {
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw error
  }
}

// Client-safe utilities moved to ./types.ts