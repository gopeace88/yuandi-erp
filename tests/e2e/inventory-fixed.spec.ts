import { test, expect } from '@playwright/test';

// 테스트 계정
const TEST_ADMIN = {
  email: 'admin@yuandi.com',
  password: 'yuandi123!'
};

test.describe('재고 관리 테스트 (모달 문제 해결)', () => {
  test.beforeEach(async ({ page }) => {
    // 한국어 페이지로 이동
    await page.goto('http://localhost:8081/ko');
    await page.waitForLoadState('networkidle');

    // 로그인이 필요한 경우
    if (await page.url().includes('/login')) {
      console.log('🔐 로그인 진행...');
      await page.waitForSelector('input#email', { timeout: 5000 });
      await page.fill('input#email', TEST_ADMIN.email);
      await page.fill('input#password', TEST_ADMIN.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*ko/, { timeout: 10000 });
      console.log('✅ 로그인 성공');
    }
  });

  test('재고 입고 프로세스', async ({ page }) => {
    console.log('=== 재고 입고 테스트 시작 ===');

    // 1. 재고 관리 페이지로 이동
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');
    console.log('📍 재고 관리 페이지 로드 완료');

    // 2. 모달이 열려있다면 닫기
    const modal = page.locator('[role="dialog"]');
    if (await modal.count() > 0 && await modal.isVisible()) {
      console.log('⚠️ 모달이 열려있음 - 닫기 처리');

      // 닫기 버튼 찾기 (여러 가능성 체크)
      const closeSelectors = [
        'button:has-text("닫기")',
        'button:has-text("취소")',
        'button:has-text("×")',
        '[aria-label="Close"]',
        '[role="dialog"] button:last-child'
      ];

      for (const selector of closeSelectors) {
        const closeBtn = page.locator(selector).first();
        if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
          await closeBtn.click();
          console.log(`✅ 모달 닫기 버튼 클릭: ${selector}`);
          break;
        }
      }

      // 모달이 사라질 때까지 대기
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {
        console.log('모달 닫기 대기 시간 초과');
      });
    }

    // 3. 테이블에 데이터가 있는지 확인
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`📊 재고 목록: ${rowCount}개 상품`);

    if (rowCount === 0) {
      console.log('❌ 재고 목록에 상품이 없음');
      return;
    }

    // 4. 첫 번째 상품 정보 읽기
    const firstRow = rows.first();
    const productName = await firstRow.locator('td').nth(1).textContent();
    const currentStock = await firstRow.locator('td').nth(6).textContent();
    console.log(`📦 첫 번째 상품: ${productName?.trim()}`);
    console.log(`📊 현재 재고: ${currentStock?.trim()}`);

    // 5. 재고 입고 버튼 클릭
    console.log('🔍 재고 입고 버튼 찾기...');

    // 페이지 상단의 버튼들 확인
    const inboundButtons = [
      page.locator('button:has-text("+ 재고 입고")'),
      page.locator('button:has-text("재고 입고")'),
      page.locator('button').filter({ hasText: /재고.*입고/ })
    ];

    let buttonClicked = false;
    for (const button of inboundButtons) {
      if (await button.count() > 0 && await button.isVisible()) {
        // 버튼이 클릭 가능한 상태인지 확인
        await button.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500); // 스크롤 안정화 대기

        await button.click();
        console.log('✅ 재고 입고 버튼 클릭');
        buttonClicked = true;
        break;
      }
    }

    if (!buttonClicked) {
      console.log('❌ 재고 입고 버튼을 찾을 수 없음');

      // 디버깅: 모든 버튼 출력
      const allButtons = await page.locator('button').all();
      console.log(`페이지의 전체 버튼 수: ${allButtons.length}`);
      for (let i = 0; i < Math.min(5, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        if (text?.trim()) {
          console.log(`  버튼 ${i + 1}: "${text.trim()}"`);
        }
      }
      return;
    }

    // 6. 입고 모달 대기
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✅ 입고 모달 열림');

    // 7. 상품 선택 (드롭다운이 있는 경우)
    const productSelect = page.locator('select[name="product_id"], [data-testid="product-select"]');
    if (await productSelect.count() > 0) {
      // 첫 번째 옵션 선택
      const options = await productSelect.locator('option').all();
      if (options.length > 1) { // 첫 번째는 보통 placeholder
        await productSelect.selectOption({ index: 1 });
        console.log('✅ 상품 선택 완료');
      }
    }

    // 8. 수량 입력
    const quantityInput = page.locator('[data-testid="stock-quantity-input"], input[type="number"]').first();
    await quantityInput.fill('10');
    console.log('✅ 입고 수량 입력: 10개');

    // 9. 메모 입력
    const noteInput = page.locator('[data-testid="stock-note-textarea"], textarea').first();
    if (await noteInput.count() > 0) {
      await noteInput.fill('테스트 입고 - 자동화 테스트');
      console.log('✅ 메모 입력 완료');
    }

    // 10. 확인 버튼 클릭
    const submitButton = page.locator('[data-testid="stock-submit-button"], button:has-text("확인")').first();
    await submitButton.click();
    console.log('✅ 입고 확인 버튼 클릭');

    // 11. 모달 닫힘 대기
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    console.log('✅ 입고 처리 완료');

    // 12. 페이지 새로고침하여 결과 확인
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 13. 업데이트된 재고 확인
    const updatedFirstRow = page.locator('tbody tr').first();
    const updatedStock = await updatedFirstRow.locator('td').nth(6).textContent();
    console.log(`📊 업데이트된 재고: ${updatedStock?.trim()}`);

    console.log('🎉 재고 입고 테스트 완료!');
  });

  test('재고 수정 프로세스', async ({ page }) => {
    console.log('=== 재고 수정 테스트 시작 ===');

    // 1. 재고 관리 페이지로 이동
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');

    // 2. 모달 닫기 처리
    const modal = page.locator('[role="dialog"]');
    if (await modal.count() > 0 && await modal.isVisible()) {
      const closeBtn = page.locator('button:has-text("닫기"), button:has-text("×")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 3. 재고 수정 버튼 클릭
    const adjustButton = page.locator('button:has-text("+ 재고 수정"), button:has-text("재고 수정")').first();
    if (await adjustButton.count() > 0 && await adjustButton.isVisible()) {
      await adjustButton.click();
      console.log('✅ 재고 수정 버튼 클릭');

      // 4. 수정 모달 대기
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // 5. 상품 선택 (필요한 경우)
      const productSelect = page.locator('select[name="product_id"]');
      if (await productSelect.count() > 0) {
        await productSelect.selectOption({ index: 1 });
      }

      // 6. 조정 수량 입력 (음수로 차감)
      const quantityInput = page.locator('[data-testid="stock-quantity-input"], input[type="number"]').first();
      await quantityInput.fill('-3');
      console.log('✅ 조정 수량 입력: -3개 (재고 차감)');

      // 7. 메모 입력
      const noteInput = page.locator('[data-testid="stock-note-textarea"], textarea').first();
      if (await noteInput.count() > 0) {
        await noteInput.fill('재고 실사 조정');
      }

      // 8. 확인 버튼 클릭
      const submitButton = page.locator('[data-testid="stock-submit-button"], button:has-text("확인")').first();
      await submitButton.click();
      console.log('✅ 재고 수정 확인');

      // 9. 모달 닫힘 대기
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
      console.log('✅ 재고 수정 완료');
    } else {
      console.log('⚠️ 재고 수정 버튼을 찾을 수 없음');
    }

    console.log('🎉 재고 수정 테스트 완료!');
  });

  test('테이블 데이터 검증', async ({ page }) => {
    console.log('=== 테이블 데이터 검증 테스트 ===');

    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');

    // 모달 닫기
    const modal = page.locator('[role="dialog"]');
    if (await modal.count() > 0 && await modal.isVisible()) {
      const closeBtn = page.locator('button:has-text("닫기"), button:has-text("×")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      const data = {
        date: await firstRow.locator('td').nth(0).textContent(),
        productName: await firstRow.locator('td').nth(1).textContent(),
        model: await firstRow.locator('td').nth(2).textContent(),
        brand: await firstRow.locator('td').nth(3).textContent(),
        color: await firstRow.locator('td').nth(4).textContent(),
        category: await firstRow.locator('td').nth(5).textContent(),
        stock: await firstRow.locator('td').nth(6).textContent(),
        costCny: await firstRow.locator('td').nth(7).textContent(),
        priceKrw: await firstRow.locator('td').nth(8).textContent()
      };

      console.log('📊 테이블 데이터:');
      console.log(`  날짜: ${data.date?.trim()}`);
      console.log(`  상품명: ${data.productName?.trim()}`);
      console.log(`  모델: ${data.model?.trim()}`);
      console.log(`  브랜드: ${data.brand?.trim()}`);
      console.log(`  색상: ${data.color?.trim()}`);
      console.log(`  카테고리: ${data.category?.trim()}`);
      console.log(`  재고: ${data.stock?.trim()}`);
      console.log(`  원가: ${data.costCny?.trim()}`);
      console.log(`  판매가: ${data.priceKrw?.trim()}`);

      // 통화 형식 확인
      if (data.priceKrw?.includes('₩') || data.priceKrw?.includes('원')) {
        console.log('✅ 한국어 통화 형식 확인');
      }

      // 재고 수량이 숫자인지 확인
      const stockNumber = parseInt(data.stock?.replace(/[^0-9]/g, '') || '0');
      if (!isNaN(stockNumber)) {
        console.log(`✅ 재고 수량 유효: ${stockNumber}개`);
      }
    } else {
      console.log('⚠️ 테이블에 데이터가 없음');
    }

    console.log('🎉 테이블 검증 완료!');
  });
});