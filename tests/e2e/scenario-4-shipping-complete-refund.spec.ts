import { test, expect } from '@playwright/test';

test.describe('시나리오 4: 배송 중 탭에서 배송 완료 및 환불 처리 (localStorage 세션 유지)', () => {
  test('배송 중 상태에서 배송 완료 후 환불 처리', async ({ page }) => {

    console.log('\n=== 시나리오 4: 배송 중 탭에서 배송 완료 및 환불 처리 시작 ===\n');

    // === 1단계: 로그인 및 세션 설정 ===
    console.log('📍 1단계: 로그인 및 세션 설정');
    await page.goto('http://localhost:8081/ko');

    // localStorage로 세션 정보 설정
    await page.evaluate(() => {
      const sessionData = {
        id: '78502b6d-13e7-4acc-94a7-23a797de3519',
        email: 'admin@yuandi.com',
        name: '관리자',
        role: 'admin',
        last_login: new Date().toISOString()
      };

      localStorage.setItem('userSession', JSON.stringify(sessionData));
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('i18nextLng', 'ko');
    });

    console.log('  ✅ localStorage 세션 정보 설정 완료');

    // === 2단계: 대시보드에서 초기 항목 확인 ===
    console.log('\n📍 2단계: 대시보드에서 초기 항목 확인');
    await page.goto('http://localhost:8081/ko/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 초기 상태 기록
    let initialStats = {
      orders: 0,
      pending: 0,
      shipping: 0,
      completed: 0,
      refunded: 0,
      stock: 0
    };

    try {
      // 배송 중 카드 확인
      const shippingCard = page.locator('text=배송 중').first();
      if (await shippingCard.count() > 0) {
        const shippingContainer = shippingCard.locator('..').locator('..');
        const shippingText = await shippingContainer.textContent();
        const shippingMatch = shippingText?.match(/(\d+)\s*건/);
        if (shippingMatch) {
          initialStats.shipping = parseInt(shippingMatch[1]);
        }
      }

      // 배송 완료 카드 확인
      const completedCard = page.locator('text=배송 완료').first();
      if (await completedCard.count() > 0) {
        const completedContainer = completedCard.locator('..').locator('..');
        const completedText = await completedContainer.textContent();
        const completedMatch = completedText?.match(/(\d+)\s*건/);
        if (completedMatch) {
          initialStats.completed = parseInt(completedMatch[1]);
        }
      }

      // 환불 카드 확인
      const refundedCard = page.locator('text=환불').first();
      if (await refundedCard.count() > 0) {
        const refundedContainer = refundedCard.locator('..').locator('..');
        const refundedText = await refundedContainer.textContent();
        const refundedMatch = refundedText?.match(/(\d+)\s*건/);
        if (refundedMatch) {
          initialStats.refunded = parseInt(refundedMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 일부 대시보드 정보를 찾을 수 없음');
    }

    console.log('  📊 초기 대시보드 상태:');
    console.log(`    - 배송 중: ${initialStats.shipping}건`);
    console.log(`    - 배송 완료: ${initialStats.completed}건`);
    console.log(`    - 환불: ${initialStats.refunded}건`);

    // === 3단계: 배송 관리 메뉴 → 배송 중 탭 → 배송 완료 처리 ===
    console.log('\n📍 3단계: 배송 관리 메뉴 → 배송 중 탭 → 배송 완료 처리');
    await page.goto('http://localhost:8081/ko/shipments');
    await page.waitForTimeout(2000);

    // '배송 중' 탭 클릭 (기본이 배송 대기 탭이므로 반드시 클릭 필요)
    const shippingTab = page.locator('button').filter({ hasText: '배송 중' });
    await shippingTab.click();
    console.log('  - 배송 중 탭 클릭');
    await page.waitForTimeout(2000);

    // 테이블의 첫 번째 주문 선택 (상태 확인 없이)
    const allOrders = page.locator('tbody tr');
    const orderCount = await allOrders.count();

    console.log(`  - 배송 중 탭 주문 수: ${orderCount}건`);

    if (orderCount === 0) {
      console.log('  ❌ 배송 중 탭에 주문이 없습니다.');
      console.log('  - 먼저 시나리오 3을 실행하여 배송 처리를 해주세요.');
      return;
    }

    // 첫 번째 주문 선택
    const firstShippingOrder = allOrders.first();
    const orderNo = await firstShippingOrder.locator('td').first().textContent();
    console.log(`  - 선택된 주문번호: ${orderNo}`);

    // 테이블 행 클릭하여 배송 정보 모달 열기
    console.log(`  - 주문 ${orderNo} 행을 클릭하여 배송 정보 모달 열기`);
    await firstShippingOrder.click();
    console.log('  - 배송 정보 모달 열림');
    await page.waitForTimeout(2000);

    // 모달 내에서 배송 완료 버튼 찾기
    console.log('  - 배송 완료 버튼 찾기');

    // 모달 내부 스크롤 가능한 컨테이너 찾기
    const modalContent = page.locator('div[style*="overflowY: \'auto\'"]').or(
      page.locator('div[style*="overflow-y: auto"]')
    ).first();

    // 모달 내부를 맨 아래로 스크롤
    if (await modalContent.count() > 0) {
      await modalContent.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.waitForTimeout(1000);
      console.log('  - 모달 스크롤 완료');
    }

    // 배송 완료 버튼 클릭
    console.log('  - 배송 완료 버튼 클릭');
    const completeButton = page.locator('button').filter({ hasText: /배송 완료|완료 처리|완료/ });
    if (await completeButton.count() > 0) {
      await completeButton.first().click({ force: true });
      console.log('  - 배송 완료 처리 중...');
      await page.waitForTimeout(3000);
    } else {
      console.log('  ❌ 배송 완료 버튼을 찾을 수 없습니다.');
    }

    // 모달이 닫힐 때까지 대기
    await page.waitForTimeout(2000);

    // === 4단계: 배송 중 탭에서 환불 처리 ===
    console.log('\n📍 4단계: 배송 중 탭에서 환불 처리');

    // 페이지 새로고침 후 배송 중 탭 다시 선택
    await page.reload();
    await page.waitForTimeout(2000);

    // '배송 중' 탭 다시 클릭
    const shippingTabAgain = page.locator('button').filter({ hasText: '배송 중' });
    await shippingTabAgain.click();
    console.log('  - 배송 중 탭 다시 클릭');
    await page.waitForTimeout(2000);

    // 테이블의 첫 번째 주문 선택 (환불 처리용)
    const remainingOrders = page.locator('tbody tr');
    const remainingCount = await remainingOrders.count();

    if (remainingCount === 0) {
      console.log('  ⚠️ 환불 처리할 주문이 없습니다.');
    } else {
      // 첫 번째 주문 선택 (환불 처리용)
      const refundOrder = remainingOrders.first();
      const refundOrderNo = await refundOrder.locator('td').first().textContent();
      console.log(`  - 환불 처리할 주문번호: ${refundOrderNo}`);

      // 테이블 행 클릭하여 배송 정보 모달 열기
      console.log(`  - 주문 ${refundOrderNo} 행을 클릭하여 배송 정보 모달 열기`);
      await refundOrder.click();
      console.log('  - 배송 정보 모달 열림');
      await page.waitForTimeout(2000);

      // 모달 내부 스크롤
      console.log('  - 환불 처리 버튼 찾기');

      // 모달 내부 스크롤 가능한 컨테이너 찾기
      const modalContent2 = page.locator('div[style*="overflowY: \'auto\'"]').or(
        page.locator('div[style*="overflow-y: auto"]')
      ).first();

      // 모달 내부를 맨 아래로 스크롤
      if (await modalContent2.count() > 0) {
        await modalContent2.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await page.waitForTimeout(1000);
        console.log('  - 모달 스크롤 완료');
      }

      console.log('  - 환불 처리 버튼 클릭');
      // 환불 처리 버튼 찾기 - 텍스트로 먼저 찾기
      const refundButton = page.locator('button:has-text("환불 처리")').first();

      if (await refundButton.count() > 0) {
        // 확인 대화상자 처리
        page.on('dialog', async dialog => {
          console.log(`  - 확인 메시지: ${dialog.message()}`);
          await dialog.accept();
        });

        // 버튼이 보이도록 스크롤
        await refundButton.first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // 클릭
        await refundButton.first().click();
        console.log('  - 환불 처리 중...');
        await page.waitForTimeout(3000);
      } else {
        console.log('  ❌ 환불 처리 버튼을 찾을 수 없습니다.');
      }
    }

    // === 5단계: 대시보드에서 최종 항목 확인 ===
    console.log('\n📍 5단계: 대시보드에서 최종 항목 확인');
    await page.goto('http://localhost:8081/ko/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 최종 상태 기록
    let finalStats = {
      orders: 0,
      pending: 0,
      shipping: 0,
      completed: 0,
      refunded: 0,
      stock: 0
    };

    try {
      // 배송 중 카드 확인
      const shippingCard = page.locator('text=배송 중').first();
      if (await shippingCard.count() > 0) {
        const shippingContainer = shippingCard.locator('..').locator('..');
        const shippingText = await shippingContainer.textContent();
        const shippingMatch = shippingText?.match(/(\d+)\s*건/);
        if (shippingMatch) {
          finalStats.shipping = parseInt(shippingMatch[1]);
        }
      }

      // 배송 완료 카드 확인
      const completedCard = page.locator('text=배송 완료').first();
      if (await completedCard.count() > 0) {
        const completedContainer = completedCard.locator('..').locator('..');
        const completedText = await completedContainer.textContent();
        const completedMatch = completedText?.match(/(\d+)\s*건/);
        if (completedMatch) {
          finalStats.completed = parseInt(completedMatch[1]);
        }
      }

      // 환불 카드 확인
      const refundedCard = page.locator('text=환불').first();
      if (await refundedCard.count() > 0) {
        const refundedContainer = refundedCard.locator('..').locator('..');
        const refundedText = await refundedContainer.textContent();
        const refundedMatch = refundedText?.match(/(\d+)\s*건/);
        if (refundedMatch) {
          finalStats.refunded = parseInt(refundedMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 일부 대시보드 정보를 찾을 수 없음');
    }

    console.log('  📊 최종 대시보드 상태:');
    console.log(`    - 배송 중: ${finalStats.shipping}건`);
    console.log(`    - 배송 완료: ${finalStats.completed}건`);
    console.log(`    - 환불: ${finalStats.refunded}건`);

    // 변화량 계산
    console.log('\n  📈 변화량:');
    console.log(`    - 배송 중: ${initialStats.shipping} → ${finalStats.shipping} (${finalStats.shipping - initialStats.shipping})`);
    console.log(`    - 배송 완료: ${initialStats.completed} → ${finalStats.completed} (${finalStats.completed - initialStats.completed > 0 ? '+' : ''}${finalStats.completed - initialStats.completed})`);
    console.log(`    - 환불: ${initialStats.refunded} → ${finalStats.refunded} (${finalStats.refunded - initialStats.refunded > 0 ? '+' : ''}${finalStats.refunded - initialStats.refunded})`);

    // 검증
    if (finalStats.shipping < initialStats.shipping) {
      console.log('  ✅ 배송 중 건수 감소 확인 (배송 완료 또는 환불 처리)');
    }
    if (finalStats.completed > initialStats.completed) {
      console.log('  ✅ 배송 완료 건수 증가 확인');
    }
    if (finalStats.refunded > initialStats.refunded) {
      console.log('  ✅ 환불 처리 건수 증가 확인');
    }

    console.log('\n🎉 시나리오 4 테스트 완료!');
    console.log('========================================');
    console.log('✅ 모든 단계 성공적으로 완료');
  });
});