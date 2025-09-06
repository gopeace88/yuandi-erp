/**
 * 자동 백업 Cron Job
 * Vercel Cron을 통해 정기적으로 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFullBackup, cleanupOldBackups } from '@/lib/backup';
import { createServerSupabase } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications';

// This route uses request headers for authorization
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Cron secret 확인 (보안)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting automatic backup...');

    // 시스템 설정 조회
    const supabase = await createServerSupabase();
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'auto_backup_enabled')
      .single();

    if (settings?.value !== 'true') {
      console.log('Auto backup is disabled');
      return NextResponse.json({
        success: true,
        message: 'Auto backup is disabled'
      });
    }

    // 백업 실행
    const backupResult = await createFullBackup({
      includeData: true,
      includeSchema: true,
      includeFunctions: true,
      includeTriggers: true,
      format: 'json'
    });

    if (!backupResult.success) {
      // 실패 알림 전송
      await sendNotification({
        userId: 'system',
        type: 'error',
        channel: 'email',
        template: 'system_alert',
        data: {
          title: 'Auto Backup Failed',
          message: `Automatic backup failed: ${backupResult.error}`,
          timestamp: new Date().toISOString()
        }
      });

      return NextResponse.json(
        { error: backupResult.error },
        { status: 500 }
      );
    }

    // 오래된 백업 정리
    const cleanupResult = await cleanupOldBackups(30); // 30일 이상된 백업 삭제

    // 성공 알림 전송 (관리자에게)
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id, email, name')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await sendNotification({
          userId: admin.id,
          type: 'success',
          channel: 'email',
          template: 'backup_complete',
          data: {
            adminName: admin.name,
            filename: backupResult.filename,
            size: formatFileSize(backupResult.size || 0),
            tables: backupResult.tables,
            rows: backupResult.rows,
            downloadUrl: backupResult.downloadUrl,
            deletedOldBackups: cleanupResult.deleted
          }
        });
      }
    }

    // 백업 통계 업데이트
    await supabase
      .from('backup_statistics')
      .upsert({
        id: 'auto_backup',
        last_backup_at: new Date().toISOString(),
        last_backup_size: backupResult.size,
        last_backup_tables: backupResult.tables,
        last_backup_rows: backupResult.rows,
        total_backups: supabase.sql`total_backups + 1`,
        total_size: supabase.sql`total_size + ${backupResult.size || 0}`
      });

    console.log('Automatic backup completed successfully');

    return NextResponse.json({
      success: true,
      data: {
        backup: {
          filename: backupResult.filename,
          size: backupResult.size,
          tables: backupResult.tables,
          rows: backupResult.rows
        },
        cleanup: {
          deleted: cleanupResult.deleted
        }
      }
    });
  } catch (error) {
    console.error('Auto backup error:', error);
    
    // 에러 알림 전송
    try {
      await sendNotification({
        userId: 'system',
        type: 'error',
        channel: 'email',
        template: 'system_alert',
        data: {
          title: 'Auto Backup Error',
          message: `Automatic backup encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (notifyError) {
      console.error('Failed to send error notification:', notifyError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 파일 크기 포맷팅
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}