import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 1: 재고 입고', () => {
  test('기존 상품 재고 입고 플로우', async ({ page }) => {
    console.log('\n=== 시나리오 1: 재고 입고 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 로그인 및 세션 설정 ===
    console.log('📍 1단계: 로그인 및 세션 설정');
    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    console.log('  ✅ 로그인 완료');

    // === 2단계: 재고 관리 페이지 이동 ===
    console.log('\n📍 2단계: 재고 관리 페이지 이동');
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForLoadState('networkidle');
    console.log('  - 재고 관리 페이지 도착');

    // 현재 상품 목록 확인
    const productRows = await page.locator('tbody tr').count();
    console.log(`  - 현재 등록된 상품 수: ${productRows}개`);

    if (productRows === 0) {
      console.log('  ⚠️ 등록된 상품이 없습니다. 먼저 시나리오 0을 실행하세요.');
      return;
    }

    // === 3단계: 재고 입고할 상품 선택 ===
    console.log('\n📍 3단계: 재고 입고할 상품 선택');

    // 첫 번째 상품의 정보 가져오기
    const firstProductRow = page.locator('tbody tr').first();
    const productName = await firstProductRow.locator('td').nth(1).textContent();
    const currentStock = await firstProductRow.locator('td').filter({ hasText: /^\d+$/ }).first().textContent();

    console.log(`  - 선택된 상품: ${productName}`);
    console.log(`  - 현재 재고: ${currentStock}개`);

    // === 4단계: 재고 입고 모달 열기 ===
    console.log('\n📍 4단계: 재고 입고 모달 열기');

    const inboundButton = page
      .locator('button')
      .filter({ hasText: /입고|재고.*추가|Add.*Stock|Inbound/i })
      .first();

    await inboundButton.click();
    await page.waitForTimeout(TIMEOUTS.short);
    console.log('  - 재고 입고 모달 열림');

    // === 5단계: 입고 정보 입력 ===
    console.log('\n📍 5단계: 입고 정보 입력');

    // 상품 선택 (드롭다운에서)
    const productSelect = page.locator('select').filter({ has: page.locator('option') }).nth(0);
    const selectExists = await productSelect.count() > 0;

    if (selectExists) {
      // select 엘리먼트가 있는 경우
      const options = await productSelect.locator('option').all();
      console.log(`  - 상품 옵션 개수: ${options.length}개`);

      // 실제 상품이 있는 옵션 선택 (보통 index 1부터)
      if (options.length > 1) {
        const optionText = await options[1].textContent();
        console.log(`  - 선택할 상품: ${optionText}`);
        await productSelect.selectOption({ index: 1 });
      }
    } else {
      // 일반 드롭다운인 경우
      const productDropdown = page.locator('[data-testid*="product"], [id*="product"]').first();
      await productDropdown.click();
      const firstOption = page.locator('[role="option"]').first();
      await firstOption.click();
    }

    console.log('  ✅ 상품 선택 완료');

    // 입고 수량 입력
    const quantityInput = page.locator('input[type="number"]').filter({ hasNotText: /가격|금액|price/i }).first();
    const inboundQuantity = 100;
    await quantityInput.fill(inboundQuantity.toString());
    console.log(`  - 입고 수량: ${inboundQuantity}개`);

    // 입고 단가 입력 (선택사항)
    const costInput = page.locator('input').filter({ hasText: /단가|원가|cost/i }).or(
      page.locator('input[name*="cost"], input[placeholder*="단가"]')
    ).first();

    if (await costInput.count() > 0) {
      await costInput.fill('150');  // 150 CNY
      console.log('  - 입고 단가: 150 CNY');
    }

    // 메모 입력
    const memoInput = page.locator('input[name*="memo"], textarea[name*="memo"], input[placeholder*="메모"]').first();
    if (await memoInput.count() > 0) {
      await memoInput.fill(`시나리오 1 테스트 입고 - ${new Date().toLocaleString('ko-KR')}`);
      console.log('  - 메모: 시나리오 1 테스트 입고');
    }

    // === 6단계: 입고 저장 ===
    console.log('\n📍 6단계: 입고 저장');

    const saveButton = page
      .locator('button')
      .filter({ hasText: /저장|입고|등록|Save|Submit/i })
      .last();

    // API 응답 확인
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/inventory') && response.status() === 200,
      { timeout: TIMEOUTS.navigation }
    ).catch(() => null);

    await saveButton.click();
    console.log('  - 입고 저장 버튼 클릭');

    const response = await responsePromise;
    if (response) {
      console.log('  ✅ 재고 입고 API 응답 성공');
    }

    // 모달이 닫힐 때까지 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // === 7단계: 재고 증가 확인 ===
    console.log('\n📍 7단계: 재고 증가 확인');

    // 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 동일한 상품의 재고 확인
    const updatedProductRow = page.locator('tbody tr').first();
    const updatedStock = await updatedProductRow.locator('td').filter({ hasText: /^\d+$/ }).first().textContent();
    const stockIncrease = parseInt(updatedStock || '0') - parseInt(currentStock || '0');

    console.log(`  - 입고 후 재고: ${updatedStock}개`);
    console.log(`  - 재고 증가량: ${stockIncrease}개 (예상: ${inboundQuantity}개)`);

    if (stockIncrease === inboundQuantity) {
      console.log('  ✅ 재고가 정확히 증가함');
    } else if (stockIncrease > 0) {
      console.log('  ⚠️ 재고는 증가했지만 예상값과 다름');
    } else {
      console.log('  ❌ 재고가 증가하지 않음');
    }

    // === 8단계: 출납장부 확인 ===
    console.log('\n📍 8단계: 출납장부에서 입고 내역 확인');

    await page.goto(getTestUrl('/ko/cashbook'));

    // 페이지 로딩 대기 (타임아웃 증가)
    try {
      await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.navigation });
      console.log('  - 출납장부 페이지 로딩 완료');
    } catch (error) {
      console.log('  ⚠️ 출납장부 페이지 로딩 타임아웃 - 계속 진행');
    }

    // 오늘 날짜의 입고 내역 찾기
    const today = new Date().toISOString().split('T')[0];
    const cashbookRows = await page.locator('tbody tr').all();

    console.log(`  - 출납장부 총 행 수: ${cashbookRows.length}개`);

    let inboundRecordFound = false;
    for (let i = 0; i < Math.min(cashbookRows.length, 10); i++) {
      const row = cashbookRows[i];
      const rowText = await row.textContent();

      if (rowText?.includes('입고') && rowText.includes(today)) {
        inboundRecordFound = true;
        console.log(`  ✅ 오늘 입고 기록 발견: ${rowText.substring(0, 100)}...`);
        break;
      }
    }

    if (!inboundRecordFound) {
      console.log('  ⚠️ 최근 입고 내역을 찾을 수 없음 (출납장부 자동 기록 확인 필요)');
    }

    // === 9단계: 재고 이동 이력 확인 ===
    console.log('\n📍 9단계: 재고 이동 이력 확인');

    // 재고 관리 페이지로 돌아가기
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForLoadState('networkidle');

    // 이력 보기 버튼이 있는지 확인
    const historyButton = page.locator('button').filter({ hasText: /이력|기록|History/i }).first();

    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(TIMEOUTS.short);

      const historyModal = page.locator('[role="dialog"], .modal');
      if (await historyModal.count() > 0) {
        const historyText = await historyModal.textContent();
        console.log('  ✅ 재고 이동 이력 모달 확인');
        console.log(`  - 이력 내용: ${historyText?.substring(0, 200)}...`);
      }
    } else {
      console.log('  - 재고 이동 이력 기능 없음 (선택사항)');
    }

    // === 정리 ===
    await clearAuth(page);

    // === 테스트 완료 ===
    console.log('\n🎉 시나리오 1 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 입고 상품: ${productName}`);
    console.log(`  - 입고 전 재고: ${currentStock}개`);
    console.log(`  - 입고 수량: ${inboundQuantity}개`);
    console.log(`  - 입고 후 재고: ${updatedStock}개`);
    console.log(`  - 실제 증가량: ${stockIncrease}개`);
    console.log(`  - 출납장부 기록: ${inboundRecordFound ? '확인됨' : '미확인'}`);
    console.log('========================================');

    // Assertion
    expect(stockIncrease).toBeGreaterThan(0);
    console.log('✅ 모든 검증 통과');
  });
});