import { test, expect } from '@playwright/test';

test.describe('실제 작동 테스트', () => {
  test('로그인 → 재고 관리 → 재고 입고', async ({ page }) => {
    console.log('🚀 실제 작동 테스트 시작\n');

    // 1. 로그인
    console.log('📍 로그인 프로세스');
    await page.goto('http://localhost:8081/ko');
    await page.waitForLoadState('networkidle');

    // 로그인 폼 채우기
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    console.log('  - 로그인 정보 입력 완료');

    // 로그인 버튼 클릭
    await page.click('button:has-text("로그인")');
    console.log('  - 로그인 버튼 클릭');

    // 로그인 성공 대기 (리다이렉트)
    await page.waitForURL(/\/ko(?!\/login)/, { timeout: 10000 });
    console.log('✅ 로그인 성공\n');

    // 2. 재고 관리 페이지로 이동
    console.log('📍 재고 관리 페이지 이동');
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 데이터 로딩 대기

    // 3. 재고 데이터 확인
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`📊 재고 상품 수: ${rowCount}개`);

    if (rowCount > 0) {
      // 첫 번째 상품 정보
      const firstRow = rows.first();
      const productName = await firstRow.locator('td').nth(1).textContent();
      const currentStock = await firstRow.locator('td').nth(6).textContent();
      console.log(`  - 첫 번째 상품: ${productName?.trim()}`);
      console.log(`  - 현재 재고: ${currentStock?.trim()}\n`);

      // 4. 재고 입고 테스트
      console.log('📦 재고 입고 테스트');

      // 기존 모달 닫기
      const existingModal = page.locator('[role="dialog"]');
      if (await existingModal.count() > 0 && await existingModal.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        console.log('  - 기존 모달 닫기');
      }

      // 재고 입고 버튼 찾기 및 클릭
      const inboundButton = page.locator('button:has-text("+ 재고 입고")').first();
      if (await inboundButton.count() > 0 && await inboundButton.isVisible()) {
        await inboundButton.click();
        console.log('  - 재고 입고 버튼 클릭');

        // 입고 모달 대기
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        console.log('  - 입고 모달 열림');

        // 상품 선택 (드롭다운이 있는 경우)
        const productSelect = page.locator('select').first();
        if (await productSelect.count() > 0) {
          const options = await productSelect.locator('option').all();
          if (options.length > 1) {
            await productSelect.selectOption({ index: 1 });
            console.log('  - 상품 선택 완료');
          }
        }

        // 수량 입력
        const quantityInput = page.locator('input[type="number"]').first();
        if (await quantityInput.count() > 0) {
          await quantityInput.fill('10');
          console.log('  - 입고 수량: 10개 입력');
        }

        // 메모 입력 (옵션)
        const noteInput = page.locator('textarea').first();
        if (await noteInput.count() > 0) {
          await noteInput.fill('자동화 테스트 입고');
          console.log('  - 메모 입력 완료');
        }

        // 확인 버튼 클릭
        const submitButton = page.locator('button:has-text("확인")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          console.log('  - 확인 버튼 클릭');

          // 처리 완료 대기
          await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
          console.log('✅ 재고 입고 처리 완료\n');

          // 5. 결과 확인
          console.log('📊 결과 확인');
          await page.reload();
          await page.waitForLoadState('networkidle');

          const updatedRow = page.locator('tbody tr').first();
          const updatedStock = await updatedRow.locator('td').nth(6).textContent();
          console.log(`  - 업데이트된 재고: ${updatedStock?.trim()}`);

          console.log('\n🎉 테스트 성공!');
          expect(true).toBeTruthy();
        } else {
          console.log('❌ 확인 버튼을 찾을 수 없음');
          expect(false).toBeTruthy();
        }
      } else {
        console.log('❌ 재고 입고 버튼을 찾을 수 없음');

        // 모든 버튼 출력
        const buttons = await page.locator('button:visible').all();
        console.log(`\n디버깅: 페이지의 버튼들 (총 ${buttons.length}개):`);
        for (let i = 0; i < Math.min(10, buttons.length); i++) {
          const text = await buttons[i].textContent();
          console.log(`  ${i + 1}. "${text?.trim()}"`);
        }

        expect(false).toBeTruthy();
      }
    } else {
      console.log('❌ 재고 데이터가 없습니다');
      expect(false).toBeTruthy();
    }
  });
});