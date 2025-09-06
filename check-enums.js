// Enum 값들 확인
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnums() {
  console.log('=== Enum 값 확인 ===\n');
  
  try {
    // 1. 허용되는 courier 값들 테스트
    console.log('1. Courier Enum 값 테스트:');
    const possibleCouriers = [
      'cj', 'hanjin', 'lotte', 'epost', 'logen', 
      'CJ', 'HANJIN', 'LOTTE', 'EPOST', 'LOGEN',
      'cj_logistics', 'hanjin_express', 'lotte_global', 'korea_post', 'logen_logistics'
    ];
    
    // 테스트용 주문 ID 가져오기
    const { data: testOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'shipped')
      .limit(1);
      
    if (!testOrder || testOrder.length === 0) {
      console.log('테스트할 주문이 없습니다.');
      return;
    }
    
    const testOrderId = testOrder[0].id;
    
    for (const courier of possibleCouriers) {
      const { error } = await supabase
        .from('shipments')
        .insert([{
          order_id: testOrderId,
          courier: courier,
          tracking_number: `TEST_${courier}_${Date.now()}`
        }]);
      
      if (error) {
        console.log(`❌ ${courier}: ${error.message}`);
      } else {
        console.log(`✅ ${courier}: 성공!`);
        
        // 성공한 경우 즉시 삭제
        await supabase
          .from('shipments')
          .delete()
          .eq('order_id', testOrderId)
          .eq('courier', courier);
        
        break; // 첫 번째 성공한 값으로 중단
      }
    }
    
    // 2. Order status enum도 확인
    console.log('\n2. Order Status Enum 확인:');
    const { data: orderStatuses } = await supabase
      .from('orders')
      .select('status')
      .limit(10);
      
    if (orderStatuses) {
      const uniqueStatuses = [...new Set(orderStatuses.map(o => o.status))];
      console.log('허용되는 order status 값들:', uniqueStatuses);
    }
    
  } catch (error) {
    console.error('Enum 확인 실패:', error);
  }
}

checkEnums();