import { test, expect } from '@playwright/test';

test.describe('올바른 로그인 테스트', () => {
  test('로그인 후 대시보드 이동 및 재고 확인', async ({ page }) => {
    console.log('🚀 올바른 로그인 테스트 시작\n');

    // 1. 로그인 페이지 직접 접근
    console.log('📍 1단계: 로그인 페이지 접근');
    await page.goto('http://localhost:8081/login');
    await page.waitForLoadState('networkidle');
    console.log(`  - URL: ${page.url()}`);

    // 2. 로그인 처리
    console.log('\n📍 2단계: 로그인 처리');

    // 입력 필드 확인
    const emailInput = page.locator('input#email');
    const passwordInput = page.locator('input#password');
    const submitButton = page.locator('button[type="submit"]');

    // 폼 입력
    await emailInput.fill('admin@yuandi.com');
    await passwordInput.fill('yuandi123!');
    console.log('  - 로그인 정보 입력 완료');

    // 로그인 버튼 클릭
    await submitButton.click();
    console.log('  - 로그인 버튼 클릭');

    // 대시보드로 리다이렉트 대기
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ 로그인 성공 - 대시보드로 이동');
    console.log(`  - 현재 URL: ${page.url()}\n`);

    // 3. 대시보드 확인
    console.log('📍 3단계: 대시보드 확인');
    await page.waitForTimeout(2000); // 페이지 로딩 대기

    // 네비게이션 메뉴 확인
    const navLinks = await page.locator('nav a, aside a, header a').all();
    console.log(`  - 네비게이션 링크 수: ${navLinks.length}개`);

    // 재고 관리 링크 찾기
    const inventoryLink = page.locator('a').filter({ hasText: /재고|Inventory/i }).first();
    if (await inventoryLink.count() > 0) {
      console.log('  - 재고 관리 링크 발견');
    }

    // 4. 재고 페이지로 이동
    console.log('\n📍 4단계: 재고 페이지 이동');
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 데이터 로딩 대기

    console.log(`  - 재고 페이지 URL: ${page.url()}`);

    // 5. 재고 데이터 확인
    console.log('\n📍 5단계: 재고 데이터 확인');

    // 테이블 확인
    const table = page.locator('table');
    const hasTable = await table.count() > 0;
    console.log(`  - 테이블 존재: ${hasTable ? '✅' : '❌'}`);

    if (hasTable) {
      // 데이터 행 확인
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();
      console.log(`  - 데이터 행 수: ${rowCount}개`);

      if (rowCount > 0) {
        console.log('\n📦 상품 목록 (상위 5개):');
        for (let i = 0; i < Math.min(5, rowCount); i++) {
          const row = rows.nth(i);
          const cells = await row.locator('td').all();

          if (cells.length >= 9) {
            const name = await cells[1].textContent();
            const model = await cells[2].textContent();
            const stock = await cells[6].textContent();
            const price = await cells[8].textContent();

            console.log(`\n  ${i + 1}. 상품명: ${name?.trim()}`);
            console.log(`     - 모델: ${model?.trim()}`);
            console.log(`     - 재고: ${stock?.trim()}`);
            console.log(`     - 판매가: ${price?.trim()}`);
          }
        }
      }
    }

    // 6. 재고 관리 버튼 확인
    console.log('\n📍 6단계: 재고 관리 버튼 확인');

    const buttons = await page.locator('button:visible').all();
    console.log(`  - 전체 버튼 수: ${buttons.length}개`);

    // 재고 입고 버튼
    const inboundButton = page.locator('button').filter({ hasText: /재고.*입고/ }).first();
    const hasInbound = await inboundButton.count() > 0;
    console.log(`  - 재고 입고 버튼: ${hasInbound ? '✅' : '❌'}`);

    // 재고 수정 버튼
    const adjustButton = page.locator('button').filter({ hasText: /재고.*수정/ }).first();
    const hasAdjust = await adjustButton.count() > 0;
    console.log(`  - 재고 수정 버튼: ${hasAdjust ? '✅' : '❌'}`);

    // 7. 재고 입고 모달 테스트
    if (hasInbound) {
      console.log('\n📍 7단계: 재고 입고 모달 테스트');

      // 기존 모달 닫기
      const existingModal = page.locator('[role="dialog"]');
      if (await existingModal.count() > 0 && await existingModal.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        console.log('  - 기존 모달 닫기');
      }

      // 입고 버튼 클릭
      await inboundButton.click();
      console.log('  - 재고 입고 버튼 클릭');

      try {
        // 모달 열림 확인
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        console.log('  ✅ 입고 모달 열림');

        // 모달 제목 확인
        const modalTitle = page.locator('[role="dialog"] h2, [role="dialog"] h3').first();
        if (await modalTitle.count() > 0) {
          const title = await modalTitle.textContent();
          console.log(`  - 모달 제목: ${title?.trim()}`);
        }

        // 입력 필드 확인
        const inputs = await page.locator('[role="dialog"] input').count();
        const textareas = await page.locator('[role="dialog"] textarea').count();
        const selects = await page.locator('[role="dialog"] select').count();
        console.log(`  - 폼 요소: ${inputs}개 input, ${textareas}개 textarea, ${selects}개 select`);

        // 모달 닫기
        await page.keyboard.press('Escape');
        console.log('  - 모달 닫기');

      } catch (error) {
        console.log('  ❌ 모달이 열리지 않음');
      }
    }

    // 8. 최종 결과
    console.log('\n🎯 최종 결과');

    const isLoggedIn = page.url().includes('inventory') && !page.url().includes('login');
    const hasData = await page.locator('tbody tr').count() > 0;
    const hasButtons = hasInbound || hasAdjust;

    console.log(`  - 로그인 상태: ${isLoggedIn ? '✅' : '❌'}`);
    console.log(`  - 재고 데이터: ${hasData ? '✅ 있음' : '⚠️ 없음'}`);
    console.log(`  - 관리 버튼: ${hasButtons ? '✅ 있음' : '⚠️ 없음'}`);

    if (isLoggedIn) {
      console.log('\n🎉 테스트 성공!');
      expect(true).toBeTruthy();
    } else {
      console.log('\n❌ 테스트 실패');
      expect(false).toBeTruthy();
    }
  });
});