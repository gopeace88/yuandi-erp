import { test, expect } from '@playwright/test';

test.describe('재고 관리 페이지 디버깅', () => {
    test('재고 관리 페이지의 버튼들을 확인', async ({ page }) => {
        console.log('🚀 재고 관리 페이지 디버깅 시작');

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

        // 3. 페이지의 모든 버튼 찾기
        const buttons = await page.locator('button').all();
        console.log(`📊 총 ${buttons.length}개의 버튼 발견`);

        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const text = await button.textContent();
            const isVisible = await button.isVisible();
            console.log(`버튼 ${i + 1}: "${text}" (보임: ${isVisible})`);
        }

        // 4. 재고 입고 관련 버튼 찾기
        const inboundButtons = page.locator('button:has-text("재고 입고")');
        const inboundButtonCount = await inboundButtons.count();
        console.log(`📦 "재고 입고" 텍스트를 포함한 버튼: ${inboundButtonCount}개`);

        const plusButtons = page.locator('button:has-text("+")');
        const plusButtonCount = await plusButtons.count();
        console.log(`➕ "+" 텍스트를 포함한 버튼: ${plusButtonCount}개`);

        // 5. 페이지 상단의 버튼들 확인
        const headerButtons = page.locator('div:has(h1) button');
        const headerButtonCount = await headerButtons.count();
        console.log(`🔝 헤더 영역의 버튼: ${headerButtonCount}개`);

        for (let i = 0; i < headerButtonCount; i++) {
            const button = headerButtons.nth(i);
            const text = await button.textContent();
            console.log(`헤더 버튼 ${i + 1}: "${text}"`);
        }

        // 6. 스크린샷 저장
        await page.screenshot({ path: 'debug-inventory-page.png' });

        console.log('🎉 디버깅 완료!');
    });
});

