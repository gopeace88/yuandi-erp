import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createServerSupabaseClient() {
  const cookieStore = cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY || 
                     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                     'placeholder_key_for_build'

  // 빌드 시점에는 placeholder 값 사용
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('Supabase URL not configured, using placeholder for build')
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Alias for backward compatibility
export const createClient = createServerSupabaseClient;

export async function createServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_API_KEY ||
                     process.env.NEXT_PUBLIC_SUPABASE_API_KEY ||
                     'placeholder_key_for_build'

  // 빌드 시점에는 placeholder 값 사용
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('Supabase URL not configured, using placeholder for build')
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get() {
          return ''
        },
        set() {},
        remove() {},
      },
    }
  )
}