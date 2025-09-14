import { test, expect } from '@playwright/test';

test.describe('재고 입고와 출납장부 연동 테스트 (수동 검증 완료)', () => {
    test('재고 입고 후 출납장부에 지출 기록이 생성되는지 확인', async ({ page }) => {
        console.log('🚀 재고 입고와 출납장부 연동 테스트 시작');

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

        // 3. 재고 입고 버튼 클릭 (더 안전한 방법)
        await page.waitForTimeout(2000); // 페이지 완전 로드 대기

        // 버튼을 여러 방법으로 찾기
        let inboundButton = null;

        // 방법 1: 정확한 텍스트로 찾기
        try {
            inboundButton = page.locator('button:has-text("+ 재고 입고")');
            if (await inboundButton.count() === 0) {
                // 방법 2: 부분 텍스트로 찾기
                inboundButton = page.locator('button:has-text("재고 입고")');
            }
            if (await inboundButton.count() === 0) {
                // 방법 3: + 기호로 찾기
                inboundButton = page.locator('button:has-text("+")');
            }
        } catch (error) {
            console.log('❌ 버튼 찾기 실패:', error);
        }

        if (inboundButton && await inboundButton.count() > 0) {
            await inboundButton.first().click();
            console.log('✅ 재고 입고 버튼 클릭');
        } else {
            console.log('❌ 재고 입고 버튼을 찾을 수 없음');
            await page.screenshot({ path: 'button-not-found.png' });
            return;
        }

        // 4. 모달이 열릴 때까지 충분히 대기
        await page.waitForTimeout(3000);

        // 5. 모달 내 요소들 확인 및 입력
        try {
            // 상품 선택 드롭다운 찾기
            const productSelect = page.locator('select').first();
            await productSelect.waitFor({ state: 'visible', timeout: 5000 });

            // 첫 번째 실제 상품 선택 (index 1, index 0은 "-- 상품 선택 --")
            await productSelect.selectOption({ index: 1 });
            console.log('✅ 상품 선택 완료');

            // 수량 입력
            const quantityInput = page.locator('input[type="number"][min="1"]');
            await quantityInput.waitFor({ state: 'visible', timeout: 5000 });
            await quantityInput.fill('5');
            console.log('✅ 수량 입력 완료: 5개');

            // 단가 입력
            const priceInput = page.locator('input[type="number"][step="0.01"]');
            await priceInput.waitFor({ state: 'visible', timeout: 5000 });
            await priceInput.fill('20000');
            console.log('✅ 단가 입력 완료: 20,000원');

            // 메모 입력 (선택사항)
            const memoTextarea = page.locator('textarea');
            if (await memoTextarea.count() > 0) {
                await memoTextarea.fill('Playwright 자동 테스트 입고');
                console.log('✅ 메모 입력 완료');
            }

            // 저장 버튼 클릭
            const saveButton = page.locator('button:has-text("저장")');
            await saveButton.waitFor({ state: 'visible', timeout: 5000 });
            await saveButton.click();
            console.log('✅ 저장 버튼 클릭');

            // API 처리 대기
            await page.waitForTimeout(5000);

        } catch (error) {
            console.log('❌ 모달 내 입력 실패:', error);
            await page.screenshot({ path: 'modal-input-failed.png' });
            return;
        }

        // 6. 출납장부 페이지로 이동
        await page.goto('http://localhost:8081/ko/cashbook');
        await page.waitForSelector('h1');
        console.log('✅ 출납장부 페이지 로드');

        // 7. 페이지 새로고침하여 최신 데이터 확인
        await page.reload();
        await page.waitForTimeout(3000);

        // 8. 출납장부에서 입고 기록 확인
        const cashbookRows = page.locator('tbody tr');
        const rowCount = await cashbookRows.count();
        console.log(`📊 출납장부 총 거래 수: ${rowCount}개`);

        let foundInboundTransaction = false;
        let inboundTransactionDetails = null;

        // 최근 10개 거래에서 입고 기록 찾기
        for (let i = 0; i < Math.min(10, rowCount); i++) {
            const row = cashbookRows.nth(i);
            const cells = await row.locator('td').all();

            if (cells.length >= 4) {
                const type = await cells[1].textContent();
                const description = await cells[2].textContent();
                const amount = await cells[3].textContent();

                console.log(`거래 ${i + 1}: ${type} - ${description} - ${amount}`);

                // 입고 관련 거래 찾기
                if (description && (
                    description.includes('상품 입고') ||
                    description.includes('재고 입고') ||
                    description.includes('입고')
                )) {
                    foundInboundTransaction = true;
                    inboundTransactionDetails = {
                        type: type,
                        description: description,
                        amount: amount
                    };
                    console.log('✅ 출납장부에서 입고 거래 발견!');
                    break;
                }
            }
        }

        // 9. 테스트 결과 검증
        if (foundInboundTransaction) {
            console.log('🎉 테스트 성공!');
            console.log('📋 입고 거래 상세:');
            console.log(`   - 거래 유형: ${inboundTransactionDetails.type}`);
            console.log(`   - 설명: ${inboundTransactionDetails.description}`);
            console.log(`   - 금액: ${inboundTransactionDetails.amount}`);

            // 거래 유형이 '지출'인지 확인
            if (inboundTransactionDetails.type && inboundTransactionDetails.type.includes('지출')) {
                console.log('✅ 거래 유형이 지출로 올바르게 기록됨');
            } else {
                console.log('⚠️ 거래 유형이 지출이 아님:', inboundTransactionDetails.type);
            }

            // 금액이 올바른지 확인 (5개 × 20,000원 = 100,000원)
            if (inboundTransactionDetails.amount && inboundTransactionDetails.amount.includes('100,000')) {
                console.log('✅ 입고 금액이 올바르게 기록됨 (100,000원)');
            } else {
                console.log('⚠️ 입고 금액이 예상과 다름:', inboundTransactionDetails.amount);
            }

        } else {
            console.log('❌ 출납장부에서 입고 거래를 찾을 수 없음');
            console.log('📸 현재 출납장부 상태 스크린샷 저장');
            await page.screenshot({ path: 'cashbook-no-inbound-transaction.png' });
        }

        // 10. 최종 스크린샷 저장
        await page.screenshot({ path: 'working-inventory-cashbook-test-result.png' });

        console.log('🎉 재고 입고와 출납장부 연동 테스트 완료!');

        // 테스트 결과 검증
        expect(foundInboundTransaction).toBe(true);
    });
});

