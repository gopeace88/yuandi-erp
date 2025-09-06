/**
 * 데이터 내보내기 API
 * Excel, CSV, JSON 포맷으로 데이터 내보내기
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportData } from '@/lib/backup';
import { headers } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';

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

    const supabase = await createServerSupabase();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 사용자 권한 확인 (관리자 또는 주문 관리자)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['admin', 'order_manager'].includes(profile?.role || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      type = 'all',
      format = 'xlsx',
      dateRange,
      locale = 'ko'
    } = body;

    // 날짜 범위 파싱
    const exportOptions = {
      format: format as 'xlsx' | 'csv' | 'json',
      locale: locale as 'ko' | 'zh-CN' | 'en',
      dateRange: dateRange ? {
        from: new Date(dateRange.from),
        to: new Date(dateRange.to)
      } : undefined
    };

    // 데이터 내보내기
    const result = await exportData(
      type as 'orders' | 'products' | 'customers' | 'inventory' | 'cashbook' | 'all',
      exportOptions
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // 내보내기 기록 저장
    await supabase
      .from('export_history')
      .insert({
        type,
        format,
        exported_by: user.id,
        download_url: result.downloadUrl,
        options: JSON.stringify(exportOptions)
      });

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: result.downloadUrl,
        format,
        type,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 내보내기 기록 조회
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

    const supabase = await createServerSupabase();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 내보내기 기록 조회
    const { data: exports, error, count } = await supabase
      .from('export_history')
      .select(`
        *,
        user:user_profiles(name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        exports: exports || [],
        total: count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Get exports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}