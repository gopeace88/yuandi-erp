import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseadmin } from '@/lib/supabase/api'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('PATCH /api/users/[id]/password - Start')
  
  try {
    // Step 1: Check authentication
    const { supabase, session } = await getSupabaseClient()
    
    if (!session) {
      console.log('No session found - user needs to login')
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 })
    }
    
    console.log('Session found for user:', session.user.id)
    
    // Step 2: Parse request body
    const body = await request.json()
    const { newPassword, currentPassword } = body
    
    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    
    const targetUserId = params.id
    console.log('Target user ID:', targetUserId)
    console.log('Current user ID:', session.user.id)
    
    // Step 3: Determine if admin is changing another user's password or user is changing own password
    if (targetUserId === session.user.id) {
      // User is changing their own password - requires current password
      console.log('User is changing their own password')
      
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      
      // Verify current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: currentPassword
      })
      
      if (signInError) {
        console.error('Current password verification failed:', signInError)
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      
      // Update own password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) {
        console.error('Password update error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update password', 
          details: updateError.message 
        }, { status: 400 })
      }
      
      console.log('Password updated successfully for own account')
      return NextResponse.json({ success: true, message: 'Password updated successfully' }, { status: 200 })
      
    } else {
      // admin is changing another user's password
      console.log('admin is changing another user\'s password')
      
      // Check if current user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (profile?.role !== 'admin') {
        console.log('User is not admin:', profile?.role)
        return NextResponse.json({ error: 'Forbidden - Only admins can change other users\' passwords' }, { status: 403 })
      }
      
      // Use admin client to update another user's password
      console.log('Using admin client to update password')
      const supabaseadmin = getSupabaseadmin()
      
      const { error: adminUpdateError } = await supabaseadmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      )
      
      if (adminUpdateError) {
        console.error('admin password update error:', adminUpdateError)
        return NextResponse.json({ 
          error: 'Failed to update password', 
          details: adminUpdateError.message 
        }, { status: 400 })
      }
      
      console.log('Password updated successfully by admin')
      return NextResponse.json({ success: true, message: 'Password updated successfully' }, { status: 200 })
    }
    
  } catch (error) {
    console.error('Unexpected error in PATCH /api/users/[id]/password:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}