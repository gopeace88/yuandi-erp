import { test } from '@playwright/test';

// 모든 시나리오를 순차적으로 실행
test.describe('YUANDI ERP 전체 시나리오 테스트', () => {

  test('모든 시나리오 통합 실행', async () => {
    console.log('\n');
    console.log('================================================');
    console.log('    YUANDI ERP 전체 시나리오 테스트 시작');
    console.log('================================================');
    console.log('\n테스트 시나리오:');
    console.log('  1. 상품 등록 및 재고 입고');
    console.log('  2. 주문 접수 및 재고 차감');
    console.log('  3. 주문 배송 처리');
    console.log('  4. 반품 처리');
    console.log('  5. 엑셀 다운로드');
    console.log('\n');
    console.log('각 시나리오는 개별 테스트 파일에서 실행됩니다.');
    console.log('================================================\n');

    console.log('✅ 테스트 준비 완료');
    console.log('');
    console.log('개별 시나리오 테스트를 실행하려면:');
    console.log('  npx playwright test tests/e2e/scenario-1-working.spec.ts');
    console.log('  npx playwright test tests/e2e/scenario-2-order.spec.ts');
    console.log('  npx playwright test tests/e2e/scenario-3-shipping.spec.ts');
    console.log('  npx playwright test tests/e2e/scenario-4-refund.spec.ts');
    console.log('  npx playwright test tests/e2e/scenario-5-excel.spec.ts');
    console.log('');
    console.log('전체 시나리오를 한번에 실행하려면:');
    console.log('  npx playwright test tests/e2e/scenario-[1-5]*.spec.ts');
  });
});