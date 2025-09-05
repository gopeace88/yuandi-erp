/**
 * 파일 관리 API
 * 파일 검색, 삭제, 메타데이터 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  searchFiles, 
  deleteFile, 
  getFileMetadata, 
  updateFileMetadata,
  getStorageStats,
  cleanupTempFiles
} from '@/lib/storage';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// 파일 검색
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    
    // 쿼리 파라미터 추출
    const bucket = searchParams.get('bucket') || undefined;
    const category = searchParams.get('category') || undefined;
    const uploadedBy = searchParams.get('uploadedBy') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const sortBy = searchParams.get('sortBy') as 'name' | 'size' | 'uploadedAt' || 'uploadedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    // 특별한 요청: 스토리지 통계
    if (searchParams.get('stats') === 'true') {
      const stats = await getStorageStats();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    // 파일 검색
    const result = await searchFiles({
      bucket,
      category,
      uploadedBy,
      tags,
      dateFrom,
      dateTo,
      limit,
      offset,
      sortBy,
      sortOrder
    });

    return NextResponse.json({
      success: true,
      data: {
        files: result.files,
        total: result.total,
        limit,
        offset,
        hasMore: result.total > offset + limit
      }
    });

  } catch (error) {
    console.error('Search files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 파일 메타데이터 업데이트
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { fileId, ...updates } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // 파일 소유권 확인
    const metadata = await getFileMetadata(fileId);
    if (!metadata) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 사용자 권한 확인 (관리자이거나 파일 업로더)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';
    const isOwner = metadata.uploadedBy === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // 메타데이터 업데이트
    const success = await updateFileMetadata(fileId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update file metadata' },
        { status: 500 }
      );
    }

    // 업데이트된 메타데이터 반환
    const updatedMetadata = await getFileMetadata(fileId);

    return NextResponse.json({
      success: true,
      data: updatedMetadata
    });

  } catch (error) {
    console.error('Update file metadata error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 파일 삭제
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // 파일 메타데이터 조회
    const metadata = await getFileMetadata(fileId);
    if (!metadata) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 사용자 권한 확인 (관리자이거나 파일 업로더)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';
    const isOwner = metadata.uploadedBy === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // 파일 삭제
    const success = await deleteFile(metadata.bucket, metadata.path);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 임시 파일 정리 (관리자 전용)
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

    // 사용자 정보 및 권한 확인
    const supabase = createClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, olderThanHours } = body;

    if (action === 'cleanup_temp') {
      const cleanedCount = await cleanupTempFiles(olderThanHours || 24);
      
      return NextResponse.json({
        success: true,
        data: {
          cleanedFiles: cleanedCount,
          message: `${cleanedCount}개의 임시 파일을 정리했습니다.`
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('File management action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}