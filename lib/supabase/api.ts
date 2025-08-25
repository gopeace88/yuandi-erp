import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

/**
 * Get Supabase client for API routes
 * Handles environment variable compatibility issues
 */
export async function getSupabaseClient() {
  // Try different environment variable names for compatibility
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_API_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  console.log('Supabase client config:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl?.substring(0, 30),
    keyPrefix: supabaseAnonKey?.substring(0, 20)
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase configuration. ` +
      `URL: ${!!supabaseUrl}, ` +
      `Key: ${!!supabaseAnonKey}`
    )
  }

  // Get cookies
  const cookieStore = cookies()
  
  // Create client with explicit configuration
  const supabase = createRouteHandlerClient(
    { cookies: () => cookieStore },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey
    }
  )
  
  // Log cookie information for debugging
  const allCookies = cookieStore.getAll()
  console.log('Cookies found:', allCookies.map(c => c.name))
  
  return supabase
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