import { createServerSupabase } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'
import { cookies } from 'next/headers'
import type { User, Session } from './types'

/**
 * Server-side session management for YUANDI
 * Development version using cookie-based session check
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('session')
    const userCookie = cookieStore.get('user')
    
    if (!sessionCookie || !userCookie) {
      return null
    }
    
    try {
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'))
      const userData = JSON.parse(Buffer.from(userCookie.value, 'base64').toString('utf8'))
      
      // Check if session is not expired
      const sessionExpires = new Date(sessionData.expires)
      const now = new Date()
      
      if (sessionExpires > now) {
        return {
          user: userData,
          token: sessionData.token,
          expires: sessionData.expires
        }
      }
    } catch (parseError) {
      console.error('Session parse error:', parseError)
      return null
    }
    
    return null
    
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