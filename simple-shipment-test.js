// 간단한 배송 데이터 삽입 테스트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simpleTest() {
  try {
    console.log('1. 주문 ID 하나 가져오기...');
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number')
      .limit(1);
    
    if (!order || order.length === 0) {
      console.log('주문이 없습니다.');
      return;
    }
    
    console.log('선택된 주문:', order[0].order_number);
    
    console.log('2. 배송 데이터 생성 시도...');
    const { data, error } = await supabase
      .from('shipments')
      .insert([{
        order_id: order[0].id,
        courier: 'cj',
        tracking_number: 'SIMPLE_TEST_' + Date.now()
      }])
      .select('*');
    
    if (error) {
      console.log('❌ 실패:', error);
    } else {
      console.log('✅ 성공!');
      console.log('생성된 데이터:', data[0]);
    }
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

simpleTest();