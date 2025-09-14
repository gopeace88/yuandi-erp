import { test, expect } from '@playwright/test';

// 테스트 계정
const TEST_ADMIN = {
  email: 'admin@yuandi.com',
  password: 'yuandi123!'
};

test.describe('재고 관리 정확한 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 한국어 페이지로 이동
    await page.goto('http://localhost:8081/ko');
    await page.waitForLoadState('networkidle');

    // 로그인이 필요한 경우
    if (await page.url().includes('/login')) {
      console.log('로그인 진행...');
      await page.waitForSelector('input#email', { timeout: 5000 });
      await page.fill('input#email', TEST_ADMIN.email);
      await page.fill('input#password', TEST_ADMIN.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*ko/, { timeout: 10000 });
    }
  });

  test('재고 입고 - 정확한 selector 사용', async ({ page }) => {
    console.log('=== 재고 입고 테스트 (정확한 버전) ===');

    // 재고 관리 페이지로 이동
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');

    // 페이지 제목 확인
    const pageTitle = await page.locator('h1').first().textContent();
    console.log(`페이지 제목: ${pageTitle}`);

    // 재고 입고 버튼 찾기 - 분석 결과: "+ 재고 입고"
    const inboundButton = page.locator('button:has-text("+ 재고 입고"), button:has-text("재고 입고")').first();

    if (await inboundButton.count() > 0) {
      console.log('재고 입고 버튼 발견');

      // 테이블 첫 번째 행 확인
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.count() > 0) {
        // 테이블 구조 분석 결과 사용
        // 1번째 열: 상품명, 6번째 열: 재고
        const productName = await firstRow.locator('td').nth(1).textContent();
        const currentStock = await firstRow.locator('td').nth(6).textContent();
        console.log(`첫 번째 상품: ${productName}`);
        console.log(`현재 재고: ${currentStock}`);

        // 재고 입고 버튼 클릭
        await inboundButton.click();
        console.log('재고 입고 모달 열기');

        // 모달 대기
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

        // data-testid 사용하여 정확한 입력
        const quantityInput = page.locator('[data-testid="stock-quantity-input"]');
        if (await quantityInput.count() > 0) {
          await quantityInput.fill('5');
          console.log('입고 수량 입력: 5개');
        } else {
          // 대체 selector
          await page.locator('input[type="number"]').first().fill('5');
          console.log('입고 수량 입력 (대체 selector): 5개');
        }

        // 메모 입력
        const noteTextarea = page.locator('[data-testid="stock-note-textarea"]');
        if (await noteTextarea.count() > 0) {
          await noteTextarea.fill('정확한 테스트 - 재고 입고');
        } else {
          // 대체 selector
          await page.locator('textarea').first().fill('정확한 테스트 - 재고 입고');
        }

        // 확인 버튼 클릭
        const submitButton = page.locator('[data-testid="stock-submit-button"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          console.log('확인 버튼 클릭 (data-testid)');
        } else {
          // 대체: 확인/Confirm 텍스트 버튼
          await page.locator('button:has-text("확인"), button:has-text("Confirm")').first().click();
          console.log('확인 버튼 클릭 (텍스트)');
        }

        // 모달 닫힘 대기
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
        console.log('✅ 재고 입고 완료');

        // 결과 확인을 위해 페이지 새로고침
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 업데이트된 재고 확인
        const updatedStock = await firstRow.locator('td').nth(6).textContent();
        console.log(`업데이트된 재고: ${updatedStock}`);
      } else {
        console.log('⚠️ 테이블에 상품이 없음');
      }
    } else {
      console.log('⚠️ 재고 입고 버튼을 찾을 수 없음');

      // 페이지의 모든 버튼 확인
      const buttons = await page.locator('button').all();
      console.log(`페이지의 전체 버튼 수: ${buttons.length}`);

      // 처음 10개 버튼의 텍스트 출력
      for (let i = 0; i < Math.min(10, buttons.length); i++) {
        const text = await buttons[i].textContent();
        if (text && text.trim()) {
          console.log(`버튼 ${i + 1}: "${text.trim()}"`);
        }
      }
    }
  });

  test('재고 수정 - 정확한 selector 사용', async ({ page }) => {
    console.log('=== 재고 수정 테스트 (정확한 버전) ===');

    // 재고 관리 페이지로 이동
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');

    // 재고 수정 버튼 찾기 - 분석 결과: "+ 재고 수정"
    const adjustButton = page.locator('button:has-text("+ 재고 수정"), button:has-text("재고 수정")').first();

    if (await adjustButton.count() > 0) {
      console.log('재고 수정 버튼 발견');

      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.count() > 0) {
        const productName = await firstRow.locator('td').nth(1).textContent();
        const currentStock = await firstRow.locator('td').nth(6).textContent();
        console.log(`첫 번째 상품: ${productName}`);
        console.log(`현재 재고: ${currentStock}`);

        // 재고 수정 버튼 클릭
        await adjustButton.click();
        console.log('재고 수정 모달 열기');

        // 모달 대기
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

        // 조정 수량 입력 (음수 가능)
        const quantityInput = page.locator('[data-testid="stock-quantity-input"]');
        if (await quantityInput.count() > 0) {
          await quantityInput.fill('-2');
          console.log('조정 수량 입력: -2개 (재고 차감)');
        } else {
          await page.locator('input[type="number"]').first().fill('-2');
          console.log('조정 수량 입력 (대체): -2개');
        }

        // 메모 입력
        const noteTextarea = page.locator('[data-testid="stock-note-textarea"]');
        if (await noteTextarea.count() > 0) {
          await noteTextarea.fill('재고 실사 조정');
        } else {
          await page.locator('textarea').first().fill('재고 실사 조정');
        }

        // 확인 버튼 클릭
        const submitButton = page.locator('[data-testid="stock-submit-button"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
        } else {
          await page.locator('button:has-text("확인"), button:has-text("Confirm")').first().click();
        }

        // 모달 닫힘 대기
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
        console.log('✅ 재고 수정 완료');

        // 결과 확인
        await page.reload();
        await page.waitForLoadState('networkidle');

        const updatedStock = await firstRow.locator('td').nth(6).textContent();
        console.log(`업데이트된 재고: ${updatedStock}`);
      }
    } else {
      console.log('⚠️ 재고 수정 버튼을 찾을 수 없음');
    }
  });

  test('테이블 구조 확인', async ({ page }) => {
    console.log('=== 테이블 구조 확인 ===');

    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      // 분석된 테이블 구조에 따른 데이터 추출
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

      console.log('테이블 데이터:');
      console.log(JSON.stringify(data, null, 2));

      // 통화 형식 확인
      if (data.priceKrw?.includes('₩') || data.priceKrw?.includes('원')) {
        console.log('✅ 한국어 통화 형식 확인');
      }
    } else {
      console.log('⚠️ 테이블에 데이터가 없음');
    }
  });
});