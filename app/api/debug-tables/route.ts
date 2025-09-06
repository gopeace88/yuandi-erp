import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // 테이블 목록 확인
    const { data: tables, error } = await supabase.rpc('get_table_list');
    
    if (error) {
      console.error('Error getting table list:', error);
    }
    
    // 몇 개의 테이블을 직접 테스트해보기
    const testTables = ['cashbook', 'orders', 'products', 'shipments', 'users', 'profiles'];
    const results: any = {};
    
    for (const tableName of testTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        results[tableName] = {
          success: !error,
          error: error?.message || null,
          hasData: data && data.length > 0,
          count: data?.length || 0
        };
      } catch (err: any) {
        results[tableName] = {
          success: false,
          error: err.message,
          hasData: false,
          count: 0
        };
      }
    }
    
    return NextResponse.json({
      message: 'Debug table access',
      results,
      tables: tables || null,
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasServiceKey: !!process.env.SUPABASE_API_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_API_KEY
      }
    });
  } catch (error: any) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}