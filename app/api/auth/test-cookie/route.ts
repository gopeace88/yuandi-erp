import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('Test cookie endpoint called')
  
  // Create test response with cookies
  const response = NextResponse.json({
    success: true,
    message: 'Test cookies set',
    cookies: request.cookies.getAll()
  })

  // Set test cookies
  response.cookies.set('test_user', 'test_user_value', {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'lax'
  })

  response.cookies.set('test_session', 'test_session_value', {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'lax'
  })

  return response
}

export async function POST(request: NextRequest) {
  return GET(request)
}