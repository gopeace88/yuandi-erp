import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 직접 생성 (쿠키 없이)
function getDirectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// 단순화된 사용자 관리 - Auth 없이 profiles 테이블만 사용
export async function GET(request: NextRequest) {
  try {
    const supabase = getDirectSupabase()
    
    // 모든 사용자 조회
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(users || [], { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/users/simple:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getDirectSupabase()
    
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body))
    
    const { name, email, password, role = 'Admin', active = true } = body
    
    console.log('Creating simple user:', { email, name, role, active, hasPassword: !!password, passwordLength: password?.length })
    
    // Generate a unique ID
    const userId = crypto.randomUUID()
    
    // Validate password
    if (!password || password.trim() === '') {
      console.error('Password is required but was not provided')
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }
    
    // Hash password using simple method (for demo purposes)
    // In production, use bcrypt or similar
    const hashedPassword = Buffer.from(password).toString('base64')
    
    // Create profile record only (no auth)
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        name,
        password: hashedPassword, // Store hashed password
        role,
        active,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }
    
    return NextResponse.json(newProfile, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getDirectSupabase()
    
    const body = await request.json()
    const { id, name, password, role, active } = body
    
    // Prepare update object
    const updateData: any = {
      name,
      role,
      active,
      updated_at: new Date().toISOString()
    }
    
    // Only update password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = Buffer.from(password).toString('base64')
      updateData.password = hashedPassword
    }
    
    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(updatedProfile, { status: 200 })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getDirectSupabase()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    // Delete from profiles only
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Profile deletion error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}