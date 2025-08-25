export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Support both GET and POST for logout
export async function GET(request: NextRequest) {
  return handleLogout(request)
}

export async function POST(request: NextRequest) {
  return handleLogout(request)
}

async function handleLogout(request: NextRequest) {
  try {
    // Clear cookies and redirect to main page
    const response = NextResponse.redirect(new URL('/', request.url))
    
    // Clear session cookies
    response.cookies.set('user', '', {
      path: '/',
      maxAge: 0
    })
    
    response.cookies.set('session', '', {
      path: '/',
      maxAge: 0
    })
    
    // Clear any Supabase cookies if they exist
    const cookieNames = ['sb-access-token', 'sb-refresh-token']
    cookieNames.forEach(name => {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0
      })
    })
    
    console.log('Logout successful - cookies cleared')
    return response

  } catch (error) {
    console.error('Logout API error:', error)
    // Even if there's an error, redirect to main page
    return NextResponse.redirect(new URL('/', request.url))
  }
}