import { test, expect } from '@playwright/test';

test.describe('수동 재고 입고 및 출납장부 연동 테스트', () => {
    test('재고 입고 후 출납장부 확인', async ({ page }) => {
        console.log('🚀 재고 입고 및 출납장부 연동 테스트 시작');

        // 1. 로그인
        await page.goto('http://localhost:8081/ko');
        await page.fill('input[type="email"]', 'admin@yuandi.com');
        await page.fill('input[type="password"]', 'yuandi123!');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
        console.log('✅ 로그인 완료');

        // 2. 재고 관리 페이지로 이동
        await page.goto('http://localhost:8081/ko/inventory');
        await page.waitForSelector('h1');
        console.log('✅ 재고 관리 페이지 로드');

        // 3. 재고 입고 버튼 클릭 (페이지 상단의 + 재고 입고 버튼)
        await page.click('button:has-text("+ 재고 입고")');
        console.log('✅ 재고 입고 모달 열기');

        // 4. 모달이 열릴 때까지 대기
        await page.waitForSelector('select', { timeout: 5000 });

        // 5. 상품 선택 (첫 번째 상품)
        await page.selectOption('select', { index: 1 }); // 첫 번째 옵션은 "-- 상품 선택 --"이므로 index 1
        console.log('📦 상품 선택 완료');

        // 6. 입고 정보 입력
        await page.fill('input[type="number"][min="1"]', '3'); // 수량 입력
        await page.fill('input[type="number"][step="0.01"]', '15000'); // 단가 입력
        await page.fill('textarea', '수동 테스트 입고 - 출납장부 연동 확인'); // 메모 입력

        console.log('📝 입고 정보 입력 완료: 수량 3개, 단가 15,000원');

        // 7. 입고 처리 버튼 클릭 (저장 버튼)
        await page.click('button:has-text("저장")');
        console.log('✅ 재고 입고 처리 완료');

        // 6. 잠시 대기 (API 처리 시간)
        await page.waitForTimeout(3000);

        // 7. 출납장부 페이지로 이동
        await page.goto('http://localhost:8081/ko/cashbook');
        await page.waitForSelector('h1');
        console.log('✅ 출납장부 페이지 로드');

        // 8. 페이지 새로고침하여 최신 데이터 확인
        await page.reload();
        await page.waitForTimeout(2000);

        // 9. 최근 거래에서 입고 기록 확인
        const cashbookRows = page.locator('tbody tr');
        const rowCount = await cashbookRows.count();
        console.log('📊 출납장부 총 거래 수:', rowCount);

        // 10. 입고 관련 거래 찾기
        let foundInboundTransaction = false;
        for (let i = 0; i < Math.min(rowCount, 10); i++) {
            const row = cashbookRows.nth(i);
            const description = await row.locator('td').nth(2).textContent();
            const type = await row.locator('td').nth(1).textContent();
            const amount = await row.locator('td').nth(3).textContent();

            console.log(`거래 ${i + 1}: ${type} - ${description} - ${amount}`);

            if (description && description.includes('상품 입고')) {
                foundInboundTransaction = true;
                console.log('✅ 출납장부에서 입고 거래 발견!');
                console.log(`   - 거래 유형: ${type}`);
                console.log(`   - 설명: ${description}`);
                console.log(`   - 금액: ${amount}`);

                // 거래 유형이 '지출'인지 확인
                if (type && type.includes('지출')) {
                    console.log('✅ 거래 유형이 지출로 올바르게 기록됨');
                } else {
                    console.log('❌ 거래 유형이 지출이 아님:', type);
                }

                // 금액이 올바른지 확인 (3개 × 15,000원 = 45,000원)
                if (amount && amount.includes('45,000')) {
                    console.log('✅ 입고 금액이 올바르게 기록됨 (45,000원)');
                } else {
                    console.log('❌ 입고 금액이 예상과 다름:', amount);
                }
                break;
            }
        }

        if (!foundInboundTransaction) {
            console.log('❌ 출납장부에서 입고 거래를 찾을 수 없음');
            console.log('📸 현재 출납장부 상태 스크린샷 저장');
            await page.screenshot({ path: 'cashbook-no-inbound-transaction.png' });
        }

        // 11. 최종 스크린샷 저장
        await page.screenshot({ path: 'manual-inventory-cashbook-test-result.png' });

        console.log('🎉 수동 재고 입고 및 출납장부 연동 테스트 완료!');

        // 테스트 결과 검증
        expect(foundInboundTransaction).toBe(true);
    });
});
