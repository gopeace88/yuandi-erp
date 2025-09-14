import { test, expect } from '@playwright/test';

test.describe('재고 데이터 확인 테스트', () => {
  test('로그인 후 재고 데이터 상세 확인', async ({ page }) => {
    console.log('=== 재고 데이터 확인 테스트 시작 ===\n');

    // 1. 로그인
    console.log('📍 1단계: 로그인');
    await page.goto('http://localhost:8081/ko');
    await page.waitForLoadState('networkidle');

    // 로그인 페이지로 리다이렉트되면 로그인
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', 'admin@yuandi.com');
      await page.fill('input[type="password"]', 'yuandi123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(ko|zh-CN)/, { timeout: 10000 });
      console.log('✅ 로그인 성공');
    } else {
      console.log('✅ 이미 로그인된 상태');
    }
    console.log(`  - 현재 URL: ${page.url()}\n`);

    // 2. 재고 페이지로 이동
    console.log('📍 2단계: 재고 관리 페이지 이동');
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 데이터 로드 대기

    // 3. 페이지 제목 확인
    const pageTitle = await page.title();
    console.log(`  - 페이지 타이틀: ${pageTitle}`);

    const heading = page.locator('h1, h2').first();
    if (await heading.count() > 0) {
      const headingText = await heading.textContent();
      console.log(`  - 페이지 제목: ${headingText}\n`);
    }

    // 4. 테이블 데이터 확인
    console.log('📊 테이블 데이터 확인');

    // 테이블이 로드될 때까지 대기
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {
      console.log('  ⚠️ 테이블을 찾을 수 없음');
    });

    // tbody의 행 수 확인
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`  - 테이블 행 수: ${rowCount}개\n`);

    if (rowCount > 0) {
      console.log('📋 상품 목록 (처음 5개):');
      for (let i = 0; i < Math.min(5, rowCount); i++) {
        const row = rows.nth(i);
        const cells = await row.locator('td').all();

        if (cells.length >= 9) {
          const data = {
            date: await cells[0].textContent(),
            name: await cells[1].textContent(),
            model: await cells[2].textContent(),
            brand: await cells[3].textContent(),
            color: await cells[4].textContent(),
            category: await cells[5].textContent(),
            stock: await cells[6].textContent(),
            costCny: await cells[7].textContent(),
            priceKrw: await cells[8].textContent()
          };

          console.log(`\n  상품 ${i + 1}:`);
          console.log(`    - 이름: ${data.name?.trim()}`);
          console.log(`    - 모델: ${data.model?.trim()}`);
          console.log(`    - 브랜드: ${data.brand?.trim()}`);
          console.log(`    - 재고: ${data.stock?.trim()}`);
          console.log(`    - 판매가: ${data.priceKrw?.trim()}`);
        }
      }
      console.log('');
    } else {
      console.log('  ❌ 테이블에 데이터가 없음\n');
    }

    // 5. 버튼 확인
    console.log('🔍 페이지 버튼 확인');
    const buttons = await page.locator('button:visible').all();
    const buttonTexts = new Set();

    for (const button of buttons) {
      const text = await button.textContent();
      if (text?.trim()) {
        buttonTexts.add(text.trim());
      }
    }

    console.log(`  - 총 버튼 수: ${buttons.length}개`);
    console.log('  - 버튼 목록:');
    Array.from(buttonTexts).forEach(text => {
      console.log(`    • "${text}"`);
    });

    // 6. 재고 입고 버튼 테스트
    console.log('\n📦 재고 입고 버튼 동작 테스트');
    const inboundButton = page.locator('button').filter({ hasText: /재고.*입고/ }).first();

    if (await inboundButton.count() > 0 && await inboundButton.isVisible()) {
      console.log('  - 재고 입고 버튼 발견');

      // 모달이 있으면 먼저 닫기
      const existingModal = page.locator('[role="dialog"]');
      if (await existingModal.count() > 0 && await existingModal.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        console.log('  - 기존 모달 닫기');
      }

      // 버튼 클릭
      await inboundButton.click();
      console.log('  - 재고 입고 버튼 클릭');

      // 모달 열림 확인
      try {
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        console.log('  ✅ 입고 모달 열림 성공');

        // 모달 내용 확인
        const modalTitle = page.locator('[role="dialog"] h2, [role="dialog"] h3').first();
        if (await modalTitle.count() > 0) {
          const titleText = await modalTitle.textContent();
          console.log(`  - 모달 제목: ${titleText?.trim()}`);
        }

        // 입력 필드 확인
        const inputs = await page.locator('[role="dialog"] input').count();
        const textareas = await page.locator('[role="dialog"] textarea').count();
        const selects = await page.locator('[role="dialog"] select').count();

        console.log(`  - 입력 필드: ${inputs}개 input, ${textareas}개 textarea, ${selects}개 select`);

        // 모달 닫기
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        console.log('  - 모달 닫기');

      } catch (error) {
        console.log('  ❌ 모달이 열리지 않음');
      }
    } else {
      console.log('  ⚠️ 재고 입고 버튼을 찾을 수 없음');
    }

    // 7. 재고 수정 버튼 테스트
    console.log('\n📝 재고 수정 버튼 동작 테스트');
    const adjustButton = page.locator('button').filter({ hasText: /재고.*수정/ }).first();

    if (await adjustButton.count() > 0 && await adjustButton.isVisible()) {
      console.log('  - 재고 수정 버튼 발견');

      // 모달이 있으면 먼저 닫기
      const existingModal = page.locator('[role="dialog"]');
      if (await existingModal.count() > 0 && await existingModal.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      await adjustButton.click();
      console.log('  - 재고 수정 버튼 클릭');

      try {
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        console.log('  ✅ 수정 모달 열림 성공');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

      } catch (error) {
        console.log('  ❌ 모달이 열리지 않음');
      }
    } else {
      console.log('  ⚠️ 재고 수정 버튼을 찾을 수 없음');
    }

    console.log('\n🎉 재고 데이터 확인 테스트 완료!');

    // 검증
    expect(rowCount).toBeGreaterThan(0);
    console.log('\n✅ 재고 데이터가 존재함을 확인');
  });
});