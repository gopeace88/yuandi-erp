/**
 * 파일 업로드 API
 * 단일 및 다중 파일 업로드 지원
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, uploadMultipleFiles, validateFileType, validateFileSize } from '@/lib/storage';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// 단일 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    // 인증 확인
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 사용자 정보 확인
    const supabase = createClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const path = formData.get('path') as string || undefined;
    const category = formData.get('category') as string || undefined;
    const tags = formData.get('tags') as string || undefined;
    const description = formData.get('description') as string || undefined;

    // 파일 검증
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket is required' },
        { status: 400 }
      );
    }

    // 파일 업로드
    const result = await uploadFile(file, {
      bucket,
      path,
      metadata: {
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        description,
        uploadedBy: user.id
      }
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 다중 파일 업로드
export async function PUT(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    // 인증 확인
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 사용자 정보 확인
    const supabase = createClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files: File[] = [];
    
    // 다중 파일 추출
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const bucket = formData.get('bucket') as string;
    const path = formData.get('path') as string || undefined;
    const category = formData.get('category') as string || undefined;
    const tags = formData.get('tags') as string || undefined;
    const description = formData.get('description') as string || undefined;

    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket is required' },
        { status: 400 }
      );
    }

    // 파일 개수 제한 (최대 10개)
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 files allowed' },
        { status: 400 }
      );
    }

    // 다중 파일 업로드
    const result = await uploadMultipleFiles(files, {
      bucket,
      path,
      metadata: {
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        description,
        uploadedBy: user.id
      }
    });

    return NextResponse.json({
      success: result.successful.length > 0,
      data: {
        successful: result.successful.length,
        failed: result.failed.length,
        results: result.successful.map(r => r.data),
        errors: result.failed.map(f => ({
          fileName: f.file.name,
          error: f.error
        }))
      }
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}