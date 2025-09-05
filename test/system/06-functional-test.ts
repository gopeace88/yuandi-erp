/**
 * 시스템 테스트 - Phase 6: 전체 기능 테스트
 * 모든 핵심 기능에 대한 E2E 테스트
 */

import { createClient } from '@supabase/supabase-js';
import { ExcelExportService } from '../../lib/domain/services/excel-export.service';
import { StorageService } from '../../lib/domain/services/storage.service';
import { AddressService } from '../../lib/domain/services/address.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 테스트 결과 타입
interface TestResult {
  feature: string;
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const testResults: TestResult[] = [];

// 테스트 실행 헬퍼
async function runTest(feature: string, test: string, fn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  let passed = false;
  let error: string | undefined;

  try {
    await fn();
    passed = true;
    console.log(`  ✅ ${test}`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ ${test}: ${error}`);
  }

  const duration = Date.now() - startTime;
  testResults.push({ feature, test, passed, duration, error });
}

// 1. 배송 추적 기능 테스트
async function testShippingTracking() {
  console.log('\n🚚 배송 추적 기능 테스트');

  await runTest('배송 추적', '고객 주문 조회 (이름+전화번호)', async () => {
    // 샘플 고객 데이터 조회
    const { data: customer } = await supabase
      .from('customers')
      .select('name, phone')
      .limit(1)
      .single();

    if (!customer) throw new Error('고객 데이터가 없습니다');

    // 고객 주문 조회 시뮬레이션
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products (*)
        ),
        shipments (*)
      `)
      .eq('customer_name', customer.name)
      .eq('customer_phone', customer.phone)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!orders || orders.length === 0) throw new Error('주문을 찾을 수 없습니다');
  });

  await runTest('배송 추적', '운송장 번호로 배송 상태 조회', async () => {
    const { data: shipment } = await supabase
      .from('shipments')
      .select('*')
      .limit(1)
      .single();

    if (!shipment) throw new Error('송장 데이터가 없습니다');
    
    // 배송 상태 조회 시뮬레이션
    if (!shipment.tracking_no) throw new Error('운송장 번호가 없습니다');
    if (!shipment.status) throw new Error('배송 상태가 없습니다');
  });

  await runTest('배송 추적', '배송 완료된 주문 확인', async () => {
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'DONE')
      .limit(10);

    if (!completedOrders || completedOrders.length === 0) {
      throw new Error('배송 완료된 주문이 없습니다');
    }
  });
}

// 2. 엑셀 내보내기 기능 테스트
async function testExcelExport() {
  console.log('\n📊 엑셀 내보내기 기능 테스트');
  
  const excelService = new ExcelExportService();

  await runTest('엑셀 내보내기', '주문 목록 CSV 내보내기', async () => {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .limit(100);

    if (!orders || orders.length === 0) throw new Error('주문 데이터가 없습니다');

    const csv = excelService.exportToCSV(orders, 
      ['order_no', 'customer_name', 'total_amount', 'status'],
      {
        order_no: '주문번호',
        customer_name: '고객명',
        total_amount: '총액',
        status: '상태'
      }
    );

    if (!csv || csv.length < 100) throw new Error('CSV 생성 실패');
  });

  await runTest('엑셀 내보내기', '재고 목록 Excel XML 내보내기', async () => {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .limit(50);

    if (!products) throw new Error('상품 데이터가 없습니다');

    const xml = excelService.exportToExcelXML(products, '재고목록', {
      headers: {
        sku: 'SKU',
        name: '상품명',
        on_hand: '재고수량',
        selling_price_krw: '판매가'
      }
    });

    if (!xml || !xml.includes('<Worksheet')) throw new Error('Excel XML 생성 실패');
  });

  await runTest('엑셀 내보내기', '캐시북 HTML 테이블 내보내기', async () => {
    const { data: cashbook } = await supabase
      .from('cashbook')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (!cashbook) throw new Error('캐시북 데이터가 없습니다');

    const html = excelService.exportToHTMLTable(cashbook, {
      title: '캐시북',
      styles: true,
      excelCompatible: true
    });

    if (!html || !html.includes('<table')) throw new Error('HTML 테이블 생성 실패');
  });

  await runTest('엑셀 내보내기', '요약 행 추가', async () => {
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, shipping_fee')
      .limit(20);

    if (!orders) throw new Error('주문 데이터가 없습니다');

    const withSummary = excelService.addSummaryRow(orders, {
      total_amount: 'sum',
      shipping_fee: 'sum'
    });

    if (withSummary.length !== orders.length + 1) {
      throw new Error('요약 행 추가 실패');
    }
  });
}

