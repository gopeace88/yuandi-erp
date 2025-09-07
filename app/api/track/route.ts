export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// 개인정보 마스킹 함수
function maskSensitiveData(data: any) {
  if (!data) return data
  
  const masked = { ...data }
  
  // 전화번호 마스킹 (010-****-5678)
  if (masked.customer_phone) {
    const phone = masked.customer_phone.replace(/\D/g, '')
    if (phone.length >= 8) {
      masked.customer_phone = `${phone.slice(0, 3)}-****-${phone.slice(-4)}`
    }
  }
  
  return masked
}

// GET: 고객 주문 조회 (비로그인)
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get('name')
    const phone = searchParams.get('phone')
    
    // 필수 파라미터 체크
    if (!name || !phone) {
      return NextResponse.json(
        { 
          error: 'Name and phone number are required',
          message: '이름과 전화번호를 입력해주세요'
        },
        { status: 400 }
      )
    }
    
    // 입력값 검증 및 정규화
    const normalizedName = name.trim()
    const normalizedPhone = phone.replace(/\D/g, '') // 숫자만 추출
    
    if (normalizedName.length < 2) {
      return NextResponse.json(
        { 
          error: 'Invalid name',
          message: '올바른 이름을 입력해주세요'
        },
        { status: 400 }
      )
    }
    
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { 
          error: 'Invalid phone number',
          message: '올바른 전화번호를 입력해주세요'
        },
        { status: 400 }
      )
    }

    // 테스트용 모의 데이터
    let mockOrders: any[] = []
    
    if (normalizedName === '홍길동' && normalizedPhone.includes('12345678')) {
      mockOrders = [
        {
          id: '1',
          order_no: 'ORD-240101-001',
          status: 'shipped',
          customer_name: '홍길동',
          customer_phone: '010-****-5678',
          total_amount: 100000,
          created_at: '2024-01-01T00:00:00Z',
          order_items: [
            {
              id: '1',
              product_name: '테스트 상품',
              quantity: 1,
              unit_price: 100000,
              subtotal: 100000
            }
          ],
          shipments: [
            {
              courier: 'CJ대한통운',
              tracking_no: '1234567890',
              tracking_url: 'https://www.doortodoor.co.kr/tracking',
              shipped_at: '2024-01-02T00:00:00Z'
            }
          ]
        }
      ]
    }
    
    // 응답 시간 측정
    const responseTime = Date.now() - startTime
    
    // 조회 결과 반환
    if (mockOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '조회된 주문이 없습니다',
        orders: [],
        responseTime
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `최근 ${mockOrders.length}건의 주문이 조회되었습니다`,
      orders: mockOrders,
      responseTime
    })
    
  } catch (error) {
    console.error('Track API error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch orders',
        message: '주문 조회 중 오류가 발생했습니다'
      },
      { status: 500 }
    )
  }
}

// POST 요청 차단 (보안)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}