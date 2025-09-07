import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabase()

    // Supabase 인증
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 잘못되었습니다.' },
        { status: 401 }
      )
    }

    // 프로필 정보 가져오기
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 활성 상태 확인
    if (!profile.active) {
      return NextResponse.json(
        { error: '비활성화된 계정입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      )
    }

    // 마지막 로그인 시간 업데이트
    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', authData.user.id)

    // 사용자 데이터 구성
    const userData = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      locale: profile.locale,
      active: profile.active,
      phone: profile.phone,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    }

    // 세션 데이터
    const sessionData = {
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      expires_at: authData.session?.expires_at,
      expires_in: authData.session?.expires_in
    }

    // 응답 생성
    const response = NextResponse.json({
      success: true,
      user: userData,
      session: sessionData
    })

    // 쿠키 설정
    const maxAge = authData.session?.expires_in || 3600 // 기본 1시간
    
    // Base64 인코딩으로 한글 처리
    const userCookieValue = Buffer.from(JSON.stringify(userData), 'utf8').toString('base64')
    const sessionCookieValue = Buffer.from(JSON.stringify(sessionData), 'utf8').toString('base64')
    
    response.cookies.set('user', userCookieValue, {
      path: '/',
      maxAge: maxAge,
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production'
    })
    
    response.cookies.set('session', sessionCookieValue, {
      path: '/',
      maxAge: maxAge,
      sameSite: 'lax',
      httpOnly: true, // 세션은 보안을 위해 httpOnly
      secure: process.env.NODE_ENV === 'production'
    })

    return response

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}