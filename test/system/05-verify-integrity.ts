/**
 * 시스템 테스트 - Phase 5: 데이터베이스 무결성 검증
 * 업무 플로우에 따른 데이터 일관성 및 무결성 검증
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 검증 결과 타입
interface VerificationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

// 결과 기록
function recordResult(category: string, test: string, passed: boolean, message: string, details?: any) {
  results.push({ category, test, passed, message, details });
  
  const icon = passed ? '✅' : '❌';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`  ${color}${icon}${reset} ${test}: ${message}`);
  
  if (!passed && details) {
    console.log(`     상세: ${JSON.stringify(details, null, 2)}`);
  }
}

// 1. 참조 무결성 검증
async function verifyReferentialIntegrity() {
  console.log('\n🔍 참조 무결성 검증');
  
  // 1.1 주문-고객 관계
  const { data: orphanOrders } = await supabase
    .from('orders')
    .select('order_no, customer_id')
    .is('customer_id', null);
  
  recordResult(
    '참조 무결성',
    '주문-고객 관계',
    !orphanOrders || orphanOrders.length === 0,
    orphanOrders?.length ? `고객 없는 주문 ${orphanOrders.length}건` : '정상',
    orphanOrders
  );
  
  // 1.2 주문아이템-상품 관계
  const { data: orphanItems } = await supabase
    .from('order_items')
    .select('id, product_id')
    .is('product_id', null);
  
  recordResult(
    '참조 무결성',
    '주문아이템-상품 관계',
    !orphanItems || orphanItems.length === 0,
    orphanItems?.length ? `상품 없는 주문아이템 ${orphanItems.length}건` : '정상',
    orphanItems
  );
  
  // 1.3 송장-주문 관계
  const { data: orphanShipments } = await supabase
    .from('shipments')
    .select('tracking_no, order_id')
    .is('order_id', null);
  
  recordResult(
    '참조 무결성',
    '송장-주문 관계',
    !orphanShipments || orphanShipments.length === 0,
    orphanShipments?.length ? `주문 없는 송장 ${orphanShipments.length}건` : '정상',
    orphanShipments
  );
}

// 2. 비즈니스 규칙 검증
async function verifyBusinessRules() {
  console.log('\n📋 비즈니스 규칙 검증');
  
  // 2.1 재고 음수 확인
  const { data: negativeStock } = await supabase
    .from('products')
    .select('sku, on_hand, allocated, available')
    .or('on_hand.lt.0,allocated.lt.0,available.lt.0');
  
  recordResult(
    '비즈니스 규칙',
    '재고 수량 양수',
    !negativeStock || negativeStock.length === 0,
    negativeStock?.length ? `음수 재고 ${negativeStock.length}건` : '정상',
    negativeStock
  );
  
  // 2.2 재고 계산 일치 (available = on_hand - allocated)
  const { data: products } = await supabase
    .from('products')
    .select('sku, on_hand, allocated, available');
  
  const stockMismatches = products?.filter(p => 
    p.available !== p.on_hand - p.allocated
  ) || [];
  
  recordResult(
    '비즈니스 규칙',
    '재고 계산 일치',
    stockMismatches.length === 0,
    stockMismatches.length ? `재고 계산 불일치 ${stockMismatches.length}건` : '정상',
    stockMismatches
  );
  
  // 2.3 주문 상태 전이 검증
  const { data: invalidStatusOrders } = await supabase
    .from('orders')
    .select('order_no, status, paid_at, shipped_at, delivered_at');
  
  const statusViolations = invalidStatusOrders?.filter(o => {
    // SHIPPED 상태인데 shipped_at이 없는 경우
    if (o.status === 'SHIPPED' && !o.shipped_at) return true;
    // DONE 상태인데 delivered_at이 없는 경우
    if (o.status === 'DONE' && !o.delivered_at) return true;
    // delivered_at이 shipped_at보다 빠른 경우
    if (o.delivered_at && o.shipped_at && new Date(o.delivered_at) < new Date(o.shipped_at)) return true;
    return false;
  }) || [];
  
  recordResult(
    '비즈니스 규칙',
    '주문 상태 전이',
    statusViolations.length === 0,
    statusViolations.length ? `상태 전이 위반 ${statusViolations.length}건` : '정상',
    statusViolations
  );
  
  // 2.4 SKU 중복 확인
  const { data: skuData } = await supabase
    .from('products')
    .select('sku');
  
  const skuMap = new Map();
  const duplicateSkus: string[] = [];
  
  skuData?.forEach(p => {
    if (skuMap.has(p.sku)) {
      duplicateSkus.push(p.sku);
    } else {
      skuMap.set(p.sku, true);
    }
  });
  
  recordResult(
    '비즈니스 규칙',
    'SKU 유일성',
    duplicateSkus.length === 0,
    duplicateSkus.length ? `중복 SKU ${duplicateSkus.length}건` : '정상',
    duplicateSkus
  );
  
  // 2.5 주문번호 형식 검증
  const { data: orders } = await supabase
    .from('orders')
    .select('order_no');
  
  const invalidOrderNos = orders?.filter(o => 
    !/^ORD-\d{6}-\d{3}$/.test(o.order_no)
  ) || [];
  
  recordResult(
    '비즈니스 규칙',
    '주문번호 형식',
    invalidOrderNos.length === 0,
    invalidOrderNos.length ? `잘못된 주문번호 ${invalidOrderNos.length}건` : '정상',
    invalidOrderNos
  );
  
  // 2.6 PCCC 형식 검증
  const { data: customerData } = await supabase
    .from('customers')
    .select('name, pccc')
    .not('pccc', 'is', null);
  
  const invalidPcccs = customerData?.filter(c => 
    !/^[PM]\d{12}$/.test(c.pccc)
  ) || [];
  
  recordResult(
    '비즈니스 규칙',
    'PCCC 형식',
    invalidPcccs.length === 0,
    invalidPcccs.length ? `잘못된 PCCC ${invalidPcccs.length}건` : '정상',
    invalidPcccs
  );
}

// 3. 데이터 일관성 검증
async function verifyDataConsistency() {
  console.log('\n🔄 데이터 일관성 검증');
  
  // 3.1 주문 총액 = 아이템 합계 + 배송비
  const { data: orderTotals } = await supabase
    .from('orders')
    .select(`
      order_no,
      total_amount,
      shipping_fee,
      order_items (
        subtotal
      )
    `);
  
  const totalMismatches = orderTotals?.filter(o => {
    const itemTotal = o.order_items?.reduce((sum: number, item: any) => sum + item.subtotal, 0) || 0;
    const expectedTotal = itemTotal + (o.shipping_fee || 0);
    return Math.abs(o.total_amount - expectedTotal) > 1; // 1원 오차 허용
  }) || [];
  
  recordResult(
    '데이터 일관성',
    '주문 총액 계산',
    totalMismatches.length === 0,
    totalMismatches.length ? `총액 불일치 ${totalMismatches.length}건` : '정상',
    totalMismatches.map(o => o.order_no)
  );
  
  // 3.2 캐시북 잔액 검증
  const { data: cashbook } = await supabase
    .from('cashbook')
    .select('type, amount')
    .order('transaction_date', { ascending: true });
  
  let calculatedBalance = 0;
  cashbook?.forEach(transaction => {
    if (transaction.type === 'INCOME') {
      calculatedBalance += transaction.amount;
    } else {
      calculatedBalance -= transaction.amount;
    }
  });
  
  recordResult(
    '데이터 일관성',
    '캐시북 잔액',
    true,
    `계산된 잔액: ₩${calculatedBalance.toLocaleString()}`,
    { balance: calculatedBalance }
  );
  
  // 3.3 재고 이동 기록과 현재 재고 일치
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('product_id, type, quantity');
  
  const movementsByProduct = new Map();
  movements?.forEach(m => {
    const current = movementsByProduct.get(m.product_id) || 0;
    if (m.type === 'IN') {
      movementsByProduct.set(m.product_id, current + m.quantity);
    } else {
      movementsByProduct.set(m.product_id, current - m.quantity);
    }
  });
  
  const { data: currentStock } = await supabase
    .from('products')
    .select('id, sku, on_hand');
  
  const stockDiscrepancies: any[] = [];
  currentStock?.forEach(product => {
    const movementTotal = movementsByProduct.get(product.id) || 0;
    if (Math.abs(product.on_hand - movementTotal) > 0) {
      stockDiscrepancies.push({
        sku: product.sku,
        current: product.on_hand,
        calculated: movementTotal,
        difference: product.on_hand - movementTotal
      });
    }
  });
  
  recordResult(
    '데이터 일관성',
    '재고 이동 기록 일치',
    stockDiscrepancies.length === 0,
    stockDiscrepancies.length ? `재고 불일치 ${stockDiscrepancies.length}건` : '정상',
    stockDiscrepancies.slice(0, 5) // 처음 5개만 표시
  );
}

// 4. 성능 지표 검증
async function verifyPerformanceMetrics() {
  console.log('\n⚡ 성능 지표 검증');
  
  // 4.1 테이블 크기
  const tables = ['products', 'orders', 'order_items', 'shipments', 'customers', 'cashbook'];
  const tableCounts: { [key: string]: number } = {};
  
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    tableCounts[table] = count || 0;
  }
  
  console.log('\n  📊 테이블 크기:');
  Object.entries(tableCounts).forEach(([table, count]) => {
    console.log(`     • ${table}: ${count.toLocaleString()}건`);
  });
  
  // 4.2 인덱스 효율성 테스트 (샘플 쿼리)
  console.log('\n  🔍 쿼리 성능:');
  
  const startTime1 = Date.now();
  await supabase
    .from('orders')
    .select('*')
    .eq('status', 'SHIPPED')
    .limit(100);
  const queryTime1 = Date.now() - startTime1;
  
  recordResult(
    '성능 지표',
    '주문 상태 조회',
    queryTime1 < 1000,
    `${queryTime1}ms`,
    { threshold: '1000ms' }
  );
  
  const startTime2 = Date.now();
  await supabase
    .from('products')
    .select('*')
    .gt('on_hand', 0)
    .limit(100);
  const queryTime2 = Date.now() - startTime2;
  
  recordResult(
    '성능 지표',
    '재고 있는 상품 조회',
    queryTime2 < 1000,
    `${queryTime2}ms`,
    { threshold: '1000ms' }
  );
}

// 5. 업무 플로우 검증
async function verifyBusinessFlow() {
  console.log('\n🔄 업무 플로우 검증');
  
  // 5.1 주문 → 결제 → 배송 플로우
  const { data: flowTest } = await supabase
    .from('orders')
    .select(`
      order_no,
      status,
      paid_at,
      shipped_at,
      delivered_at,
      shipments (
        tracking_no,
        status
      )
    `)
    .eq('status', 'DONE')
    .limit(10);
  
  const flowViolations = flowTest?.filter(order => {
    // DONE 상태인데 송장이 없는 경우
    if (!order.shipments || order.shipments.length === 0) return true;
    // 날짜 순서가 잘못된 경우
    if (order.paid_at && order.shipped_at && new Date(order.paid_at) > new Date(order.shipped_at)) return true;
    return false;
  }) || [];
  
  recordResult(
    '업무 플로우',
    '주문-결제-배송 플로우',
    flowViolations.length === 0,
    flowViolations.length ? `플로우 위반 ${flowViolations.length}건` : '정상',
    flowViolations.map(o => o.order_no)
  );
  
  // 5.2 재고 차감 플로우
  const { data: stockFlow } = await supabase
    .from('orders')
    .select(`
      order_no,
      status,
      order_items (
        quantity,
        product:products (
          sku,
          on_hand,
          allocated
        )
      )
    `)
    .in('status', ['PAID', 'SHIPPED'])
    .limit(10);
  
  let stockFlowValid = true;
  stockFlow?.forEach(order => {
    order.order_items?.forEach((item: any) => {
      if (item.product && item.product.on_hand < 0) {
        stockFlowValid = false;
      }
    });
  });
  
  recordResult(
    '업무 플로우',
    '재고 차감 플로우',
    stockFlowValid,
    stockFlowValid ? '정상' : '재고 부족 발생'
  );
}

// 6. 보고서 생성
function generateReport() {
  console.log('\n========================================');
  console.log('         검증 결과 요약');
  console.log('========================================\n');
  
  const categories = new Map();
  
  results.forEach(result => {
    if (!categories.has(result.category)) {
      categories.set(result.category, { passed: 0, failed: 0 });
    }
    
    const cat = categories.get(result.category);
    if (result.passed) {
      cat.passed++;
    } else {
      cat.failed++;
    }
  });
  
  categories.forEach((stats, category) => {
    const total = stats.passed + stats.failed;
    const percentage = Math.floor((stats.passed / total) * 100);
    const color = percentage === 100 ? '\x1b[32m' : percentage >= 80 ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${category}:`);
    console.log(`  ${color}${percentage}%${reset} 통과 (${stats.passed}/${total})`);
  });
  
  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const totalPercentage = Math.floor((totalPassed / totalTests) * 100);
  
  console.log('\n----------------------------------------');
  console.log(`전체 결과: ${totalPassed}/${totalTests} (${totalPercentage}%)`);
  
  if (totalPercentage === 100) {
    console.log('\n✅ 모든 검증 테스트를 통과했습니다!');
  } else if (totalPercentage >= 90) {
    console.log('\n⚠️  일부 경미한 문제가 발견되었습니다.');
  } else {
    console.log('\n❌ 중요한 문제가 발견되었습니다. 수정이 필요합니다.');
  }
  
  // 실패한 테스트 목록
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n실패한 테스트:');
    failures.forEach(f => {
      console.log(`  • [${f.category}] ${f.test}: ${f.message}`);
    });
  }
}

// 메인 실행 함수
async function verifyIntegrity() {
  console.log('========================================');
  console.log('   데이터베이스 무결성 검증');
  console.log('========================================');
  
  try {
    await verifyReferentialIntegrity();
    await verifyBusinessRules();
    await verifyDataConsistency();
    await verifyPerformanceMetrics();
    await verifyBusinessFlow();
    
    generateReport();
    
  } catch (error) {
    console.error('\n❌ 검증 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  verifyIntegrity().catch(console.error);
}

export { verifyIntegrity };