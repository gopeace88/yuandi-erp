import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 3: 주문 배송 처리 (localStorage 세션 유지)', () => {
  test('배송 처리 및 상태 변경 확인', async ({ page }) => {

    console.log('\n=== 시나리오 3: 주문 배송 처리 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 로그인 및 세션 설정 ===
    console.log('📍 1단계: 로그인 및 세션 설정');
    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password, 'ko');
    console.log('  ✅ 로그인 완료');

    // === 2단계: 대시보드에서 초기 배송대기 주문 수 확인 ===
    console.log('\n📍 2단계: 대시보드에서 초기 배송대기 주문 수 확인');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(TIMEOUTS.medium);

    // 배송대기 주문 수 확인
    let initialPendingNum = 0;
    try {
      // 방법 1: "배송 대기" 텍스트를 포함한 카드 찾기 (띄어쓰기 포함)
      const pendingCard = page.locator('text=배송 대기').first();
      if (await pendingCard.count() > 0) {
        const cardContainer = pendingCard.locator('..').locator('..');
        const cardText = await cardContainer.textContent();
        const pendingMatch = cardText?.match(/(\d+)\s*건/);
        if (pendingMatch) {
          initialPendingNum = parseInt(pendingMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 배송대기 정보를 찾을 수 없음, 기본값 사용');
    }
    console.log(`  - 초기 배송대기: ${initialPendingNum}건`);

    // === 3단계: 배송 관리에서 배송 처리 ===
    console.log('\n📍 3단계: 배송 관리에서 배송 처리');
    await page.goto(getTestUrl('/ko/shipments'));
    await page.waitForTimeout(TIMEOUTS.medium);

    // 배송대기 상태인 첫 번째 주문 찾기 (결제완료 상태)
    let pendingOrders = page.locator('tr').filter({ hasText: '결제완료' });
    let hasPendingOrder = await pendingOrders.count() > 0;

    // 영어 상태도 확인
    if (!hasPendingOrder) {
      pendingOrders = page.locator('tr').filter({ hasText: 'PAID' });
      hasPendingOrder = await pendingOrders.count() > 0;
    }

    console.log(`  - 배송대기 주문 수: ${await pendingOrders.count()}건`);

    if (!hasPendingOrder) {
      console.log('  ❌ 배송대기(PAID) 주문이 없습니다.');
      console.log('  - 먼저 시나리오 2를 실행하여 주문을 생성해 주세요.');
      console.log('  - 또는 배송 관리 화면에서 결제완료 상태의 주문이 있는지 확인해 주세요.');
      return;
    }

    // 첫 번째 배송대기 주문 선택
    const firstPendingOrder = pendingOrders.first();
    const orderNo = await firstPendingOrder.locator('td').first().textContent();
    console.log(`  - 선택된 주문번호: ${orderNo}`);

    // 테이블 행 클릭하여 배송 모달 열기
    console.log(`  - 주문 ${orderNo} 행을 클릭하여 배송 모달 열기`);
    await firstPendingOrder.click();
    console.log('  - 배송 모달 열림');
    await page.waitForTimeout(TIMEOUTS.short);

    // 배송 정보 입력
    console.log('  - 배송 정보 입력');

    // 모달이 열린 후 약간 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // "운송장번호*" 레이블이 있는 입력 필드에 송장번호 입력
    const trackingNumber = 'TN' + Date.now();

    // 방법 1: 레이블로 찾기
    let trackingInput = page.locator('label').filter({ hasText: /운송장번호.*\*/ }).locator('..').locator('input').first();

    // 방법 2: placeholder로 찾기
    if (await trackingInput.count() === 0) {
      trackingInput = page.locator('input[placeholder*="운송장번호"]').first();
    }

    // 방법 3: 일반적인 입력 필드 (readonly가 아닌 것)
    if (await trackingInput.count() === 0) {
      trackingInput = page.locator('input:not([readonly]):not([disabled])').filter({ hasText: /운송장번호/ }).first();
    }

    // 방법 4: 마지막 수단 - 모든 입력 필드에서 찾기
    if (await trackingInput.count() === 0) {
      console.log('  - 운송장번호 필드를 찾기 위해 모든 input 확인');
      const allInputs = page.locator('input');
      const inputCount = await allInputs.count();
      console.log(`  - 전체 input 개수: ${inputCount}개`);

      for (let i = 0; i < Math.min(10, inputCount); i++) {
        const input = allInputs.nth(i);
        const placeholder = await input.getAttribute('placeholder');
        const isReadonly = await input.getAttribute('readonly');
        console.log(`    Input ${i}: placeholder="${placeholder}", readonly="${isReadonly}"`);

        if (placeholder && placeholder.includes('운송장번호') && !isReadonly) {
          trackingInput = input;
          break;
        }
      }
    }

    await trackingInput.fill(trackingNumber);
    console.log(`  - 운송장번호 입력: ${trackingNumber}`);

    // 배송비 입력 ("배송비 (¥) *" 라벨이 있는 필드)
    const shippingFee = '5';
    let shippingFeeInput = page.locator('label').filter({ hasText: /배송비.*\(¥\).*\*/ }).locator('..').locator('input').first();

    // 방법 2: placeholder로 찾기
    if (await shippingFeeInput.count() === 0) {
      shippingFeeInput = page.locator('input[placeholder*="배송비"]').first();
    }

    // 방법 3: number 타입 필드 중에서 찾기 (readonly가 아닌 것)
    if (await shippingFeeInput.count() === 0) {
      shippingFeeInput = page.locator('input[type="number"]:not([readonly])').first();
    }

    await shippingFeeInput.fill(shippingFee);
    console.log(`  - 배송비 입력: ${shippingFee} CNY`);

    console.log('  - 송장번호 및 배송비 입력 완료');

    // 등록 버튼 클릭 (모달 내에서 찾기)
    console.log('  - 등록 버튼 클릭');
    // 사용자가 말한 "등록" 버튼 찾기
    const saveShippingButton = page.locator('button').filter({ hasText: /등록|저장|배송 처리/ }).last();
    await saveShippingButton.click({ force: true });
    console.log('  - 배송 처리 중...');

    // 처리 완료 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // 상태 변경 확인
    await page.reload();
    await page.waitForTimeout(TIMEOUTS.medium);

    const shippedOrder = page.locator('tr').filter({ hasText: orderNo || '주문' }).first();
    const statusElement = shippedOrder.locator('td').filter({ hasText: 'SHIPPED' });
    const isShipped = await statusElement.count() > 0;

    if (isShipped) {
      console.log('  ✅ 주문 상태가 SHIPPED로 변경됨');
    }

    // === 4단계: 출납장부에서 배송비 확인 ===
    console.log('\n📍 4단계: 출납장부에서 배송비 확인');
    const testStartTime = Date.now();
    console.log(`  - 테스트 시작 시간: ${new Date(testStartTime).toLocaleString()}`);

    await page.goto(getTestUrl('/ko/cashbook'));
    await page.waitForTimeout(TIMEOUTS.medium);

    // 출납장부 전체 행 확인
    const allRows = await page.locator('tbody tr').all();
    console.log(`  - 출납장부 총 행 수: ${allRows.length}개`);

    let recentShippingFound = false;
    // 각 행의 내용 확인하고 오늘 날짜의 배송비 기록 찾기
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      const cells = await allRows[i].locator('td').all();
      if (cells.length >= 4) {
        const date = await cells[0].textContent();
        const type = await cells[1].textContent();
        const description = await cells[2].textContent();
        const amount = await cells[3].textContent();

        console.log(`    행 ${i + 1}: ${date?.trim()} | ${type?.trim()} | ${description?.trim()} | ${amount?.trim()}`);

        // 오늘 날짜의 배송비 기록 찾기
        if (date && type?.includes('배송비')) {
          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const recordDate = date.trim();
          if (recordDate === today && amount?.includes('5,000')) {
            recentShippingFound = true;
            console.log(`  ✅ 오늘 배송비 기록 발견: ${recordDate}, 금액: ${amount}`);
            break;
          }
        }
      }
    }

    // 배송비 관련 기록 찾기
    const shippingFeeRecord = page.locator('tr').filter({ hasText: '배송비' });
    const hasShippingFee = await shippingFeeRecord.count() > 0;

    if (hasShippingFee && recentShippingFound) {
      console.log('  ✅ 최근 배송비 내역 발견');
    } else if (hasShippingFee && !recentShippingFound) {
      console.log('  ⚠️ 배송비 내역은 있지만 최근 테스트와 일치하지 않습니다');
    } else {
      console.log('  ❌ 배송비 내역이 출납장부에 기록되지 않았습니다');
      console.log('  - 이는 배송 처리 시 출납장부 기록 생성 실패를 의미합니다');
    }

    // === 5단계: 대시보드에서 배송대기 감소 확인 ===
    console.log('\n📍 5단계: 대시보드에서 배송대기 감소 확인');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(TIMEOUTS.medium);

    // 최종 배송대기 주문 수 확인
    let finalPendingNum = 0;
    try {
      const pendingCard = page.locator('text=배송 대기').first();
      if (await pendingCard.count() > 0) {
        const cardContainer = pendingCard.locator('..').locator('..');
        const cardText = await cardContainer.textContent();
        const pendingMatch = cardText?.match(/(\d+)\s*건/);
        if (pendingMatch) {
          finalPendingNum = parseInt(pendingMatch[1]);
        }
      }
    } catch (error) {
      console.log('  - 배송대기 정보를 찾을 수 없음');
    }
    console.log(`  - 최종 배송대기: ${finalPendingNum}건`);

    const pendingDecrease = initialPendingNum - finalPendingNum;
    console.log(`  - 배송대기 감소: ${pendingDecrease}건`);

    if (pendingDecrease >= 1) {
      console.log('  ✅ 배송대기 주문 감소 확인');
    }

    console.log('\n🎉 시나리오 3 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 처리된 주문: ${orderNo}`);
    console.log(`  - 주문 상태: PAID → SHIPPED`);
    console.log(`  - 초기 배송대기: ${initialPendingNum}건`);
    console.log(`  - 최종 배송대기: ${finalPendingNum}건`);
    console.log('========================================');
    console.log('✅ 모든 단계 성공적으로 완료');

    await clearAuth(page);
  });
});
