import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseadmin } from '@/lib/supabase/api'

export async function POST(request: NextRequest) {
  console.log('POST /api/users - Start')
  
  try {
    // Step 1: Check authentication
    console.log('Step 1: Checking authentication')
    
    let supabase, session
    try {
      const result = await getSupabaseClient()
      supabase = result.supabase
      session = result.session
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    if (!session) {
      console.log('No session found - user needs to login')
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 })
    }
    
    console.log('Session found for user:', session.user.id)
    
    // Step 2: Check admin role
    console.log('Step 2: Checking admin role')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile error: ' + profileError.message }, { status: 403 })
    }
    
    if (profile?.role !== 'admin') {
      console.log('User is not admin:', profile?.role)
      return NextResponse.json({ error: 'Forbidden - Not admin' }, { status: 403 })
    }
    
    // Step 3: Parse request body
    console.log('Step 3: Parsing request body')
    const body = await request.json()
    const { name, email, password, role, active } = body
    
    console.log('Creating user with:', { email, name, role, active, hasPassword: !!password })
    
    // Step 4: Create auth user
    console.log('Step 4: Creating auth user')
    let supabaseadmin
    try {
      supabaseadmin = getSupabaseadmin()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json({ 
        error: 'admin client error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    const { data: authData, error: authError } = await supabaseadmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json({ 
        error: 'Auth creation failed', 
        details: authError.message,
        code: authError.code || 'unknown'
      }, { status: 400 })
    }
    
    console.log('Auth user created:', authData.user.id)
    
    // Step 5: Create profile
    console.log('Step 5: Creating profile')
    const { data: newProfile, error: profileCreateError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        active,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (profileCreateError) {
      console.error('Profile creation error:', profileCreateError)
      // Clean up auth user if profile creation fails
      console.log('Cleaning up auth user due to profile error')
      await supabaseadmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ 
        error: 'Profile creation failed', 
        details: profileCreateError.message 
      }, { status: 400 })
    }
    
    console.log('User created successfully:', newProfile)
    return NextResponse.json(newProfile, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/users:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'unknown'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient()
    
    // Check if user is admin
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user role from profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id, name, role, active } = body
    
    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({
        name,
        role,
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(updatedProfile, { status: 200 })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient()
    
    // Check if user is admin
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user role from profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    // Delete from profiles first
    const { error: profileDeleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)
    
    if (profileDeleteError) {
      console.error('Profile deletion error:', profileDeleteError)
      return NextResponse.json({ error: profileDeleteError.message }, { status: 400 })
    }
    
    // Delete auth user using admin client
    const supabaseadmin = getSupabaseadmin()
    const { error: authError } = await supabaseadmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('Auth deletion error:', authError)
      // Profile is already deleted, just log the error
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