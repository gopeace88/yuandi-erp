import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'

export interface adminAuthOptions {
  allowedRoles?: Array<'admin' | 'order_manager' | 'ship_manager'>
  requireadmin?: boolean
}

/**
 * 관리자 권한 체크 미들웨어
 * 엑셀 다운로드 등 민감한 작업에 대한 권한 검증
 */
export async function requireadminAuth(
  request: NextRequest,
  options: adminAuthOptions = { requireadmin: true }
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

    // admin 전용 체크
    if (options.requireadmin && session.user.role !== 'admin') {
      return {
        authorized: false,
        error: 'Forbidden: admin access required'
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
    console.error('admin auth check error:', error)
    return {
      authorized: false,
      error: 'Internal server error during authentication'
    }
  }
}

/**
 * 엑셀 다운로드 권한 체크 래퍼
 * admin만 엑셀 다운로드 가능
 */
export async function withExcelExportAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireadminAuth(request, { requireadmin: true })
    
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
 * order_manager, ship_manager도 조회는 가능하지만 다운로드는 불가
 */
export async function withDataAccessAuth(
  handler: (request: NextRequest, session: any) => Promise<NextResponse>,
  options: adminAuthOptions = { allowedRoles: ['admin', 'order_manager', 'ship_manager'] }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireadminAuth(request, options)
    
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