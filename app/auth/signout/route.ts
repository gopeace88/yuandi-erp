import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Redirect signout requests to the logout API
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/auth/logout', request.url))
}

export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/auth/logout', request.url))
}