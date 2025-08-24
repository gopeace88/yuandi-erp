import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'

export interface AdminAuthOptions {
  allowedRoles?: Array<'Admin' | 'OrderManager' | 'ShipManager'>
  requireAdmin?: boolean
}

/**
 * 관리자 권한 체크 미들웨어
 * 엑셀 다운로드 등 민감한 작업에 대한 권한 검증
 */
export async function requireAdminAuth(
  request: NextRequest,
  options: AdminAuthOptions = { requireAdmin: true }
): Promise<{ authorized: boolean; session?: any; error?: string }> {
  try {
    // 세션 확인
    const session = await getServerSession()
    
    if (!session) {
      return {
        authorized: false,
        error: 'Unauthorized: No session found'
      }
    }

    // 활성 사용자 확인
    if (!session.user.is_active) {
      return {
        authorized: false,
        error: 'Forbidden: Account is inactive'
      }
    }

    // Admin 전용 체크
    if (options.requireAdmin && session.user.role !== 'Admin') {
      return {
        authorized: false,
        error: 'Forbidden: Admin access required'
      }
    }

    // 허용된 역할 체크
    if (options.allowedRoles && !options.allowedRoles.includes(session.user.role)) {
      return {
        authorized: false,
        error: `Forbidden: Required roles: ${options.allowedRoles.join(', ')}`
      }
    }

    return {
      authorized: true,
      session
    }
  } catch (error) {
    console.error('Admin auth check error:', error)
    return {
      authorized: false,
      error: 'Internal server error during authentication'
    }
  }
}

/**
 * 엑셀 다운로드 권한 체크 래퍼
 * Admin만 엑셀 다운로드 가능
 */
export async function withExcelExportAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdminAuth(request, { requireAdmin: true })
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error?.includes('Unauthorized') ? 401 : 403 }
      )
    }

    // 권한이 확인된 경우 핸들러 실행
    return handler(request)
  }
}

/**
 * 데이터 접근 권한 체크
 * OrderManager, ShipManager도 조회는 가능하지만 다운로드는 불가
 */
export async function withDataAccessAuth(
  handler: (request: NextRequest, session: any) => Promise<NextResponse>,
  options: AdminAuthOptions = { allowedRoles: ['Admin', 'OrderManager', 'ShipManager'] }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdminAuth(request, options)
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error?.includes('Unauthorized') ? 401 : 403 }
      )
    }

    // 권한이 확인된 경우 세션과 함께 핸들러 실행
    return handler(request, authResult.session)
  }
}