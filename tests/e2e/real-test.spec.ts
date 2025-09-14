import { test, expect } from '@playwright/test';

test.describe('실제 동작 검증 테스트', () => {
  test('로그인 후 재고 페이지 실제 접근 확인', async ({ page }) => {
    console.log('🚀 실제 동작 검증 시작\n');

    // 1. 로그인 페이지로 직접 이동
    console.log('📍 1단계: 로그인');
    await page.goto('http://localhost:8081/login');
    await page.waitForLoadState('networkidle');

    // 로그인 폼이 있는지 확인
    const emailInput = await page.locator('input#email').count();
    if (emailInput === 0) {
      console.log('❌ 로그인 폼을 찾을 수 없음');
      expect(false).toBeTruthy();
      return;
    }

    // 로그인 수행
    await page.fill('input#email', 'admin@yuandi.com');
    await page.fill('input#password', 'yuandi123!');
    await page.click('button[type="submit"]');
    console.log('  - 로그인 정보 제출');

    // 로그인 후 리다이렉트 대기
    await page.waitForTimeout(5000);
    console.log(`  - 로그인 후 URL: ${page.url()}\n`);

    // 2. 재고 페이지로 이동 시도
    console.log('📍 2단계: 재고 페이지 이동');
    await page.goto('http://localhost:8081/ko/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`  - 현재 URL: ${currentUrl}`);

    // 3. 실제로 재고 페이지에 있는지 검증
    console.log('\n📍 3단계: 페이지 검증');

    // 로그인 페이지로 리다이렉트되었는지 확인
    if (currentUrl.includes('login')) {
      console.log('❌ 로그인 페이지로 리다이렉트됨 - 로그인 실패');

      // 로그인 버튼이 있는지 확인
      const loginButton = await page.locator('button:has-text("로그인")').count();
      console.log(`  - 로그인 버튼 존재: ${loginButton > 0 ? '예' : '아니오'}`);

      expect(false).toBeTruthy();
      return;
    }

    // 재고 페이지인지 확인
    const isInventoryPage = currentUrl.includes('inventory');
    console.log(`  - 재고 페이지 여부: ${isInventoryPage ? '✅' : '❌'}`);

    // 4. 재고 페이지 요소 확인
    console.log('\n📍 4단계: 재고 페이지 요소 확인');

    // 재고 관련 버튼 확인
    const inboundButton = await page.locator('button:has-text("재고 입고")').count();
    const adjustButton = await page.locator('button:has-text("재고 수정")').count();
    const loginButtonOnPage = await page.locator('button:has-text("로그인")').count();

    console.log(`  - 재고 입고 버튼: ${inboundButton > 0 ? '✅ 있음' : '❌ 없음'}`);
    console.log(`  - 재고 수정 버튼: ${adjustButton > 0 ? '✅ 있음' : '❌ 없음'}`);
    console.log(`  - 로그인 버튼: ${loginButtonOnPage > 0 ? '⚠️ 있음 (비정상)' : '✅ 없음 (정상)'}`);

    // 테이블 확인
    const table = await page.locator('table').count();
    const tbody = await page.locator('tbody').count();
    const rows = await page.locator('tbody tr').count();

    console.log(`\n  - 테이블 존재: ${table > 0 ? '✅' : '❌'}`);
    console.log(`  - tbody 존재: ${tbody > 0 ? '✅' : '❌'}`);
    console.log(`  - 데이터 행 수: ${rows}개`);

    // 5. 페이지 콘텐츠 디버깅
    console.log('\n📍 5단계: 페이지 콘텐츠 분석');

    // 페이지 제목
    const pageTitle = await page.title();
    console.log(`  - 페이지 타이틀: ${pageTitle}`);

    // h1, h2 확인
    const headings = await page.locator('h1, h2').all();
    if (headings.length > 0) {
      const firstHeading = await headings[0].textContent();
      console.log(`  - 메인 제목: ${firstHeading?.trim()}`);
    }

    // 모든 버튼 텍스트
    const allButtons = await page.locator('button:visible').all();
    console.log(`\n  - 페이지의 모든 버튼 (${allButtons.length}개):`);
    for (let i = 0; i < Math.min(5, allButtons.length); i++) {
      const text = await allButtons[i].textContent();
      console.log(`    ${i + 1}. "${text?.trim()}"`);
    }

    // 6. 최종 판정
    console.log('\n🎯 최종 판정');

    const testSuccess =
      isInventoryPage &&
      (inboundButton > 0 || adjustButton > 0) &&
      loginButtonOnPage === 0;

    if (testSuccess) {
      console.log('✅ 테스트 성공: 재고 페이지에 정상적으로 접근했습니다');
      expect(true).toBeTruthy();
    } else {
      console.log('❌ 테스트 실패: 재고 페이지 접근에 실패했습니다');
      console.log('  - 가능한 원인:');
      console.log('    1. 로그인이 제대로 되지 않음');
      console.log('    2. 세션이 유지되지 않음');
      console.log('    3. 권한 문제');
      expect(false).toBeTruthy();
    }
  });
});