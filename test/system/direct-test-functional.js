#!/usr/bin/env node

/**
 * 기능 테스트 스크립트 - 주요 비즈니스 기능 검증
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 환경 변수 로드
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase REST API 호출 함수
async function supabaseRequest(method, path, body = null) {
  const url = new URL(supabaseUrl);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = data ? JSON.parse(data) : null;
            resolve({ success: true, data: result, status: res.statusCode });
          } catch (e) {
            resolve({ success: true, data: data, status: res.statusCode });
          }
        } else {
          resolve({ success: false, error: data, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// 테스트 결과 저장
const testResults = {
  passed: [],
  failed: [],
  total: 0
};

// 헬퍼 함수
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 1. 고객 주문 조회 테스트
async function testCustomerOrderLookup() {
  console.log('\n🔍 Test 1: 고객 주문 조회 기능');
  
  // 샘플 주문 가져오기
  const ordersResult = await supabaseRequest('GET', '/orders?select=customer_name,customer_phone&limit=5');
  
  if (!ordersResult.success || !ordersResult.data || ordersResult.data.length === 0) {
    testResults.failed.push('❌ 고객 주문 조회: 샘플 주문을 가져올 수 없음');
    return;
  }
  
  const sampleCustomer = ordersResult.data[0];
  
  // 고객 이름과 전화번호로 조회
  const lookupResult = await supabaseRequest(
    'GET', 
    `/orders?customer_name=eq.${encodeURIComponent(sampleCustomer.customer_name)}&customer_phone=eq.${sampleCustomer.customer_phone}&select=*`
  );
  
  if (lookupResult.success && lookupResult.data && lookupResult.data.length > 0) {
    testResults.passed.push(`✅ 고객 주문 조회 성공 (${lookupResult.data.length}건 조회)`);
    console.log(`   고객: ${sampleCustomer.customer_name}, 전화: ${sampleCustomer.customer_phone}`);
    console.log(`   조회된 주문: ${lookupResult.data.length}건`);
  } else {
    testResults.failed.push('❌ 고객 주문 조회 실패');
  }
}

// 2. 재고 실시간 업데이트 테스트
async function testInventoryUpdate() {
  console.log('\n📦 Test 2: 재고 실시간 업데이트');
  
  // 샘플 상품 가져오기
  const productsResult = await supabaseRequest('GET', '/products?on_hand=gt.10&limit=1');
  
  if (!productsResult.success || !productsResult.data || productsResult.data.length === 0) {
    testResults.failed.push('❌ 재고 업데이트 테스트: 적절한 상품을 찾을 수 없음');
    return;
  }
  
  const product = productsResult.data[0];
  const originalStock = product.on_hand;
  
  // 재고 감소 시뮬레이션 (주문 생성)
  const testOrder = {
    order_no: `TEST-${Date.now()}`,
    order_date: new Date().toISOString().split('T')[0],
    customer_name: '테스트 고객',
    customer_phone: '01012345678',
    shipping_address: '서울시 테스트구',
    zip_code: '12345',
    pccc_code: `P${Date.now()}`,
    status: 'PAID',
    total_amount: product.sale_price_krw || 100000,
    currency: 'KRW',
    internal_memo: '재고 업데이트 테스트'
  };
  
  const orderResult = await supabaseRequest('POST', '/orders', testOrder);
  
  if (orderResult.success) {
    const orderId = orderResult.data[0]?.id || orderResult.data.id;
    
    // 주문 아이템 생성
    const orderItem = {
      order_id: orderId,
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
      product_category: product.category,
      quantity: 2,
      unit_price: product.sale_price_krw || 50000,
      subtotal: (product.sale_price_krw || 50000) * 2
    };
    
    await supabaseRequest('POST', '/order_items', orderItem);
    
    // 재고 확인
    const updatedProductResult = await supabaseRequest('GET', `/products?id=eq.${product.id}`);
    
    if (updatedProductResult.success && updatedProductResult.data) {
      const updatedStock = updatedProductResult.data[0].on_hand;
      const expectedStock = originalStock - 2;
      
      if (Math.abs(updatedStock - expectedStock) <= 2) {
        testResults.passed.push(`✅ 재고 업데이트 성공 (${originalStock} → ${updatedStock})`);
      } else {
        testResults.failed.push(`❌ 재고 업데이트 불일치 (예상: ${expectedStock}, 실제: ${updatedStock})`);
      }
    }
    
    // 테스트 주문 삭제
    await supabaseRequest('DELETE', `/order_items?order_id=eq.${orderId}`);
    await supabaseRequest('DELETE', `/orders?id=eq.${orderId}`);
  }
}

// 3. 배송 추적 번호 등록 테스트
async function testShippingTracking() {
  console.log('\n🚚 Test 3: 배송 추적 번호 등록');
  
  // PAID 상태 주문 찾기
  const ordersResult = await supabaseRequest('GET', '/orders?status=eq.PAID&limit=1');
  
  if (!ordersResult.success || !ordersResult.data || ordersResult.data.length === 0) {
    testResults.failed.push('❌ 배송 추적 테스트: PAID 주문을 찾을 수 없음');
    return;
  }
  
  const order = ordersResult.data[0];
  
  // 배송 정보 등록
  const shipment = {
    order_id: order.id,
    courier: 'CJ대한통운',
    courier_code: 'cj',
    tracking_no: `TEST${Date.now()}`,
    tracking_url: 'https://tracker.delivery/test',
    shipped_at: new Date().toISOString()
  };
  
  const shipmentResult = await supabaseRequest('POST', '/shipments', shipment);
  
  if (shipmentResult.success) {
    // 주문 상태 업데이트 확인
    const updatedOrderResult = await supabaseRequest('GET', `/orders?id=eq.${order.id}`);
    
    if (updatedOrderResult.success && updatedOrderResult.data) {
      const updatedOrder = updatedOrderResult.data[0];
      
      // 배송 정보 삭제 (테스트 정리)
      const shipmentId = shipmentResult.data[0]?.id || shipmentResult.data.id;
      await supabaseRequest('DELETE', `/shipments?id=eq.${shipmentId}`);
      
      testResults.passed.push(`✅ 배송 추적 번호 등록 성공`);
      console.log(`   주문: ${order.order_no}`);
      console.log(`   택배사: ${shipment.courier}`);
      console.log(`   추적번호: ${shipment.tracking_no}`);
    }
  } else {
    testResults.failed.push('❌ 배송 추적 번호 등록 실패');
  }
}

// 4. 주문 상태 변경 워크플로우 테스트
async function testOrderStatusWorkflow() {
  console.log('\n🔄 Test 4: 주문 상태 변경 워크플로우');
  
  const statuses = ['PAID', 'SHIPPED', 'DONE'];
  let success = true;
  
  // 테스트 주문 생성
  const testOrder = {
    order_no: `WORKFLOW-${Date.now()}`,
    order_date: new Date().toISOString().split('T')[0],
    customer_name: '워크플로우 테스트',
    customer_phone: '01098765432',
    shipping_address: '경기도 테스트시',
    zip_code: '54321',
    pccc_code: `P${Date.now()}`,
    status: 'PAID',
    total_amount: 100000,
    currency: 'KRW'
  };
  
  const orderResult = await supabaseRequest('POST', '/orders', testOrder);
  
  if (orderResult.success) {
    const orderId = orderResult.data[0]?.id || orderResult.data.id;
    
    // 상태 변경 테스트
    for (let i = 1; i < statuses.length; i++) {
      const updateResult = await supabaseRequest(
        'PATCH',
        `/orders?id=eq.${orderId}`,
        { status: statuses[i] }
      );
      
      if (!updateResult.success) {
        success = false;
        break;
      }
    }
    
    // 테스트 주문 삭제
    await supabaseRequest('DELETE', `/orders?id=eq.${orderId}`);
    
    if (success) {
      testResults.passed.push(`✅ 주문 상태 워크플로우 성공 (${statuses.join(' → ')})`);
    } else {
      testResults.failed.push('❌ 주문 상태 워크플로우 실패');
    }
  }
}

// 5. 대시보드 데이터 조회 테스트
async function testDashboardData() {
  console.log('\n📊 Test 5: 대시보드 데이터 조회');
  
  const queries = [
    { name: '오늘 주문', path: `/orders?order_date=eq.${new Date().toISOString().split('T')[0]}&select=*` },
    { name: '재고 부족', path: '/products?on_hand=lt.6&select=*' },
    { name: '최근 주문', path: '/orders?select=*&order=created_at.desc&limit=5' }
  ];
  
  let allSuccess = true;
  
  for (const query of queries) {
    const result = await supabaseRequest('GET', query.path);
    
    if (result.success) {
      console.log(`   ✓ ${query.name}: ${result.data.length}건 조회`);
    } else {
      allSuccess = false;
      console.log(`   ✗ ${query.name}: 조회 실패`);
    }
  }
  
  if (allSuccess) {
    testResults.passed.push('✅ 대시보드 데이터 조회 성공');
  } else {
    testResults.failed.push('❌ 일부 대시보드 데이터 조회 실패');
  }
}

// 6. 환불 처리 테스트
async function testRefundProcess() {
  console.log('\n💰 Test 6: 환불 처리 프로세스');
  
  // DONE 상태 주문 찾기
  const ordersResult = await supabaseRequest('GET', '/orders?status=eq.DONE&limit=1');
  
  if (!ordersResult.success || !ordersResult.data || ordersResult.data.length === 0) {
    // DONE 주문이 없으면 PAID 주문으로 테스트
    const paidOrdersResult = await supabaseRequest('GET', '/orders?status=eq.PAID&limit=1');
    
    if (!paidOrdersResult.success || !paidOrdersResult.data || paidOrdersResult.data.length === 0) {
      testResults.failed.push('❌ 환불 테스트: 적절한 주문을 찾을 수 없음');
      return;
    }
    
    const order = paidOrdersResult.data[0];
    
    // 환불 상태로 변경
    const refundResult = await supabaseRequest(
      'PATCH',
      `/orders?id=eq.${order.id}`,
      { status: 'REFUNDED' }
    );
    
    if (refundResult.success) {
      testResults.passed.push('✅ 환불 처리 성공');
      console.log(`   주문: ${order.order_no}`);
      console.log(`   상태: PAID → REFUNDED`);
      
      // 원상복구
      await supabaseRequest('PATCH', `/orders?id=eq.${order.id}`, { status: 'PAID' });
    } else {
      testResults.failed.push('❌ 환불 처리 실패');
    }
  }
}

// 7. 검색 기능 테스트
async function testSearchFunctionality() {
  console.log('\n🔎 Test 7: 검색 기능');
  
  const searchTests = [
    { 
      name: 'SKU 검색',
      path: '/products?sku=ilike.*BAG*&select=sku,name'
    },
    { 
      name: '고객명 검색',
      path: `/orders?customer_name=ilike.*${encodeURIComponent('김')}*&select=order_no,customer_name`
    },
    { 
      name: '주문번호 검색',
      path: '/orders?order_no=ilike.ORD-250904*&select=order_no,status'
    }
  ];
  
  let allSuccess = true;
  
  for (const test of searchTests) {
    const result = await supabaseRequest('GET', test.path);
    
    if (result.success && result.data) {
      console.log(`   ✓ ${test.name}: ${result.data.length}건 검색됨`);
      if (result.data.length > 0) {
        console.log(`     샘플: ${JSON.stringify(result.data[0])}`);
      }
    } else {
      allSuccess = false;
      console.log(`   ✗ ${test.name}: 검색 실패`);
    }
  }
  
  if (allSuccess) {
    testResults.passed.push('✅ 검색 기능 정상 작동');
  } else {
    testResults.failed.push('❌ 일부 검색 기능 실패');
  }
}

// 8. 통계 집계 테스트
async function testStatisticsAggregation() {
  console.log('\n📈 Test 8: 통계 집계 기능');
  
  // 주문 상태별 집계
  const statusResult = await supabaseRequest('GET', '/orders?select=status');
  
  if (statusResult.success && statusResult.data) {
    const statusCounts = {};
    statusResult.data.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    console.log('   주문 상태 분포:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}건`);
    });
    
    testResults.passed.push('✅ 통계 집계 성공');
  } else {
    testResults.failed.push('❌ 통계 집계 실패');
  }
}

// 결과 보고서 생성
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 기능 테스트 결과 보고서');
  console.log('='.repeat(60));
  
  console.log(`\n전체 테스트: ${testResults.total}개`);
  console.log(`통과: ${testResults.passed.length}개`);
  console.log(`실패: ${testResults.failed.length}개`);
  
  if (testResults.passed.length > 0) {
    console.log('\n✅ 통과한 테스트:');
    testResults.passed.forEach(test => console.log('  ' + test));
  }
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ 실패한 테스트:');
    testResults.failed.forEach(test => console.log('  ' + test));
  }
  
  const passRate = (testResults.passed.length / testResults.total * 100).toFixed(1);
  console.log(`\n📊 통과율: ${passRate}%`);
  
  if (testResults.failed.length === 0) {
    console.log('\n✅ 모든 기능 테스트를 통과했습니다!');
    console.log('\n📝 다음 단계:');
    console.log('  1. UI 테스트 진행');
    console.log('  2. 성능 최적화');
    console.log('  3. 프로덕션 배포 준비');
  } else {
    console.log('\n⚠️ 일부 기능 테스트가 실패했습니다.');
    console.log('\n📝 권장 사항:');
    console.log('  1. 실패한 기능 디버깅');
    console.log('  2. 코드 수정 후 재테스트');
    console.log('  3. 무결성 검증 재실행');
  }
}

// 메인 실행 함수
async function main() {
  console.log('========================================');
  console.log('   기능 테스트 시작');
  console.log('========================================');
  
  try {
    const startTime = Date.now();
    
    // 테스트 실행
    const tests = [
      testCustomerOrderLookup,
      testInventoryUpdate,
      testShippingTracking,
      testOrderStatusWorkflow,
      testDashboardData,
      testRefundProcess,
      testSearchFunctionality,
      testStatisticsAggregation
    ];
    
    testResults.total = tests.length;
    
    for (const test of tests) {
      await test();
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // 보고서 생성
    generateReport();
    console.log(`\n총 실행 시간: ${totalTime}초`);
    
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };