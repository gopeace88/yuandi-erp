import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase.types'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY || 
                     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                     'placeholder_key_for_build'

  // 빌드 시점에는 placeholder 값 사용
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('Supabase URL not configured, using placeholder for build')
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  )
}