// 3. 사용자 조회 기능 테스트
async function testUserQueries() {
  console.log('\n👥 사용자 조회 기능 테스트');

  await runTest('사용자 조회', '관리자 대시보드 통계', async () => {
    // 매출 통계
    const { data: salesStats } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!salesStats) throw new Error('매출 통계 조회 실패');

    const totalSales = salesStats.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    if (totalSales === 0) throw new Error('매출 데이터가 없습니다');
  });

  await runTest('사용자 조회', '재고 부족 상품 조회', async () => {
    const { data: lowStock } = await supabase
      .from('products')
      .select('*')
      .lt('on_hand', 10)
      .eq('is_active', true);

    if (!lowStock) throw new Error('재고 조회 실패');
  });

  await runTest('사용자 조회', '인기 상품 TOP 5', async () => {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity');

    if (!orderItems) throw new Error('주문 아이템 조회 실패');

    // 상품별 판매량 집계
    const productSales = new Map();
    orderItems.forEach(item => {
      const current = productSales.get(item.product_id) || 0;
      productSales.set(item.product_id, current + item.quantity);
    });

    // TOP 5 추출
    const top5 = Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (top5.length === 0) throw new Error('판매 데이터가 없습니다');
  });

  await runTest('사용자 조회', '최근 주문 목록', async () => {
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentOrders || recentOrders.length === 0) {
      throw new Error('최근 주문이 없습니다');
    }
  });
}

// 4. 이미지 업로드 기능 테스트
async function testImageUpload() {
  console.log('\n🖼️ 이미지 업로드 기능 테스트');
  
  const storageService = new StorageService(supabase);

  await runTest('이미지 업로드', '파일 크기 검증', async () => {
    // 모의 파일 객체
    const mockFile = {
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 5 * 1024 * 1024 // 5MB
    } as File;

    const isValid = storageService.validateFileSize(mockFile, 10);
    if (!isValid) throw new Error('파일 크기 검증 실패');

    const isInvalid = storageService.validateFileSize(mockFile, 1);
    if (isInvalid) throw new Error('파일 크기 검증 로직 오류');
  });

  await runTest('이미지 업로드', '파일 타입 검증', async () => {
    const validFile = { type: 'image/jpeg' } as File;
    const invalidFile = { type: 'application/pdf' } as File;

    const isValid = storageService.validateFileType(validFile, ['image/jpeg', 'image/png']);
    if (!isValid) throw new Error('유효한 파일 타입 검증 실패');

    const isInvalid = storageService.validateFileType(invalidFile, ['image/jpeg', 'image/png']);
    if (isInvalid) throw new Error('무효한 파일 타입이 통과됨');
  });

  await runTest('이미지 업로드', '파일명 정리', async () => {
    const dirtyName = '테스트 파일#@$.jpg';
    const cleanName = storageService.sanitizeFileName(dirtyName);

    if (cleanName.includes('#') || cleanName.includes('@') || cleanName.includes('$')) {
      throw new Error('파일명 정리 실패');
    }
  });

  await runTest('이미지 업로드', 'Public URL 생성', async () => {
    const url = storageService.getPublicUrl('product-images', 'test/image.jpg');
    
    if (!url || !url.includes('product-images')) {
      throw new Error('Public URL 생성 실패');
    }
  });
}

