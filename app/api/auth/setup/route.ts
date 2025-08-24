export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

const INITIAL_ADMIN = {
  email: 'yuandi1020@gmail.com',
  password: 'yuandi123!', // This will be checked during login
  name: 'YUANDI 관리자'
}

export async function POST(request: NextRequest) {
  try {
    // Create service Supabase client for admin operations
    const supabase = await createServiceSupabaseClient()

    // Check if admin user already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('email', INITIAL_ADMIN.email)
      .maybeSingle()

    if (checkError) {
      console.error('Profile check error:', checkError)
      return NextResponse.json(
        { error: `계정 확인 실패: ${checkError.message}` },
        { status: 500 }
      )
    }

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: '관리자 계정이 이미 존재합니다.',
        user: {
          id: (existingProfile as any).id,
          email: (existingProfile as any).email,
          name: (existingProfile as any).name
        }
      })
    }

    // Create new admin profile directly in database
    const adminId = randomUUID()
    const now = new Date().toISOString()

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: adminId,
        name: INITIAL_ADMIN.name,
        email: INITIAL_ADMIN.email,
        role: 'Admin',
        locale: 'ko',
        active: true,
        created_at: now,
        updated_at: now
      } as any)
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: `프로필 생성 실패: ${profileError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '초기 관리자 계정이 생성되었습니다.',
      user: {
        id: (profileData as any)?.id,
        email: (profileData as any)?.email,
        name: (profileData as any)?.name,
        role: (profileData as any)?.role
      },
      note: 'Development mode: Use yuandi1020@gmail.com / yuandi123! to login'
    })

  } catch (error) {
    console.error('Setup API error:', error)
    return NextResponse.json(
      { error: '초기 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}