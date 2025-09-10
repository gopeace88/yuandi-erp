import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('현재 인증된 사용자 ID:', session.user.id)
    console.log('현재 인증된 사용자 이메일:', session.user.email)
    
    // Check if user profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Profile check error:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }
    
    if (existingProfile) {
      console.log('사용자 프로필이 이미 존재합니다:', existingProfile)
      return NextResponse.json({ 
        message: 'Profile already exists', 
        profile: existingProfile 
      }, { status: 200 })
    }
    
    // Create user profile if it doesn't exist
    const userMetadata = session.user.user_metadata || {}
    const profileData = {
      id: session.user.id,
      email: session.user.email,
      name: userMetadata.name || session.user.email?.split('@')[0] || 'User',
      role: 'admin', // 첫 번째 사용자는 관리자로 설정
      active: true,
      created_at: new Date().toISOString()
    }
    
    console.log('새 프로필 생성 데이터:', profileData)
    
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single()
    
    if (createError) {
      console.error('Profile creation error:', createError)
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: createError.message 
      }, { status: 500 })
    }
    
    console.log('새 프로필 생성 완료:', newProfile)
    return NextResponse.json({ 
      message: 'Profile created successfully', 
      profile: newProfile 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error in ensure-profile:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}