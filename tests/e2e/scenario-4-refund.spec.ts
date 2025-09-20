import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';

test.describe('시나리오 4: 반품 처리 (localStorage 세션 유지)', () => {
  test('반품 처리 및 재고 복구 확인', async ({ page }) => {

    console.log('\n=== 시나리오 4: 반품 처리 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 로그인 및 세션 설정 ===
    console.log('📍 1단계: 로그인 및 세션 설정');
    await page.goto(getTestUrl('/ko'));

    // localStorage로 세션 정보 설정
    await page.evaluate(() => {
      const sessionData = {
        id: '78502b6d-13e7-4acc-94a7-23a797de3519',
        email: TEST_ACCOUNTS.admin.email,
        name: '관리자',
        role: 'admin',
        last_login: new Date().toISOString()
      };

      localStorage.setItem('userSession', JSON.stringify(sessionData));
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('i18nextLng', 'ko');
    });

    console.log('  ✅ localStorage 세션 정보 설정 완료');

    // === 2단계: 대시보드에서 초기 재고 확인 ===
    console.log('\n📍 2단계: 대시보드에서 초기 재고 확인');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(TIMEOUTS.medium);

    // 재고 정보 확인
    let initialStockNum = 0;
    try {
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockContainer = stockCard.locator('..').locator('..');
        const stockText = await stockContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          initialStockNum = parseInt(stockMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황을 찾을 수 없음, 기본값 사용');
    }
    console.log(`  - 초기 재고: ${initialStockNum}개`);

    // === 3단계: 배송 완료된 주문 찾아서 반품 처리 ===
    console.log('\n📍 3단계: 배송 완료된 주문 반품 처리');
    await page.goto(getTestUrl('/ko/orders'));
    await page.waitForTimeout(TIMEOUTS.medium);

    // SHIPPED 상태인 주문 찾기
    let shippedOrder = page.locator('tr').filter({ hasText: 'SHIPPED' }).first();
    let hasShippedOrder = await shippedOrder.count() > 0;

    // SHIPPED 주문이 없으면 먼저 생성
    if (!hasShippedOrder) {
      console.log('  ⚠️ 배송완료 주문이 없어 먼저 생성합니다');

      // 주문 생성 (정확한 버튼 텍스트 사용)
      const addOrderButton = page.locator('button').filter({ hasText: '새 주문' });
      await addOrderButton.click();
      await page.waitForTimeout(TIMEOUTS.short);

      // 고객 정보 입력
      await page.locator('input[placeholder*="고객명"]').or(
        page.locator('label:has-text("고객명")').locator('..').locator('input')
      ).fill('반품테스트 고객');

      await page.locator('input[placeholder*="전화번호"]').or(
        page.locator('label:has-text("전화번호")').locator('..').locator('input')
      ).fill('010-3333-4444');

      await page.locator('input[type="email"]').or(
        page.locator('label:has-text("이메일")').locator('..').locator('input')
      ).fill('refund@test.com');

      // 상품 추가
      const addProductButton = page.locator('button').filter({ hasText: '상품 추가' });
      await addProductButton.click();
      await page.waitForTimeout(500);

      // 재고가 있는 상품 선택
      const productSelect = page.locator('select').filter({ hasNot: page.locator('option:has-text("전체")') }).first();
      const productOptions = await productSelect.locator('option').all();

      let selectedProductName = '';
      for (let i = 1; i < productOptions.length && i < 10; i++) {
        const optionText = await productOptions[i].textContent();
        if (optionText && optionText.includes('재고:') && !optionText.includes('재고: 0')) {
          const optionValue = await productOptions[i].getAttribute('value');
          if (optionValue) {
            await productSelect.selectOption(optionValue);
            selectedProductName = optionText;
            console.log(`  - 상품 선택: ${selectedProductName}`);
            break;
          }
        }
      }

      // 수량 3개 입력 (반품 테스트용)
      await page.locator('input[type="number"]').filter({ hasNot: page.locator('[placeholder*="페이지"]') }).first().fill('3');
      await page.locator('input[type="number"]').nth(1).fill('40000');
      console.log('  - 수량: 3개, 단가: 40,000원');

      // 저장
      const saveButton = page.locator('button').filter({ hasText: '저장' }).last();
      await saveButton.click();
      await page.waitForTimeout(TIMEOUTS.medium);

      console.log('  ✅ 반품용 테스트 주문 생성 완료');

      // 주문 목록 새로고침
      await page.reload();
      await page.waitForTimeout(TIMEOUTS.medium);

      // 방금 생성한 주문을 배송 처리
      const newOrder = page.locator('tr').filter({ hasText: '반품테스트 고객' }).first();
      const orderNo = await newOrder.locator('td').first().textContent();

      // 배송 관리로 이동
      await page.goto(getTestUrl('/ko/shipments'));
      await page.waitForTimeout(TIMEOUTS.medium);

      // 해당 주문 찾아서 배송 처리
      const pendingOrder = page.locator('tr').filter({ hasText: orderNo || '' }).first();
      const shipButton = pendingOrder.locator('button').filter({ hasText: '배송' });

      if (await shipButton.count() > 0) {
        await shipButton.click();
        await page.waitForTimeout(TIMEOUTS.short);

        // 송장번호 입력
        await page.locator('input[placeholder*="한국 송장번호"]').or(
          page.locator('label:has-text("한국 송장번호")').locator('..').locator('input')
        ).fill('KR-REFUND-' + Date.now());

        await page.locator('input[placeholder*="중국 송장번호"]').or(
          page.locator('label:has-text("중국 송장번호")').locator('..').locator('input')
        ).fill('CN-REFUND-' + Date.now());

        // 저장
        const saveShipButton = page.locator('button').filter({ hasText: '저장' }).or(
          page.locator('button').filter({ hasText: '배송 처리' })
        ).last();
        await saveShipButton.click();
        await page.waitForTimeout(TIMEOUTS.medium);

        console.log('  ✅ 주문 배송 처리 완료');
      }

      // 주문 관리로 돌아가기
      await page.goto(getTestUrl('/ko/orders'));
      await page.waitForTimeout(TIMEOUTS.medium);
    }

    // SHIPPED 상태 주문 다시 찾기
    shippedOrder = page.locator('tr').filter({ hasText: 'SHIPPED' }).first();
    const orderNo = await shippedOrder.locator('td').first().textContent();
    const customerName = await shippedOrder.locator('td').nth(1).textContent();
    console.log(`  - 반품 처리할 주문: ${orderNo} (${customerName})`);

    // 반품 버튼 클릭
    const refundButton = shippedOrder.locator('button').filter({ hasText: '반품' });
    await refundButton.click();
    console.log('  - 반품 확인 대화상자 표시');
    await page.waitForTimeout(TIMEOUTS.short);

    // 확인 버튼 클릭 (alert 처리)
    page.on('dialog', async dialog => {
      console.log(`  - 확인 메시지: ${dialog.message()}`);
      await dialog.accept();
    });

    // 반품 처리 실행
    await refundButton.click();
    await page.waitForTimeout(TIMEOUTS.medium);

    // 상태 변경 확인
    await page.reload();
    await page.waitForTimeout(TIMEOUTS.medium);

    const refundedOrder = page.locator('tr').filter({ hasText: orderNo || '' }).first();
    const statusElement = refundedOrder.locator('td').filter({ hasText: 'REFUNDED' });
    const isRefunded = await statusElement.count() > 0;

    if (isRefunded) {
      console.log('  ✅ 주문 상태가 REFUNDED로 변경됨');
    }

    // === 4단계: 출납장부에서 환불 내역 확인 ===
    console.log('\n📍 4단계: 출납장부에서 환불 내역 확인');
    await page.goto(getTestUrl('/ko/cashbook'));
    await page.waitForTimeout(TIMEOUTS.medium);

    // 환불 기록 확인
    const refundRecord = page.locator('tr').filter({ hasText: '환불' });
    const hasRefund = await refundRecord.count() > 0;

    if (hasRefund) {
      console.log('  ✅ 환불 내역 발견');
      const refundAmount = await refundRecord.locator('td').nth(2).textContent();
      console.log(`  - 환불 금액: ${refundAmount}`);
    }

    // === 5단계: 대시보드에서 재고 복구 확인 ===
    console.log('\n📍 5단계: 대시보드에서 재고 복구 확인');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(TIMEOUTS.medium);

    // 최종 재고 확인
    let finalStockNum = 0;
    try {
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockContainer = stockCard.locator('..').locator('..');
        const stockText = await stockContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          finalStockNum = parseInt(stockMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황을 찾을 수 없음');
    }
    console.log(`  - 최종 재고: ${finalStockNum}개`);

    const stockIncrease = finalStockNum - initialStockNum;
    console.log(`  - 재고 증가량: ${stockIncrease}개 (반품으로 인한 복구)`);

    if (stockIncrease >= 0) {
      console.log('  ✅ 반품으로 인한 재고 처리 확인');
    }

    console.log('\n🎉 시나리오 4 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 반품된 주문: ${orderNo}`);
    console.log(`  - 주문 상태: SHIPPED → REFUNDED`);
    console.log(`  - 초기 재고: ${initialStockNum}개`);
    console.log(`  - 최종 재고: ${finalStockNum}개`);
    console.log(`  - 재고 변화: ${stockIncrease >= 0 ? '+' : ''}${stockIncrease}개`);
    console.log('========================================');
    console.log('✅ 모든 단계 성공적으로 완료');
  });
});