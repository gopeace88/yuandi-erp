import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET() {
  console.log('Debug API called');
  
  // 환경 변수 확인
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음',
    NEXT_PUBLIC_SUPABASE_API_KEY: process.env.NEXT_PUBLIC_SUPABASE_API_KEY ? '✅ 설정됨' : '❌ 없음',
    SUPABASE_API_KEY: process.env.SUPABASE_API_KEY ? '✅ 설정됨' : '❌ 없음',
  };

  // Supabase 연결 테스트
  let supabaseTest = {};
  try {
    const supabase = createClient();
    
    // Orders 테스트
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    // Shipments 테스트
    const { data: shipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('*')
      .limit(1);
    
    // Cashbook 테스트
    const { data: cashbook, error: cashbookError } = await supabase
      .from('cashbook')
      .select('*')
      .limit(1);
    
    supabaseTest = {
      orders: {
        success: !ordersError,
        error: ordersError?.message || null,
        dataExists: orders && orders.length > 0
      },
      shipments: {
        success: !shipmentsError,
        error: shipmentsError?.message || null,
        dataExists: shipments && shipments.length > 0
      },
      cashbook: {
        success: !cashbookError,
        error: cashbookError?.message || null,
        dataExists: cashbook && cashbook.length > 0
      }
    };
  } catch (error: any) {
    supabaseTest = {
      error: error.message || 'Unknown error'
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envCheck,
    supabaseTest,
    message: '디버그 정보입니다. /api/debug 엔드포인트'
  });
}