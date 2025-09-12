/**
 * 테스트 데이터 생성 스크립트
 * scripts/03.test_data.sql 파일을 읽어서 Supabase에 실행
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL과 API Key가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLFile() {
  try {
    console.log('📚 테스트 데이터 SQL 파일 읽기...');
    const sqlFilePath = path.join(__dirname, '03.test_data.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('🗑️ 기존 데이터 삭제 중...');
    
    // 기존 데이터 삭제
    await supabase.from('event_logs').delete().neq('id', 0);
    await supabase.from('cashbook_transactions').delete().neq('id', 0);
    await supabase.from('inventory_movements').delete().neq('id', 0);
    await supabase.from('shipments').delete().neq('id', 0);
    await supabase.from('order_items').delete().neq('id', 0);
    await supabase.from('orders').delete().neq('id', 0);
    await supabase.from('products').delete().neq('id', 0);
    
    console.log('✅ 기존 데이터 삭제 완료');
    
    // SQL 파일 실행은 psql이나 Supabase Dashboard를 통해 해야 함
    console.log('\n⚠️ 복잡한 SQL 스크립트는 Supabase Dashboard SQL Editor에서 실행해주세요:');
    console.log('1. Supabase Dashboard > SQL Editor 열기');
    console.log('2. scripts/03.test_data.sql 내용 복사하여 붙여넣기');
    console.log('3. Run 버튼 클릭하여 실행');
    
    console.log('\n또는 아래 명령어로 간단한 테스트 데이터를 생성하세요:');
    console.log('node scripts/generate-simple-test-data.js');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

executeSQLFile();