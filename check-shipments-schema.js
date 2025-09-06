// Shipments 테이블 정확한 스키마 확인
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShipmentsSchema() {
  console.log('=== Shipments 테이블 스키마 확인 ===\n');
  
  try {
    // 1. 빈 select로 컬럼 정보 확인
    console.log('1. 빈 SELECT로 컬럼 구조 확인:');
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .limit(0);
    
    if (error) {
      console.log('Shipments select 오류:', error);
      return;
    }
    
    console.log('✅ Shipments 테이블 존재');
    
    // 2. 최소 컬럼으로 삽입 테스트
    console.log('\n2. 최소 필수 컬럼으로 삽입 테스트:');
    
    // shipped 상태인 주문 하나 가져오기
    const { data: testOrder, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('status', 'shipped')
      .limit(1);
    
    if (orderError || !testOrder || testOrder.length === 0) {
      console.log('테스트할 주문이 없습니다:', orderError);
      return;
    }
    
    console.log(`테스트 주문: ${testOrder[0].order_number}`);
    
    // 최소 데이터로 삽입 시도
    const testShipment = {
      order_id: testOrder[0].id,
      courier: 'CJ대한통운',
      tracking_number: 'TEST' + Date.now()
    };
    
    console.log('삽입할 데이터:', testShipment);
    
    const { data: inserted, error: insertError } = await supabase
      .from('shipments')
      .insert([testShipment])
      .select('*');
    
    if (insertError) {
      console.log('❌ 삽입 실패:', insertError);
      
      // 각 컬럼별로 테스트해보기
      console.log('\n3. 개별 컬럼 테스트:');
      const possibleColumns = [
        'order_id',
        'courier', 
        'tracking_number',
        'tracking_url',
        'shipping_cost_krw',
        'weight_g',
        'package_images',
        'created_at',
        'updated_at'
      ];
      
      for (const col of possibleColumns) {
        try {
          const { error: colError } = await supabase
            .from('shipments')
            .select(col)
            .limit(0);
          
          if (colError) {
            console.log(`❌ ${col}: 없음 - ${colError.message}`);
          } else {
            console.log(`✅ ${col}: 존재`);
          }
        } catch (e) {
          console.log(`❌ ${col}: 오류 - ${e.message}`);
        }
      }
      
    } else {
      console.log('✅ 삽입 성공!');
      if (inserted && inserted.length > 0) {
        console.log('생성된 배송 데이터:');
        console.log('컬럼들:', Object.keys(inserted[0]));
        console.log('데이터:', inserted[0]);
        
        // 테스트 데이터 삭제
        const { error: deleteError } = await supabase
          .from('shipments')
          .delete()
          .eq('id', inserted[0].id);
        
        if (deleteError) {
          console.log('테스트 데이터 삭제 실패:', deleteError);
        } else {
          console.log('테스트 데이터 정리 완료');
        }
      }
    }
    
  } catch (error) {
    console.error('전체 프로세스 실패:', error);
  }
}

checkShipmentsSchema();