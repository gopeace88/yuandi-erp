// Shipments 테이블 정확한 스키마 확인
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestShipment() {
  console.log('=== Shipments 테이블에 테스트 데이터 삽입 ===');
  try {
    // 최소 필드만 사용하여 삽입 시도
    const { data, error } = await supabase
      .from('shipments')
      .insert([
        {
          order_id: '94935d42-5432-4113-a37c-f64fffc4c5b3', // 실제 존재하는 order ID
          courier: 'CJ대한통운',
          tracking_no: 'TEST123456'
        }
      ])
      .select('*');
    
    if (error) {
      console.log('Insert 오류:', error);
      
      // 테이블 구조 정보를 위해 다른 방법으로 시도
      console.log('\n=== 빈 select로 컬럼 확인 ===');
      const { data: emptyData, error: emptyError } = await supabase
        .from('shipments')
        .select('*')
        .limit(0);
      
      if (emptyError) {
        console.log('Empty select 오류:', emptyError);
      } else {
        console.log('Shipments 테이블 존재 확인됨');
      }
    } else {
      console.log('삽입 성공!');
      console.log('Shipments 컬럼들:', Object.keys(data[0]));
      console.log('삽입된 데이터:', data[0]);
    }
  } catch (err) {
    console.log('전체 과정 실패:', err.message);
  }
}

async function main() {
  await insertTestShipment();
}

main().catch(console.error);