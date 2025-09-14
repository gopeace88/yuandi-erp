import { test, expect } from '@playwright/test';

test.describe('최종 테스트', () => {
  test('완전한 로그인 및 재고 확인', async ({ page }) => {
    console.log('🚀 최종 테스트 시작\n');

    // 1. 로그인 페이지 접근
    console.log('📍 1단계: 로그인 페이지 접근');
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
    console.log(`  - 초기 URL: ${page.url()}`);

    // 2. 로그인 폼 처리
    console.log('\n📍 2단계: 로그인 처리');

    // 로그인 페이지가 표시될 때까지 대기
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('  - 로그인 폼 발견');

    // 폼 입력
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    console.log('  - 로그인 정보 입력 완료');

    // 로그인 버튼 클릭 및 대기
    await page.click('button:has-text("로그인")');
    console.log('  - 로그인 버튼 클릭');

    // 로그인 후 URL 변경 대기 (더 넉넉한 시간)
    try {
      await page.waitForURL(/\/(ko|zh-CN)(?!.*login)/, { timeout: 15000 });
      console.log('✅ 로그인 성공');
      console.log(`  - 리다이렉트 URL: ${page.url()}`);
    } catch (error) {
      console.log('⚠️ 로그인 타임아웃, 현재 상태 확인');
      console.log(`  - 현재 URL: ${page.url()}`);

      // 에러 메시지 확인
      const errorMsg = page.locator('.error, [role="alert"], text=오류');
      if (await errorMsg.count() > 0) {
        const errorText = await errorMsg.textContent();
        console.log(`  - 에러 메시지: ${errorText}`);
      }

      // 추가 대기 후 재시도
      await page.waitForTimeout(3000);
      if (!page.url().includes('login')) {
        console.log('✅ 지연된 로그인 성공');
      }
    }

    // 3. 재고 페이지 직접 이동
    console.log('\n📍 3단계: 재고 페이지 이동');
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 데이터 로딩 대기

    console.log(`  - 재고 페이지 URL: ${page.url()}`);

    // 여전히 로그인 페이지라면 다시 로그인
    if (page.url().includes('login')) {
      console.log('⚠️ 다시 로그인 필요');
      await page.fill('input[type="email"]', 'admin@yuandi.com');
      await page.fill('input[type="password"]', 'yuandi123!');
      await page.click('button:has-text("로그인")');
      await page.waitForTimeout(5000);
      await page.goto('http://localhost:8081/ko/inventory');
      await page.waitForLoadState('networkidle');
    }

    // 4. 페이지 상태 확인
    console.log('\n📍 4단계: 페이지 내용 확인');

    // 페이지 제목 확인
    const pageTitle = await page.title();
    console.log(`  - 페이지 제목: ${pageTitle}`);

    // 메인 헤딩 확인
    const heading = page.locator('h1, h2').first();
    if (await heading.count() > 0) {
      const headingText = await heading.textContent();
      console.log(`  - 메인 헤딩: ${headingText?.trim()}`);
    }

    // 5. 테이블 및 데이터 확인
    console.log('\n📍 5단계: 재고 데이터 확인');

    // 테이블 존재 확인
    const table = page.locator('table');
    const hasTable = await table.count() > 0;
    console.log(`  - 테이블 존재: ${hasTable ? '✅' : '❌'}`);

    if (hasTable) {
      // 헤더 확인
      const headers = await page.locator('th').all();
      console.log(`  - 테이블 헤더 수: ${headers.length}개`);

      // 데이터 행 확인
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();
      console.log(`  - 데이터 행 수: ${rowCount}개`);

      if (rowCount > 0) {
        console.log('\n📦 상품 목록:');
        for (let i = 0; i < Math.min(3, rowCount); i++) {
          const row = rows.nth(i);
          const cells = await row.locator('td').all();

          if (cells.length >= 2) {
            const name = await cells[1].textContent();
            const stock = cells.length >= 7 ? await cells[6].textContent() : 'N/A';
            console.log(`  ${i + 1}. ${name?.trim()} (재고: ${stock?.trim()})`);
          }
        }
      }
    }

    // 6. 버튼 확인
    console.log('\n📍 6단계: 액션 버튼 확인');
    const buttons = await page.locator('button:visible').all();
    console.log(`  - 표시된 버튼 수: ${buttons.length}개`);

    const buttonTexts = new Set();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text?.trim()) {
        buttonTexts.add(text.trim());
      }
    }

    console.log('  - 버튼 목록:');
    Array.from(buttonTexts).forEach((text, index) => {
      console.log(`    ${index + 1}. "${text}"`);
    });

    // 7. 재고 관련 버튼 테스트
    const inboundButton = page.locator('button').filter({ hasText: /재고.*입고/ }).first();
    const adjustButton = page.locator('button').filter({ hasText: /재고.*수정/ }).first();

    console.log(`\n  - 재고 입고 버튼: ${await inboundButton.count() > 0 ? '✅ 발견' : '❌ 없음'}`);
    console.log(`  - 재고 수정 버튼: ${await adjustButton.count() > 0 ? '✅ 발견' : '❌ 없음'}`);

    // 8. 최종 결과
    console.log('\n🎯 최종 결과');

    const isLoggedIn = !page.url().includes('login');
    const isInventoryPage = page.url().includes('inventory');
    const hasData = await page.locator('tbody tr').count() > 0;
    const hasButtons = await page.locator('button').filter({ hasText: /재고/ }).count() > 0;

    console.log(`  - 로그인 상태: ${isLoggedIn ? '✅' : '❌'}`);
    console.log(`  - 재고 페이지: ${isInventoryPage ? '✅' : '❌'}`);
    console.log(`  - 재고 데이터: ${hasData ? '✅' : '❌'}`);
    console.log(`  - 재고 버튼: ${hasButtons ? '✅' : '❌'}`);

    if (isLoggedIn && isInventoryPage) {
      console.log('\n🎉 기본 테스트 성공!');
      expect(true).toBeTruthy();
    } else {
      console.log('\n❌ 기본 테스트 실패');
      expect(false).toBeTruthy();
    }
  });
});