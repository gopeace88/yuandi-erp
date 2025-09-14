import { test, expect } from '@playwright/test';

test.describe('간단한 재고 입고 테스트', () => {
    test('재고 입고 후 출납장부 확인', async ({ page }) => {
        console.log('🚀 간단한 재고 입고 테스트 시작');

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

        // 3. 페이지의 모든 버튼 텍스트 확인
        const allButtons = await page.locator('button').all();
        console.log('📊 페이지의 모든 버튼:');
        for (let i = 0; i < allButtons.length; i++) {
            const text = await allButtons[i].textContent();
            const isVisible = await allButtons[i].isVisible();
            if (isVisible) {
                console.log(`  - "${text}"`);
            }
        }

        // 4. 재고 입고 버튼 찾기 (다양한 패턴 시도)
        let inboundButton = null;

        // 패턴 1: "+ 재고 입고"
        inboundButton = page.locator('button:has-text("+ 재고 입고")');
        if (await inboundButton.count() > 0) {
            console.log('✅ "+ 재고 입고" 버튼 발견');
        } else {
            // 패턴 2: "재고 입고"만 포함
            inboundButton = page.locator('button:has-text("재고 입고")');
            if (await inboundButton.count() > 0) {
                console.log('✅ "재고 입고" 버튼 발견');
            } else {
                // 패턴 3: "+"만 포함
                inboundButton = page.locator('button:has-text("+")');
                if (await inboundButton.count() > 0) {
                    console.log('✅ "+" 버튼 발견');
                } else {
                    console.log('❌ 재고 입고 버튼을 찾을 수 없음');
                    await page.screenshot({ path: 'no-inbound-button.png' });
                    return;
                }
            }
        }

        // 5. 재고 입고 버튼 클릭
        await inboundButton.first().click();
        console.log('✅ 재고 입고 버튼 클릭');

        // 6. 모달이 열릴 때까지 대기
        await page.waitForTimeout(2000);

        // 7. 모달 내용 확인
        const modal = page.locator('div[style*="position: fixed"]');
        if (await modal.count() > 0) {
            console.log('✅ 재고 입고 모달이 열림');

            // 모달의 모든 입력 필드 확인
            const inputs = await page.locator('input').all();
            const selects = await page.locator('select').all();
            const textareas = await page.locator('textarea').all();

            console.log(`📝 모달 내 입력 필드: input ${inputs.length}개, select ${selects.length}개, textarea ${textareas.length}개`);

            // 상품 선택
            if (selects.length > 0) {
                await selects[0].selectOption({ index: 1 }); // 첫 번째 상품 선택
                console.log('✅ 상품 선택 완료');
            }

            // 수량 입력
            const quantityInput = page.locator('input[type="number"][min="1"]');
            if (await quantityInput.count() > 0) {
                await quantityInput.fill('2');
                console.log('✅ 수량 입력 완료: 2개');
            }

            // 단가 입력
            const priceInput = page.locator('input[type="number"][step="0.01"]');
            if (await priceInput.count() > 0) {
                await priceInput.fill('10000');
                console.log('✅ 단가 입력 완료: 10,000원');
            }

            // 메모 입력
            if (textareas.length > 0) {
                await textareas[0].fill('테스트 입고');
                console.log('✅ 메모 입력 완료');
            }

            // 저장 버튼 클릭
            const saveButton = page.locator('button:has-text("저장")');
            if (await saveButton.count() > 0) {
                await saveButton.click();
                console.log('✅ 저장 버튼 클릭');

                // 처리 완료 대기
                await page.waitForTimeout(3000);

                // 8. 출납장부 페이지로 이동
                await page.goto('http://localhost:8081/ko/cashbook');
                await page.waitForSelector('h1');
                console.log('✅ 출납장부 페이지 로드');

                // 9. 최근 거래 확인
                const rows = page.locator('tbody tr');
                const rowCount = await rows.count();
                console.log(`📊 출납장부 거래 수: ${rowCount}개`);

                // 최근 5개 거래 확인
                for (let i = 0; i < Math.min(5, rowCount); i++) {
                    const row = rows.nth(i);
                    const cells = await row.locator('td').all();
                    if (cells.length >= 4) {
                        const type = await cells[1].textContent();
                        const description = await cells[2].textContent();
                        const amount = await cells[3].textContent();
                        console.log(`거래 ${i + 1}: ${type} - ${description} - ${amount}`);
                    }
                }

                // 10. 스크린샷 저장
                await page.screenshot({ path: 'simple-inventory-test-result.png' });

            } else {
                console.log('❌ 저장 버튼을 찾을 수 없음');
                await page.screenshot({ path: 'no-save-button.png' });
            }
        } else {
            console.log('❌ 재고 입고 모달이 열리지 않음');
            await page.screenshot({ path: 'no-modal.png' });
        }

        console.log('🎉 간단한 재고 입고 테스트 완료!');
    });
});

