import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                   'placeholder_key_for_build'

// 빌드 시점에는 placeholder 값 사용
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('Supabase URL not configured, using placeholder for build')
}

// 싱글톤 인스턴스 - 전역적으로 단 하나만 생성
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

// 브라우저 환경에서만 클라이언트 생성
if (typeof window !== 'undefined' && !supabaseInstance) {
  supabaseInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        storageKey: 'yuandi-auth-token',
        storage: window.localStorage
      }
    }
  )
}

// 레거시 함수 - 항상 동일한 인스턴스 반환
export function createClient() {
  if (typeof window === 'undefined') {
    // SSR 환경에서는 매번 새로운 인스턴스 생성 (필요한 경우)
    return createBrowserClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false
        }
      }
    )
  }
  
  // 브라우저 환경에서는 싱글톤 인스턴스 반환
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: true,
          storageKey: 'yuandi-auth-token',
          storage: window.localStorage
        }
      }
    )
  }
  
  return supabaseInstance
}

// 직접 싱글톤 인스턴스 export (권장)
export const supabase = supabaseInstance