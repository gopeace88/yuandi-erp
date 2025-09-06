// RLS 상태 확인 및 비활성화 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
// Service Role Key (RLS 우회 가능)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';
// Anon Key (RLS 적용)
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

async function checkRLS() {
  console.log('=== RLS 상태 확인 ===\n');
  
  // 1. Anon Key로 데이터 조회 (RLS 적용)
  console.log('1. Anon Key로 데이터 조회 (RLS 적용):');
  const supabaseAnon = createClient(supabaseUrl, anonKey);
  
  try {
    // Orders 조회
    const { data: ordersAnon, error: ordersError } = await supabaseAnon
      .from('orders')
      .select('*')
      .limit(5);
    
    if (ordersError) {
      console.log('❌ Orders 조회 실패 (Anon):', ordersError.message);
    } else {
      console.log(`✅ Orders 조회 성공 (Anon): ${ordersAnon?.length || 0}개`);
    }
    
    // Shipments 조회
    const { data: shipmentsAnon, error: shipmentsError } = await supabaseAnon
      .from('shipments')
      .select('*')
      .limit(5);
    
    if (shipmentsError) {
      console.log('❌ Shipments 조회 실패 (Anon):', shipmentsError.message);
    } else {
      console.log(`✅ Shipments 조회 성공 (Anon): ${shipmentsAnon?.length || 0}개`);
    }
    
    // Cashbook 조회
    const { data: cashbookAnon, error: cashbookError } = await supabaseAnon
      .from('cashbook_transactions')
      .select('*')
      .limit(5);
    
    if (cashbookError) {
      console.log('❌ Cashbook 조회 실패 (Anon):', cashbookError.message);
    } else {
      console.log(`✅ Cashbook 조회 성공 (Anon): ${cashbookAnon?.length || 0}개`);
    }
    
  } catch (error) {
    console.error('Anon 조회 중 오류:', error);
  }
  
  console.log('\n=== 해결 방법 ===');
  console.log('1. Supabase Dashboard → SQL Editor에서 다음 SQL 실행:');
  console.log(`
-- 개발 환경용: 모든 테이블의 RLS 비활성화
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- 또는 RLS를 유지하면서 anon 사용자 접근 허용
CREATE POLICY "Allow anonymous read access" ON orders
  FOR SELECT USING (true);
  
CREATE POLICY "Allow anonymous read access" ON shipments
  FOR SELECT USING (true);
  
CREATE POLICY "Allow anonymous read access" ON cashbook_transactions
  FOR SELECT USING (true);
  `);
  
  console.log('\n2. 또는 Service Role Key를 환경변수에 설정:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('   (Supabase Dashboard → Settings → API에서 확인)');
}

checkRLS();