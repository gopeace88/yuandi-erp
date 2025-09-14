import { test, expect } from '@playwright/test';

test.describe('재고 입고와 출납장부 연동 테스트', () => {
    test('재고 입고 시 출납장부에 지출 기록이 자동 생성되어야 한다', async ({ page }) => {
        // 1. 로그인
        await page.goto('http://localhost:8081/ko');
        await page.fill('input[type="email"]', 'admin@yuandi.com');
        await page.fill('input[type="password"]', 'yuandi123!');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
        console.log('✅ 로그인 성공');

        // 2. 재고 관리 페이지로 이동
        await page.goto('http://localhost:8081/ko/inventory');
        await page.waitForSelector('h1');
        console.log('✅ 재고 관리 페이지 로드');

        // 3. 첫 번째 상품의 재고 입고 버튼 클릭
        const firstProductRow = page.locator('tbody tr').first();
        await firstProductRow.locator('button:has-text("입고")').click();
        console.log('✅ 재고 입고 모달 열기');

        // 4. 입고 정보 입력
        await page.fill('input[placeholder*="수량"]', '5');
        await page.fill('input[placeholder*="단가"]', '10000');
        await page.fill('textarea[placeholder*="메모"]', '테스트 입고 - 출납장부 연동 확인');

        // 5. 입고 처리
        await page.click('button:has-text("입고 처리")');
        console.log('✅ 재고 입고 처리 완료');

        // 6. 출납장부 페이지로 이동
        await page.goto('http://localhost:8081/ko/cashbook');
        await page.waitForSelector('h1');
        console.log('✅ 출납장부 페이지 로드');

        // 7. 최근 거래에서 입고 기록 확인
        const cashbookRows = page.locator('tbody tr');
        const inboundRow = cashbookRows.filter({ hasText: '상품 입고' }).first();

        await expect(inboundRow).toBeVisible({ timeout: 10000 });
        console.log('✅ 출납장부에 입고 기록 확인');

        // 8. 거래 유형이 '지출'인지 확인
        const transactionType = inboundRow.locator('td').nth(1);
        await expect(transactionType).toContainText('지출');
        console.log('✅ 거래 유형이 지출로 기록됨');

        // 9. 금액이 올바르게 기록되었는지 확인 (5개 × 10,000원 = 50,000원)
        const amount = inboundRow.locator('td').nth(3);
        await expect(amount).toContainText('50,000');
        console.log('✅ 입고 금액이 올바르게 기록됨');

        // 10. 스크린샷 저장
        await page.screenshot({ path: 'inventory-cashbook-integration-test.png' });

        console.log('🎉 재고 입고와 출납장부 연동 테스트 완료!');
    });

    test('상품 등록 시 초기 재고가 출납장부에 기록되어야 한다', async ({ page }) => {
        // 1. 로그인
        await page.goto('http://localhost:8081/ko');
        await page.fill('input[type="email"]', 'admin@yuandi.com');
        await page.fill('input[type="password"]', 'yuandi123!');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');

        // 2. 상품 등록 페이지로 이동
        await page.goto('http://localhost:8081/ko/inventory');
        await page.click('button:has-text("상품 등록")');
        await page.waitForTimeout(1000);

        // 3. 상품 정보 입력
        const inputs = await page.locator('input[type="text"]').all();
        if (inputs[0]) await inputs[0].fill('출납장부연동테스트상품');
        await page.selectOption('select', '전자제품');
        if (inputs[1]) await inputs[1].fill('CASH-001');
        if (inputs[2]) await inputs[2].fill('레드');
        if (inputs[3]) await inputs[3].fill('테스트브랜드');

        const numberInputs = await page.locator('input[type="number"]').all();
        if (numberInputs[0]) await numberInputs[0].fill('8000'); // 원가
        if (numberInputs[1]) await numberInputs[1].fill('1500000'); // 판매가
        if (numberInputs[2]) await numberInputs[2].fill('3'); // 초기 재고

        // 4. 상품 저장
        await page.click('button:has-text("저장")');
        await page.waitForTimeout(3000);
        console.log('✅ 상품 등록 완료');

        // 5. 출납장부에서 초기 재고 기록 확인
        await page.goto('http://localhost:8081/ko/cashbook');
        await page.waitForSelector('h1');

        const cashbookRows = page.locator('tbody tr');
        const initialStockRow = cashbookRows.filter({ hasText: '초기 재고 입고' }).first();

        await expect(initialStockRow).toBeVisible({ timeout: 10000 });
        console.log('✅ 출납장부에 초기 재고 기록 확인');

        // 6. 거래 유형이 '지출'인지 확인
        const transactionType = initialStockRow.locator('td').nth(1);
        await expect(transactionType).toContainText('지출');
        console.log('✅ 초기 재고 거래 유형이 지출로 기록됨');

        // 7. 스크린샷 저장
        await page.screenshot({ path: 'product-registration-cashbook-integration-test.png' });

        console.log('🎉 상품 등록과 출납장부 연동 테스트 완료!');
    });
});
