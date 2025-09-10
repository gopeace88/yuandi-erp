import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // 쿠키 정보 확인
    const cookies = request.cookies.getAll()
    const supabaseCookies = cookies.filter(c => c.name.includes('sb-'))
    
    console.log('===== DEBUG SESSION =====')
    console.log('모든 쿠키:', cookies.map(c => `${c.name}: ${c.value.substring(0, 20)}...`))
    console.log('Supabase 쿠키:', supabaseCookies.map(c => c.name))
    
    // Supabase 클라이언트로 세션 확인
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('세션 가져오기 오류:', error)
    }
    
    if (session) {
      console.log('✅ 세션 발견:', {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at
      })
      
      // 사용자 프로필 확인
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        
      return NextResponse.json({
        status: 'authenticated',
        session: {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        },
        profile: profile,
        cookies: {
          total: cookies.length,
          supabase: supabaseCookies.map(c => c.name)
        }
      })
    } else {
      console.log('❌ 세션 없음')
      return NextResponse.json({
        status: 'unauthenticated',
        cookies: {
          total: cookies.length,
          supabase: supabaseCookies.map(c => c.name),
          all: cookies.map(c => c.name)
        },
        message: '세션이 없습니다. 로그인이 필요합니다.'
      })
    }
  } catch (error) {
    console.error('디버그 오류:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}