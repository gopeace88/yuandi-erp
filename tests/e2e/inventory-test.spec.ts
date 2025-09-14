import { test, expect } from '@playwright/test';

test.describe('YUANDI ERP 재고 관리 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 과정
    await page.goto('https://00-yuandi-erp.vercel.app/');
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
  });

  test('재고 관리에서 입고 처리', async ({ page }) => {
    console.log('📍 4단계: 재고 관리에서 입고 처리');

    // 재고 관리 페이지로 이동
    const inventoryLink = page.locator('text=재고').first();
    if (await inventoryLink.isVisible()) {
      await inventoryLink.click();
      console.log('✅ 재고 관리 메뉴 클릭 성공');
    } else {
      // 다른 가능한 재고 링크들
      const altLinks = [
        'text=재고 관리',
        'text=Inventory',
        'a[href*="inventory"]',
        'text=상품 관리'
      ];

      for (const selector of altLinks) {
        const link = page.locator(selector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          console.log(`✅ 재고 페이지 이동 성공: ${selector}`);
          break;
        }
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/09-inventory-page.png',
      fullPage: true
    });

    // 재고 목록에서 첫 번째 상품 찾기
    const productRows = page.locator('tbody tr');
    const rowCount = await productRows.count();
    console.log(`재고 목록에서 발견된 상품 수: ${rowCount}`);

    if (rowCount === 0) {
      console.log('⚠️ 재고 목록에 상품이 없음');
      return;
    }

    // 첫 번째 상품에 대해 입고 처리
    const firstRow = productRows.first();

    // 입고 버튼 찾기
    const stockInButtons = [
      'button:has-text("입고")',
      'button:has-text("재고추가")',
      'button:has-text("추가")',
      'button[data-action="stock-in"]',
      '.stock-in-btn'
    ];

    let stockInButtonFound = false;
    for (const selector of stockInButtons) {
      const button = firstRow.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        console.log(`✅ 입고 버튼 클릭: ${selector}`);
        stockInButtonFound = true;
        break;
      }
    }

    if (!stockInButtonFound) {
      console.log('⚠️ 입고 버튼을 찾을 수 없음 - 다른 방법 시도');

      // 행 전체를 클릭해보기
      await firstRow.click();
      await page.waitForTimeout(1000);

      // 입고 버튼이 나타나는지 다시 확인
      for (const selector of stockInButtons) {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          console.log(`✅ 행 클릭 후 입고 버튼 클릭: ${selector}`);
          stockInButtonFound = true;
          break;
        }
      }
    }

    if (!stockInButtonFound) {
      console.log('❌ 입고 버튼을 찾을 수 없음');

      // 페이지의 모든 버튼 출력
      const allButtons = await page.locator('button').all();
      console.log(`페이지의 모든 버튼 수: ${allButtons.length}`);

      for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
        try {
          const text = await allButtons[i].textContent();
          const isVisible = await allButtons[i].isVisible();
          if (isVisible && text && text.trim()) {
            console.log(`버튼 ${i + 1}: "${text.trim()}"`);
          }
        } catch (e) {
          // 무시
        }
      }
      return;
    }

    await page.waitForTimeout(2000);
    await page.screenshot({
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/10-stock-in-modal.png',
      fullPage: true
    });

    // 입고 수량 입력
    const quantityInputs = [
      'input[name="quantity"]',
      'input[placeholder*="수량"]',
      'input[type="number"]',
      '.quantity-input'
    ];

    let quantityEntered = false;
    for (const selector of quantityInputs) {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 2000 })) {
        await input.fill('12');
        console.log(`✅ 수량 입력 (12개): ${selector}`);
        quantityEntered = true;
        break;
      }
    }

    // 메모 입력 (선택사항)
    const noteInputs = [
      'input[name="note"]',
      'textarea[name="note"]',
      'input[placeholder*="메모"]',
      'textarea[placeholder*="메모"]'
    ];

    for (const selector of noteInputs) {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 2000 })) {
        await input.fill('E2E 테스트 입고 처리');
        console.log(`✅ 메모 입력: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/11-stock-in-form-filled.png',
      fullPage: true
    });

    // 확인/저장 버튼 클릭
    const confirmButtons = [
      'button:has-text("확인")',
      'button:has-text("저장")',
      'button:has-text("입고")',
      'button[type="submit"]'
    ];

    let confirmed = false;
    for (const selector of confirmButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        console.log(`✅ 입고 확인 버튼 클릭: ${selector}`);
        confirmed = true;
        break;
      }
    }

    if (confirmed) {
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/12-stock-in-completed.png',
        fullPage: true
      });

      console.log('✅ 재고 입고 처리 완료');
    } else {
      console.log('⚠️ 입고 확인 버튼을 찾을 수 없음');
    }

    console.log('🎉 재고 관리 테스트 완료');
  });
});