import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Get Supabase client for API routes with proper auth
 */
export async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_API_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(`Missing Supabase configuration`)
  }

  // Get all cookies
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  
  // Find auth cookies
  const authCookies = allCookies.filter(cookie => 
    cookie.name.includes('sb-') || 
    cookie.name.includes('supabase')
  )
  
  console.log('Auth cookies found:', authCookies.map(c => ({
    name: c.name,
    hasValue: !!c.value,
    length: c.value?.length
  })))

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const cookie = cookieStore.get(name)
        console.log(`Getting cookie ${name}:`, !!cookie?.value)
        return cookie?.value
      },
      set(name: string, value: string, options: any) {
        console.log(`Setting cookie ${name}`)
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        console.log(`Removing cookie ${name}`)
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })

  // Get the session from cookies
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  console.log('Session check:', {
    hasSession: !!session,
    userId: session?.user?.id,
    error: error?.message
  })

  return { supabase, session }
}

/**
 * Get Supabase Admin client for user management
 * Uses service role key for admin operations
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_API_KEY ||
    process.env.SUPABASE_SECRET_KEY

  console.log('Admin client config:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    keyLength: supabaseServiceKey?.length
  })

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      `Missing Supabase Admin configuration. ` +
      `URL: ${!!supabaseUrl}, ` +
      `ServiceKey: ${!!supabaseServiceKey}`
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}