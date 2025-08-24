export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    console.log('Login attempt:', { email })

    // Create Supabase service client for database operations
    const supabase = await createServiceSupabaseClient()

    // Check credentials against database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      console.log('User not found:', profileError)
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 잘못되었습니다.' },
        { status: 401 }
      )
    }

    // Development mode: Simple password check
    // In production, this would be handled by proper password hashing
    if (password !== (profile as any).password) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 잘못되었습니다.' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!(profile as any).active) {
      return NextResponse.json(
        { error: '비활성화된 계정입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      )
    }

    // Update last login time
    // TODO: Fix TypeScript issue with Supabase types
    // await supabase
    //   .from('profiles')
    //   .update({ 
    //     last_login_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString()
    //   } as any)
    //   .eq('id', (profile as any).id)

    console.log('Login successful for:', email)

    // Return user data and session info
    const userData = {
      id: (profile as any).id,
      name: (profile as any).name,
      email: (profile as any).email,
      role: (profile as any).role,
      locale: (profile as any).locale || 'ko',
      active: (profile as any).active,
      created_at: (profile as any).created_at,
      updated_at: (profile as any).updated_at
    }

    const sessionData = {
      token: 'dev-session-token-' + Date.now(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      refresh_token: 'dev-refresh-token-' + Date.now()
    }

    // Create response with user and session data
    const response = NextResponse.json({
      success: true,
      user: userData,
      session: sessionData
    })

    // Set cookies server-side for better reliability
    const maxAge = 24 * 60 * 60 // 24 hours in seconds
    
    // Encode user data and session data as Base64 to handle Korean characters
    const userCookieValue = Buffer.from(JSON.stringify(userData), 'utf8').toString('base64')
    const sessionCookieValue = Buffer.from(JSON.stringify(sessionData), 'utf8').toString('base64')
    
    response.cookies.set('user', userCookieValue, {
      path: '/',
      maxAge: maxAge,
      sameSite: 'lax',
      httpOnly: false // Need this for client-side access
    })
    
    response.cookies.set('session', sessionCookieValue, {
      path: '/',
      maxAge: maxAge,
      sameSite: 'lax',
      httpOnly: false // Need this for client-side access
    })

    console.log('Cookies set server-side for:', email)
    
    return response

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}