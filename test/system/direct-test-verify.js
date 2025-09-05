#!/usr/bin/env node

/**
 * 직접 무결성 검증 테스트 - HTTP API 사용
 * 생성된 테스트 데이터의 무결성과 비즈니스 규칙 준수 여부 검증
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

// 검증 결과 저장
const verificationResults = {
  passed: [],
  failed: [],
  warnings: [],
  stats: {}
};

// 1. 참조 무결성 검증
async function verifyReferentialIntegrity() {
  console.log('\n🔍 Phase 1: 참조 무결성 검증');
  
  // 1.1 모든 order_items가 유효한 order_id를 가지는지
  const orderItemsResult = await supabaseRequest('GET', '/order_items?select=id,order_id,product_id');
  const ordersResult = await supabaseRequest('GET', '/orders?select=id');
  
  if (orderItemsResult.success && ordersResult.success) {
    const orderIds = new Set(ordersResult.data.map(o => o.id));
    const orphanItems = orderItemsResult.data.filter(item => !orderIds.has(item.order_id));
    
    if (orphanItems.length === 0) {
      verificationResults.passed.push('✅ 모든 order_items가 유효한 order_id를 가짐');
    } else {
      verificationResults.failed.push(`❌ ${orphanItems.length}개의 order_items가 존재하지 않는 주문을 참조`);
    }
  }
  
  // 1.2 모든 order_items가 유효한 product_id를 가지는지
  const productsResult = await supabaseRequest('GET', '/products?select=id');
  
  if (orderItemsResult.success && productsResult.success) {
    const productIds = new Set(productsResult.data.map(p => p.id));
    const invalidProducts = orderItemsResult.data.filter(item => !productIds.has(item.product_id));
    
    if (invalidProducts.length === 0) {
      verificationResults.passed.push('✅ 모든 order_items가 유효한 product_id를 가짐');
    } else {
      verificationResults.failed.push(`❌ ${invalidProducts.length}개의 order_items가 존재하지 않는 상품을 참조`);
    }
  }
  
  // 1.3 모든 shipments가 유효한 order_id를 가지는지
  const shipmentsResult = await supabaseRequest('GET', '/shipments?select=id,order_id');
  
  if (shipmentsResult.success && ordersResult.success) {
    const orderIds = new Set(ordersResult.data.map(o => o.id));
    const orphanShipments = shipmentsResult.data.filter(s => !orderIds.has(s.order_id));
    
    if (orphanShipments.length === 0) {
      verificationResults.passed.push('✅ 모든 shipments가 유효한 order_id를 가짐');
    } else {
      verificationResults.failed.push(`❌ ${orphanShipments.length}개의 shipments가 존재하지 않는 주문을 참조`);
    }
  }
}

// 2. 비즈니스 규칙 검증
async function verifyBusinessRules() {
  console.log('\n📋 Phase 2: 비즈니스 규칙 검증');
  
  // 2.1 재고 수량이 음수인 상품이 없는지
  const productsResult = await supabaseRequest('GET', '/products?select=id,name,on_hand');
  
  if (productsResult.success) {
    const negativeStock = productsResult.data.filter(p => p.on_hand < 0);
    
    if (negativeStock.length === 0) {
      verificationResults.passed.push('✅ 모든 상품의 재고가 0 이상');
    } else {
      verificationResults.failed.push(`❌ ${negativeStock.length}개 상품이 음수 재고를 가짐`);
      console.log('   음수 재고 상품:', negativeStock.slice(0, 3).map(p => `${p.name}(${p.on_hand})`));
    }
    
    // 2.2 재고 부족 경고
    const lowStock = productsResult.data.filter(p => 
      p.on_hand > 0 && p.on_hand <= 5
    );
    
    if (lowStock.length > 0) {
      verificationResults.warnings.push(`⚠️ ${lowStock.length}개 상품이 재고 부족 (5개 이하)`);
    }
  }
  
  // 2.3 주문 총액이 order_items 합계와 일치하는지 (샘플링)
  const ordersResult = await supabaseRequest('GET', '/orders?select=id,order_no,total_amount&limit=100');
  
  if (ordersResult.success) {
    let mismatchCount = 0;
    
    for (const order of ordersResult.data.slice(0, 10)) { // 샘플 10개만 검사
      const itemsResult = await supabaseRequest('GET', `/order_items?order_id=eq.${order.id}&select=quantity,unit_price,subtotal`);
      
      if (itemsResult.success && itemsResult.data.length > 0) {
        const calculatedTotal = itemsResult.data.reduce((sum, item) => {
          return sum + (item.subtotal || item.quantity * item.unit_price);
        }, 0);
        
        // 10% 이상 차이나면 불일치로 판단
        const diff = Math.abs(order.total_amount - calculatedTotal);
        const diffPercent = (diff / order.total_amount) * 100;
        
        if (diffPercent > 10) {
          mismatchCount++;
          console.log(`   주문 ${order.order_no}: 총액 ${order.total_amount}, 계산값 ${calculatedTotal} (차이 ${diffPercent.toFixed(1)}%)`);
        }
      }
    }
    
    if (mismatchCount === 0) {
      verificationResults.passed.push('✅ 샘플 주문의 총액이 order_items 합계와 일치');
    } else {
      verificationResults.warnings.push(`⚠️ ${mismatchCount}개 주문의 총액이 order_items 합계와 불일치`);
    }
  }
  
  // 2.4 PCCC 코드 형식 검증
  const ordersWithPcccResult = await supabaseRequest('GET', '/orders?select=id,order_no,pccc_code,customer_name&limit=200');
  
  if (ordersWithPcccResult.success) {
    const invalidPccc = ordersWithPcccResult.data.filter(o => {
      if (!o.pccc_code) return true;
      // P 또는 C로 시작하고 13자리 숫자
      return !(/^[PC]\d{12}$/.test(o.pccc_code));
    });
    
    if (invalidPccc.length === 0) {
      verificationResults.passed.push('✅ 모든 주문이 유효한 PCCC 코드를 가짐');
    } else {
      verificationResults.failed.push(`❌ ${invalidPccc.length}개 주문이 잘못된 PCCC 코드를 가짐`);
      console.log('   잘못된 PCCC:', invalidPccc.slice(0, 3).map(o => `${o.order_no}: ${o.pccc_code}`));
    }
  }
}

// 3. 데이터 일관성 검증
async function verifyDataConsistency() {
  console.log('\n🔄 Phase 3: 데이터 일관성 검증');
  
  // 3.1 SHIPPED/DONE 상태 주문이 shipment를 가지는지
  const shippedOrdersResult = await supabaseRequest('GET', '/orders?status=in.(SHIPPED,DONE)&select=id,order_no,status');
  const shipmentsResult = await supabaseRequest('GET', '/shipments?select=order_id');
  
  if (shippedOrdersResult.success && shipmentsResult.success) {
    const shipmentOrderIds = new Set(shipmentsResult.data.map(s => s.order_id));
    const ordersWithoutShipment = shippedOrdersResult.data.filter(o => 
      !shipmentOrderIds.has(o.id)
    );
    
    if (ordersWithoutShipment.length === 0) {
      verificationResults.passed.push('✅ 모든 SHIPPED/DONE 주문이 배송 정보를 가짐');
    } else {
      verificationResults.warnings.push(`⚠️ ${ordersWithoutShipment.length}개의 SHIPPED/DONE 주문이 배송 정보 없음`);
    }
  }
  
  // 3.2 중복 SKU 검사
  const productsResult = await supabaseRequest('GET', '/products?select=sku');
  
  if (productsResult.success) {
    const skuCounts = {};
    productsResult.data.forEach(p => {
      skuCounts[p.sku] = (skuCounts[p.sku] || 0) + 1;
    });
    
    const duplicates = Object.entries(skuCounts).filter(([sku, count]) => count > 1);
    
    if (duplicates.length === 0) {
      verificationResults.passed.push('✅ 모든 상품 SKU가 고유함');
    } else {
      verificationResults.failed.push(`❌ ${duplicates.length}개의 중복 SKU 발견`);
      console.log('   중복 SKU:', duplicates.slice(0, 3).map(([sku, count]) => `${sku}(${count}개)`));
    }
  }
  
  // 3.3 주문 번호 형식 검증
  const ordersResult = await supabaseRequest('GET', '/orders?select=order_no&limit=200');
  
  if (ordersResult.success) {
    const invalidOrderNos = ordersResult.data.filter(o => {
      // ORD-YYMMDD-### 형식
      return !(/^ORD-\d{6}-\d{3}$/.test(o.order_no));
    });
    
    if (invalidOrderNos.length === 0) {
      verificationResults.passed.push('✅ 모든 주문 번호가 올바른 형식');
    } else {
      verificationResults.failed.push(`❌ ${invalidOrderNos.length}개 주문이 잘못된 주문 번호 형식`);
    }
  }
}

// 4. 성능 메트릭 수집
async function collectPerformanceMetrics() {
  console.log('\n📊 Phase 4: 성능 메트릭 수집');
  
  // 각 테이블의 레코드 수 조회
  const tables = ['products', 'orders', 'order_items', 'shipments'];
  
  for (const table of tables) {
    const result = await supabaseRequest('GET', `/${table}?select=id&limit=10000`);
    if (result.success) {
      verificationResults.stats[table] = result.data.length;
    }
  }
  
  // 응답 시간 테스트
  const startTime = Date.now();
  await supabaseRequest('GET', '/orders?select=*&limit=100');
  const responseTime = Date.now() - startTime;
  
  verificationResults.stats.responseTime = `${responseTime}ms (100 orders)`;
  
  if (responseTime < 1000) {
    verificationResults.passed.push(`✅ 응답 시간 양호: ${responseTime}ms`);
  } else {
    verificationResults.warnings.push(`⚠️ 응답 시간 느림: ${responseTime}ms`);
  }
}

// 5. 보고서 생성
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 무결성 검증 결과 보고서');
  console.log('='.repeat(60));
  
  console.log('\n✅ 통과한 검증 (' + verificationResults.passed.length + '개):');
  verificationResults.passed.forEach(item => console.log('  ' + item));
  
  if (verificationResults.failed.length > 0) {
    console.log('\n❌ 실패한 검증 (' + verificationResults.failed.length + '개):');
    verificationResults.failed.forEach(item => console.log('  ' + item));
  }
  
  if (verificationResults.warnings.length > 0) {
    console.log('\n⚠️ 경고 사항 (' + verificationResults.warnings.length + '개):');
    verificationResults.warnings.forEach(item => console.log('  ' + item));
  }
  
  console.log('\n📈 데이터 통계:');
  Object.entries(verificationResults.stats).forEach(([key, value]) => {
    console.log(`  • ${key}: ${value}${key.includes('Time') ? '' : '건'}`);
  });
  
  // 전체 평가
  console.log('\n' + '='.repeat(60));
  console.log('📝 종합 평가:');
  
  const totalTests = verificationResults.passed.length + verificationResults.failed.length;
  const passRate = (verificationResults.passed.length / totalTests * 100).toFixed(1);
  
  console.log(`  • 검증 통과율: ${passRate}%`);
  console.log(`  • 데이터 무결성: ${verificationResults.failed.length === 0 ? '양호' : '문제 있음'}`);
  console.log(`  • 비즈니스 규칙: ${verificationResults.warnings.length <= 3 ? '준수' : '일부 위반'}`);
  
  if (verificationResults.failed.length === 0) {
    console.log('\n✅ 무결성 검증 완료! 시스템이 정상적으로 작동합니다.');
  } else {
    console.log('\n❌ 무결성 문제가 발견되었습니다. 수정이 필요합니다.');
  }
  
  // 다음 단계 제안
  console.log('\n📋 다음 단계:');
  if (verificationResults.failed.length > 0) {
    console.log('  1. 발견된 무결성 문제를 수정');
    console.log('  2. 데이터 재생성 후 재검증');
  } else {
    console.log('  1. 기능 테스트 진행 (direct-test-functional.js)');
    console.log('  2. UI 테스트 진행');
    console.log('  3. 성능 최적화');
  }
}

// 메인 실행 함수
async function main() {
  console.log('========================================');
  console.log('   무결성 검증 시작');
  console.log('========================================');
  
  try {
    const startTime = Date.now();
    
    // 각 검증 단계 실행
    await verifyReferentialIntegrity();
    await verifyBusinessRules();
    await verifyDataConsistency();
    await collectPerformanceMetrics();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    verificationResults.stats.totalVerificationTime = `${totalTime}초`;
    
    // 보고서 생성
    generateReport();
    
  } catch (error) {
    console.error('\n❌ 검증 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  verifyReferentialIntegrity, 
  verifyBusinessRules, 
  verifyDataConsistency,
  collectPerformanceMetrics 
};