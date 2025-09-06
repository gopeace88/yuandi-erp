import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 이미지 업로드 API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    // 인증 체크
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // FormData 파싱
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'product' // product, shipment 등
    
    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 5MB 이하여야 합니다.' },
        { status: 400 }
      )
    }

    // 파일 타입 체크
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다. (JPEG, PNG, WebP)' },
        { status: 400 }
      )
    }

    // 파일명 생성
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${type}/${user.id}/${timestamp}.${fileExt}`

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: '이미지 업로드에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: publicUrl,
      path: uploadData.path,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 이미지 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    // 인증 체크
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path')
    
    if (!path) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다.' },
        { status: 400 }
      )
    }

    // 파일 소유권 체크 (경로에 user.id 포함 여부)
    if (!path.includes(user.id)) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Supabase Storage에서 삭제
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([path])

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: '이미지 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '이미지가 삭제되었습니다.' })
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}