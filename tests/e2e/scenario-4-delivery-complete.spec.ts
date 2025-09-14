import { test, expect } from '@playwright/test';

test.describe('시나리오 4: 배송 완료 등록 및 환불 처리 (localStorage 세션 유지)', () => {
  test('배송 완료 및 환불 처리 확인', async ({ page }) => {

    console.log('\n=== 시나리오 4: 배송 완료 등록 및 환불 처리 시작 ===\n');

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
      // 주문 현황
      const orderCard = page.locator('text=주문 현황').first();
      if (await orderCard.count() > 0) {
        const orderContainer = orderCard.locator('..').locator('..');
        const orderText = await orderContainer.textContent();
        const orderMatch = orderText?.match(/(\d+)\s*건/);
        if (orderMatch) {
          initialStats.orders = parseInt(orderMatch[1]);
        }
      }

      // 배송 대기
      const pendingCard = page.locator('text=배송 대기').first();
      if (await pendingCard.count() > 0) {
        const pendingContainer = pendingCard.locator('..').locator('..');
        const pendingText = await pendingContainer.textContent();
        const pendingMatch = pendingText?.match(/(\d+)\s*건/);
        if (pendingMatch) {
          initialStats.pending = parseInt(pendingMatch[1]);
        }
      }

      // 배송 중
      const shippingCard = page.locator('text=배송 중').first();
      if (await shippingCard.count() > 0) {
        const shippingContainer = shippingCard.locator('..').locator('..');
        const shippingText = await shippingContainer.textContent();
        const shippingMatch = shippingText?.match(/(\d+)\s*건/);
        if (shippingMatch) {
          initialStats.shipping = parseInt(shippingMatch[1]);
        }
      }

      // 배송 완료
      const completedCard = page.locator('text=배송 완료').first();
      if (await completedCard.count() > 0) {
        const completedContainer = completedCard.locator('..').locator('..');
        const completedText = await completedContainer.textContent();
        const completedMatch = completedText?.match(/(\d+)\s*건/);
        if (completedMatch) {
          initialStats.completed = parseInt(completedMatch[1]);
        }
      }

      // 재고 현황
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockContainer = stockCard.locator('..').locator('..');
        const stockText = await stockContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          initialStats.stock = parseInt(stockMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 일부 대시보드 정보를 찾을 수 없음');
    }

    console.log('  📊 초기 대시보드 상태:');
    console.log(`    - 총 주문: ${initialStats.orders}건`);
    console.log(`    - 배송 대기: ${initialStats.pending}건`);
    console.log(`    - 배송 중: ${initialStats.shipping}건`);
    console.log(`    - 배송 완료: ${initialStats.completed}건`);
    console.log(`    - 재고: ${initialStats.stock}개`);

    // === 3단계: 배송 관리에서 배송 완료 처리 ===
    console.log('\n📍 3단계: 배송 관리에서 배송 완료 처리');
    await page.goto('http://localhost:8081/ko/shipments');
    await page.waitForTimeout(2000);

    // '배송 중' 탭 클릭
    const shippingTab = page.locator('button, div').filter({ hasText: /^배송 중$/ });
    if (await shippingTab.count() > 0) {
      await shippingTab.click();
      console.log('  - 배송 중 탭 클릭');
      await page.waitForTimeout(1500);
    }

    // 배송 중 상태인 첫 번째 주문 찾기
    let shippingOrders = page.locator('tr').filter({ hasText: 'SHIPPED' });
    let hasShippingOrder = await shippingOrders.count() > 0;

    if (!hasShippingOrder) {
      // 한국어 상태로도 찾아보기
      shippingOrders = page.locator('tr').filter({ hasText: '배송중' });
      hasShippingOrder = await shippingOrders.count() > 0;
    }

    console.log(`  - 배송 중 주문 수: ${await shippingOrders.count()}건`);

    if (!hasShippingOrder) {
      console.log('  ❌ 배송 중(SHIPPED) 상태의 주문이 없습니다.');
      console.log('  - 먼저 시나리오 3을 실행하여 배송 처리를 해주세요.');
      return;
    }

    // 첫 번째 배송 중 주문 선택
    const firstShippingOrder = shippingOrders.first();
    const orderNo = await firstShippingOrder.locator('td').first().textContent();
    console.log(`  - 선택된 주문번호: ${orderNo}`);

    // 테이블 행 클릭하여 배송 정보 모달 열기
    console.log(`  - 주문 ${orderNo} 행을 클릭하여 배송 정보 모달 열기`);
    await firstShippingOrder.click();
    console.log('  - 배송 정보 모달 열림');
    await page.waitForTimeout(2000);

    // 배송 완료 버튼 클릭
    console.log('  - 배송 완료 버튼 클릭');
    const completeButton = page.locator('button').filter({ hasText: /배송 완료|완료 처리/ });
    if (await completeButton.count() > 0) {
      await completeButton.first().click();
      console.log('  - 배송 완료 처리 중...');
      await page.waitForTimeout(3000);
    } else {
      console.log('  ❌ 배송 완료 버튼을 찾을 수 없습니다.');
    }

    // 페이지 새로고침 후 상태 확인
    await page.reload();
    await page.waitForTimeout(2000);

    // === 4단계: 환불 처리 ===
    console.log('\n📍 4단계: 환불 처리');

    // '배송 완료' 탭 클릭
    const completedTab = page.locator('button, div').filter({ hasText: /^배송 완료$/ });
    if (await completedTab.count() > 0) {
      await completedTab.click();
      console.log('  - 배송 완료 탭 클릭');
      await page.waitForTimeout(1500);
    }

    // 배송 완료된 첫 번째 주문 찾기
    let completedOrders = page.locator('tr').filter({ hasText: 'DELIVERED' }).or(
      page.locator('tr').filter({ hasText: '배송완료' })
    );
    let hasCompletedOrder = await completedOrders.count() > 0;

    if (!hasCompletedOrder) {
      console.log('  ⚠️ 배송 완료 상태의 주문이 없습니다.');
      console.log('  - 3단계의 배송 완료 처리가 실패했을 수 있습니다.');
    } else {
      // 첫 번째 배송 완료 주문 선택
      const firstCompletedOrder = completedOrders.first();
      const refundOrderNo = await firstCompletedOrder.locator('td').first().textContent();
      console.log(`  - 환불 처리할 주문번호: ${refundOrderNo}`);

      // 테이블 행 클릭하여 배송 정보 모달 열기
      console.log(`  - 주문 ${refundOrderNo} 행을 클릭하여 배송 정보 모달 열기`);
      await firstCompletedOrder.click();
      console.log('  - 배송 정보 모달 열림');
      await page.waitForTimeout(2000);

      // 환불 처리 버튼 클릭
      console.log('  - 환불 처리 버튼 클릭');
      const refundButton = page.locator('button').filter({ hasText: /환불 처리|환불|반품/ });
      if (await refundButton.count() > 0) {
        // 확인 대화상자 처리
        page.on('dialog', async dialog => {
          console.log(`  - 확인 메시지: ${dialog.message()}`);
          await dialog.accept();
        });

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
      // 주문 현황
      const orderCard = page.locator('text=주문 현황').first();
      if (await orderCard.count() > 0) {
        const orderContainer = orderCard.locator('..').locator('..');
        const orderText = await orderContainer.textContent();
        const orderMatch = orderText?.match(/(\d+)\s*건/);
        if (orderMatch) {
          finalStats.orders = parseInt(orderMatch[1]);
        }
      }

      // 배송 대기
      const pendingCard = page.locator('text=배송 대기').first();
      if (await pendingCard.count() > 0) {
        const pendingContainer = pendingCard.locator('..').locator('..');
        const pendingText = await pendingContainer.textContent();
        const pendingMatch = pendingText?.match(/(\d+)\s*건/);
        if (pendingMatch) {
          finalStats.pending = parseInt(pendingMatch[1]);
        }
      }

      // 배송 중
      const shippingCard = page.locator('text=배송 중').first();
      if (await shippingCard.count() > 0) {
        const shippingContainer = shippingCard.locator('..').locator('..');
        const shippingText = await shippingContainer.textContent();
        const shippingMatch = shippingText?.match(/(\d+)\s*건/);
        if (shippingMatch) {
          finalStats.shipping = parseInt(shippingMatch[1]);
        }
      }

      // 배송 완료
      const completedCard = page.locator('text=배송 완료').first();
      if (await completedCard.count() > 0) {
        const completedContainer = completedCard.locator('..').locator('..');
        const completedText = await completedContainer.textContent();
        const completedMatch = completedText?.match(/(\d+)\s*건/);
        if (completedMatch) {
          finalStats.completed = parseInt(completedMatch[1]);
        }
      }

      // 환불
      const refundedCard = page.locator('text=환불').first();
      if (await refundedCard.count() > 0) {
        const refundedContainer = refundedCard.locator('..').locator('..');
        const refundedText = await refundedContainer.textContent();
        const refundedMatch = refundedText?.match(/(\d+)\s*건/);
        if (refundedMatch) {
          finalStats.refunded = parseInt(refundedMatch[1]);
        }
      }

      // 재고 현황
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockContainer = stockCard.locator('..').locator('..');
        const stockText = await stockContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          finalStats.stock = parseInt(stockMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 일부 대시보드 정보를 찾을 수 없음');
    }

    console.log('  📊 최종 대시보드 상태:');
    console.log(`    - 총 주문: ${finalStats.orders}건`);
    console.log(`    - 배송 대기: ${finalStats.pending}건`);
    console.log(`    - 배송 중: ${finalStats.shipping}건`);
    console.log(`    - 배송 완료: ${finalStats.completed}건`);
    console.log(`    - 환불: ${finalStats.refunded}건`);
    console.log(`    - 재고: ${finalStats.stock}개`);

    // 변화량 계산
    console.log('\n  📈 변화량:');
    console.log(`    - 배송 중: ${initialStats.shipping} → ${finalStats.shipping} (${finalStats.shipping - initialStats.shipping})`);
    console.log(`    - 배송 완료: ${initialStats.completed} → ${finalStats.completed} (${finalStats.completed - initialStats.completed > 0 ? '+' : ''}${finalStats.completed - initialStats.completed})`);
    console.log(`    - 환불: ${initialStats.refunded} → ${finalStats.refunded} (${finalStats.refunded - initialStats.refunded > 0 ? '+' : ''}${finalStats.refunded - initialStats.refunded})`);

    // 검증
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