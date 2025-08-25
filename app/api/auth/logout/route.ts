export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EventLogger } from '@/lib/middleware/event-logger'

// Support both GET and POST for logout
export async function GET(request: NextRequest) {
  return handleLogout(request)
}

export async function POST(request: NextRequest) {
  return handleLogout(request)
}

async function handleLogout(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerSupabaseClient()

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (session?.user) {
      // Get user profile for logging
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .eq('id', session.user.id)
        .single()

      // Log logout event
      if (profile) {
        const eventLogger = new EventLogger()
        await eventLogger.logEvent({
          event_type: 'auth',
          action: 'logout',
          resource_id: (profile as any).id,
          actor_id: (profile as any).id,
          metadata: {
            email: (profile as any).email,
            role: (profile as any).role,
            resource_type: 'user',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown'
          }
        } as any)
      }
    }

    // Sign out from Supabase Auth
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      console.error('Logout error:', signOutError)
      return NextResponse.json(
        { error: '로그아웃 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // Redirect to main page (track page) after logout
    return NextResponse.redirect(new URL('/track', request.url))

  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}