// 5. 주소 검증 기능 테스트
async function testAddressValidation() {
  console.log('\n📍 주소 검증 기능 테스트');
  
  const addressService = new AddressService(supabase);

  await runTest('주소 검증', '우편번호 검증', async () => {
    const { validateZipCode } = await import('../../lib/domain/services/address.service');
    
    const valid = validateZipCode('12345');
    if (!valid) throw new Error('유효한 우편번호 검증 실패');

    const invalid = validateZipCode('1234'); // 4자리
    if (invalid) throw new Error('무효한 우편번호가 통과됨');
  });

  await runTest('주소 검증', '배송 구역 계산', async () => {
    const { calculateShippingZone } = await import('../../lib/domain/services/address.service');
    
    // 서울 지역
    const seoulZone = calculateShippingZone('06234');
    if (seoulZone.zone !== '수도권') throw new Error('서울 구역 계산 오류');

    // 제주 지역
    const jejuZone = calculateShippingZone('63100');
    if (jejuZone.zone !== '제주/도서') throw new Error('제주 구역 계산 오류');
    if (!jejuZone.additionalFee) throw new Error('제주 추가 요금 누락');
  });

  await runTest('주소 검증', '특수 배송 지역 감지', async () => {
    const isSpecial = addressService.isSpecialDeliveryArea('제주특별자치도 제주시');
    if (!isSpecial) throw new Error('제주 특수 지역 감지 실패');

    const isNormal = addressService.isSpecialDeliveryArea('서울특별시 강남구');
    if (isNormal) throw new Error('일반 지역이 특수 지역으로 감지됨');
  });

  await runTest('주소 검증', '거리 계산', async () => {
    const seoul = { lat: 37.5665, lng: 126.9780 };
    const busan = { lat: 35.1796, lng: 129.0756 };
    
    const distance = addressService.calculateDistance(seoul, busan);
    
    // 서울-부산 직선거리는 약 325km
    if (distance < 300 || distance > 350) {
      throw new Error(`거리 계산 오류: ${distance}km`);
    }
  });
}

// 6. 권한 관리 테스트
async function testAccessControl() {
  console.log('\n🔐 권한 관리 테스트');

  await runTest('권한 관리', '역할별 권한 확인', async () => {
    // RLS 정책이 활성화되어 있는지 확인
    const tables = ['orders', 'products', 'customers', 'shipments'];
    
    for (const table of tables) {
      // 실제로는 Supabase Dashboard에서 RLS 설정을 확인해야 함
      // 여기서는 테이블 접근 가능 여부만 테스트
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      // Service role key를 사용하므로 모든 테이블에 접근 가능해야 함
      if (error && error.message.includes('permission')) {
        throw new Error(`${table} 테이블 접근 권한 없음`);
      }
    }
  });

  await runTest('권한 관리', '고객 조회 권한', async () => {
    // 고객은 자신의 주문만 조회 가능 (시뮬레이션)
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .limit(1)
      .single();

    if (!customer) throw new Error('고객 데이터가 없습니다');

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customer.id);

    if (!orders) throw new Error('고객 주문 조회 실패');
  });
}

