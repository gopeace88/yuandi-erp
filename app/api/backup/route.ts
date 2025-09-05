/**
 * 백업 API 라우트
 * 백업 생성, 복원, 내보내기 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFullBackup, restoreBackup, exportData, cleanupOldBackups } from '@/lib/backup';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// 백업 생성
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

    // 관리자 권한 확인
    const supabase = createClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, options = {} } = body;

    switch (action) {
      case 'create': {
        // 백업 생성
        const result = await createFullBackup(options);
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            filename: result.filename,
            size: result.size,
            tables: result.tables,
            rows: result.rows,
            downloadUrl: result.downloadUrl
          }
        });
      }

      case 'restore': {
        // 복원 작업
        const { backupUrl, restoreOptions = {} } = options;
        
        if (!backupUrl) {
          return NextResponse.json(
            { error: 'Backup URL is required' },
            { status: 400 }
          );
        }

        const result = await restoreBackup(backupUrl, restoreOptions);
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            restored: result.restored,
            message: `Successfully restored ${result.restored} records`
          }
        });
      }

      case 'cleanup': {
        // 오래된 백업 정리
        const { retentionDays = 30 } = options;
        const result = await cleanupOldBackups(retentionDays);
        
        return NextResponse.json({
          success: true,
          data: {
            deleted: result.deleted,
            message: `Deleted ${result.deleted} old backups`
          }
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Backup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 백업 목록 조회
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

    const supabase = createClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 백업 기록 조회
    const { data: backups, error, count } = await supabase
      .from('backup_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Storage에서 실제 파일 정보 조회
    const { data: storageFiles } = await supabase.storage
      .from('backups')
      .list('', {
        limit: 100,
        offset: 0
      });

    // 백업 정보 병합
    const backupsWithUrls = backups?.map(backup => {
      const storageFile = storageFiles?.find(f => f.name === backup.filename);
      
      if (storageFile) {
        const { data: urlData } = supabase.storage
          .from('backups')
          .getPublicUrl(backup.filename);
        
        return {
          ...backup,
          downloadUrl: urlData.publicUrl,
          fileSize: storageFile.metadata?.size || backup.size
        };
      }
      
      return backup;
    });

    return NextResponse.json({
      success: true,
      data: {
        backups: backupsWithUrls || [],
        total: count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Get backups error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}