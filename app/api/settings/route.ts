import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 설정을 저장할 임시 저장소 (실제로는 데이터베이스에 저장해야 함)
let settingsData = {
  systemName: 'YUANDI Collection Management',
  businessName: 'YUANDI Collection',
  representativeName: '',
  businessNumber: '',
  contactNumber: '',
  email: '',
  lowStockThreshold: 5,
  autoStockAlert: true,
  autoReorderEnabled: false,
  defaultLanguage: 'ko',
  timezone: 'Asia/Seoul',
  defaultCurrency: 'KRW'
}

export async function GET() {
  try {
    // 쿠키에서 사용자 확인
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(settingsData)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: '설정을 불러오는데 실패했습니다' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 쿠키에서 사용자 확인
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // 설정 업데이트
    settingsData = {
      ...settingsData,
      ...body
    }

    return NextResponse.json({ 
      message: '설정이 저장되었습니다',
      data: settingsData 
    })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 })
  }
}