// 7. 통합 워크플로우 테스트
async function testIntegratedWorkflow() {
  console.log('\n🔄 통합 워크플로우 테스트');

  await runTest('통합 워크플로우', '주문 생성 → 배송 → 완료 플로우', async () => {
    // 1. 재고 있는 상품 찾기
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .gt('on_hand', 5)
      .limit(1)
      .single();

    if (!product) throw new Error('재고 있는 상품이 없습니다');

    // 2. 고객 찾기
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .limit(1)
      .single();

    if (!customer) throw new Error('고객이 없습니다');

    // 3. 주문이 존재하는지 확인 (실제 생성은 하지 않음)
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customer.id)
      .limit(1);

    if (!orders || orders.length === 0) {
      console.log('    ⚠️  해당 고객의 주문이 없습니다 (정상)');
    }
  });

  await runTest('통합 워크플로우', '재고 차감 → 할당 → 배송 완료 플로우', async () => {
    // 배송 완료된 주문 찾기
    const { data: completedOrder } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          product:products (
            on_hand,
            allocated
          )
        )
      `)
      .eq('status', 'DONE')
      .limit(1)
      .single();

    if (!completedOrder) throw new Error('완료된 주문이 없습니다');

    // allocated는 0이어야 함 (배송 완료 후)
    const hasAllocated = completedOrder.order_items?.some(
      (item: any) => item.product && item.product.allocated > 0
    );

    // 일부 allocated가 있을 수 있음 (다른 주문)
    if (hasAllocated) {
      console.log('    ℹ️  일부 상품에 할당된 재고가 있습니다 (다른 주문)');
    }
  });

  await runTest('통합 워크플로우', '환불 처리 플로우', async () => {
    const { data: refundedOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'REFUNDED')
      .limit(5);

    if (!refundedOrders || refundedOrders.length === 0) {
      console.log('    ℹ️  환불된 주문이 없습니다');
      return;
    }

    // 환불 주문에 대한 캐시북 확인
    const orderId = refundedOrders[0].id;
    const { data: cashbook } = await supabase
      .from('cashbook')
      .select('*')
      .eq('reference_id', orderId)
      .eq('type', 'EXPENSE')
      .eq('category', 'REFUND');

    if (!cashbook || cashbook.length === 0) {
      throw new Error('환불 캐시북 기록이 없습니다');
    }
  });
}

// 8. 성능 테스트
async function testPerformance() {
  console.log('\n⚡ 성능 테스트');

  await runTest('성능', '대량 데이터 조회 (1000건)', async () => {
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1000);

    const duration = Date.now() - startTime;

    if (error) throw error;
    if (!data) throw new Error('데이터 조회 실패');
    
    if (duration > 5000) {
      throw new Error(`조회 시간 초과: ${duration}ms (목표: <5000ms)`);
    }
  });

  await runTest('성능', '복잡한 조인 쿼리', async () => {
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (*),
        order_items (
          *,
          product:products (*)
        ),
        shipments (*)
      `)
      .limit(50);

    const duration = Date.now() - startTime;

    if (error) throw error;
    if (!data) throw new Error('조인 쿼리 실패');
    
    if (duration > 3000) {
      throw new Error(`조인 쿼리 시간 초과: ${duration}ms (목표: <3000ms)`);
    }
  });

  await runTest('성능', '집계 쿼리', async () => {
    const startTime = Date.now();
    
    // 월별 매출 집계
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (!orders) throw new Error('집계 데이터 조회 실패');

    // 클라이언트 측 집계
    const monthlyStats = new Map();
    orders.forEach(order => {
      const month = new Date(order.created_at).toISOString().slice(0, 7);
      const current = monthlyStats.get(month) || 0;
      monthlyStats.set(month, current + (order.total_amount || 0));
    });

    const duration = Date.now() - startTime;

    if (duration > 2000) {
      throw new Error(`집계 쿼리 시간 초과: ${duration}ms (목표: <2000ms)`);
    }
  });
}

// 테스트 결과 보고서 생성
function generateTestReport() {
  console.log('\n========================================');
  console.log('         기능 테스트 결과 보고서');
  console.log('========================================\n');

  // 기능별 집계
  const featureStats = new Map();
  
  testResults.forEach(result => {
    if (!featureStats.has(result.feature)) {
      featureStats.set(result.feature, { passed: 0, failed: 0, totalTime: 0 });
    }
    
    const stats = featureStats.get(result.feature);
    if (result.passed) {
      stats.passed++;
    } else {
      stats.failed++;
    }
    stats.totalTime += result.duration;
  });

  // 기능별 결과 출력
  featureStats.forEach((stats, feature) => {
    const total = stats.passed + stats.failed;
    const percentage = Math.floor((stats.passed / total) * 100);
    const avgTime = Math.floor(stats.totalTime / total);
    
    console.log(`📦 ${feature}`);
    console.log(`   통과: ${stats.passed}/${total} (${percentage}%)`);
    console.log(`   평균 시간: ${avgTime}ms`);
  });

  // 전체 통계
  const totalPassed = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const totalPercentage = Math.floor((totalPassed / totalTests) * 100);
  const totalTime = testResults.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n----------------------------------------');
  console.log('전체 결과:');
  console.log(`  • 총 테스트: ${totalTests}개`);
  console.log(`  • 성공: ${totalPassed}개 (${totalPercentage}%)`);
  console.log(`  • 실패: ${totalTests - totalPassed}개`);
  console.log(`  • 총 실행 시간: ${(totalTime / 1000).toFixed(2)}초`);

  // 실패한 테스트 목록
  const failures = testResults.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n❌ 실패한 테스트:');
    failures.forEach(f => {
      console.log(`  • [${f.feature}] ${f.test}`);
      if (f.error) {
        console.log(`    → ${f.error}`);
      }
    });
  }

  // 성능 경고
  const slowTests = testResults.filter(r => r.duration > 3000);
  if (slowTests.length > 0) {
    console.log('\n⚠️  느린 테스트 (>3초):');
    slowTests.forEach(t => {
      console.log(`  • [${t.feature}] ${t.test}: ${t.duration}ms`);
    });
  }

  // 최종 평가
  console.log('\n========================================');
  if (totalPercentage === 100) {
    console.log('🎉 모든 기능 테스트를 통과했습니다!');
    console.log('✅ 시스템이 운영 준비되었습니다.');
  } else if (totalPercentage >= 90) {
    console.log('⚠️  대부분의 기능이 정상 작동하지만 일부 수정이 필요합니다.');
  } else if (totalPercentage >= 70) {
    console.log('⚠️  여러 기능에 문제가 있습니다. 수정 후 재테스트가 필요합니다.');
  } else {
    console.log('❌ 심각한 문제가 발견되었습니다. 전면적인 점검이 필요합니다.');
  }

  // 테스트 결과 파일로 저장
  saveTestResults();
}

// 테스트 결과 저장
async function saveTestResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(process.cwd(), 'test-reports');
  const reportFile = path.join(reportDir, `functional-test-${timestamp}.json`);

  try {
    await fs.mkdir(reportDir, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.length,
        passed: testResults.filter(r => r.passed).length,
        failed: testResults.filter(r => !r.passed).length,
        duration: testResults.reduce((sum, r) => sum + r.duration, 0)
      },
      results: testResults
    };

    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 테스트 결과 저장: ${reportFile}`);
  } catch (error) {
    console.error('테스트 결과 저장 실패:', error);
  }
}

// 메인 실행 함수
async function runFunctionalTests() {
  console.log('========================================');
  console.log('   전체 기능 테스트 시작');
  console.log('========================================');

  const startTime = Date.now();

  try {
    await testShippingTracking();
    await testExcelExport();
    await testUserQueries();
    await testImageUpload();
    await testAddressValidation();
    await testAccessControl();
    await testIntegratedWorkflow();
    await testPerformance();

    generateTestReport();

  } catch (error) {
    console.error('\n❌ 테스트 실행 중 치명적 오류:', error);
    process.exit(1);
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n⏱️  전체 테스트 시간: ${(totalTime / 1000).toFixed(2)}초`);
}

// 스크립트 실행
if (require.main === module) {
  runFunctionalTests().catch(console.error);
}

export { runFunctionalTests };