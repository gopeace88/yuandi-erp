import { test, expect } from '@playwright/test';

test.describe('로그인 테스트', () => {
  test('로그인 프로세스 상세 확인', async ({ page }) => {
    console.log('=== 로그인 테스트 시작 ===\n');

    // 1. 초기 페이지 접속
    console.log('📍 1단계: 초기 페이지 접속');
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
    console.log(`  - 현재 URL: ${page.url()}`);

    // 2. 로그인 페이지 확인
    if (page.url().includes('/login')) {
      console.log('✅ 로그인 페이지로 리다이렉트됨\n');

      console.log('📍 2단계: 로그인 폼 확인');

      // 폼 요소 확인
      const emailInput = page.locator('input#email, input[type="email"]').first();
      const passwordInput = page.locator('input#password, input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      console.log(`  - 이메일 입력: ${await emailInput.count() > 0 ? '✅' : '❌'}`);
      console.log(`  - 비밀번호 입력: ${await passwordInput.count() > 0 ? '✅' : '❌'}`);
      console.log(`  - 제출 버튼: ${await submitButton.count() > 0 ? '✅' : '❌'}\n`);

      // 3. 로그인 정보 입력
      console.log('📍 3단계: 로그인 정보 입력');
      await emailInput.fill('admin@yuandi.com');
      console.log('  - 이메일 입력 완료');

      await passwordInput.fill('yuandi123!');
      console.log('  - 비밀번호 입력 완료\n');

      // 4. 로그인 시도
      console.log('📍 4단계: 로그인 시도');
      await submitButton.click();
      console.log('  - 로그인 버튼 클릭');

      // 5. 로그인 결과 대기
      console.log('  - 로그인 처리 대기중...');

      // 여러 가능성 체크
      try {
        // 성공: 대시보드나 메인 페이지로 이동
        await page.waitForURL(/\/(ko|zh-CN|dashboard|inventory)/, { timeout: 10000 });
        console.log('✅ 로그인 성공!');
        console.log(`  - 이동된 URL: ${page.url()}\n`);
      } catch {
        // 실패: 에러 메시지 확인
        console.log('❌ 로그인 실패 또는 지연');
        console.log(`  - 현재 URL: ${page.url()}`);

        // 에러 메시지 확인
        const errorMessages = [
          page.locator('text=Invalid'),
          page.locator('text=잘못된'),
          page.locator('text=실패'),
          page.locator('.error'),
          page.locator('[role="alert"]')
        ];

        for (const error of errorMessages) {
          if (await error.count() > 0 && await error.isVisible()) {
            const errorText = await error.textContent();
            console.log(`  - 에러 메시지: ${errorText}\n`);
            break;
          }
        }
      }
    } else if (page.url().includes('/ko')) {
      console.log('✅ 이미 로그인된 상태 (한국어 페이지)\n');
    } else if (page.url().includes('/zh-CN')) {
      console.log('✅ 이미 로그인된 상태 (중국어 페이지)\n');
    }

    // 6. 로그인 후 페이지 확인
    console.log('📍 5단계: 로그인 후 페이지 확인');
    await page.waitForTimeout(2000);

    // 네비게이션 메뉴 확인
    const navMenus = [
      '대시보드', '주문 관리', '배송 관리', '재고 관리', '출납장',
      'Dashboard', 'Orders', 'Shipping', 'Inventory', 'Cashbook'
    ];

    let foundMenus = [];
    for (const menu of navMenus) {
      const menuItem = page.locator(`text="${menu}"`).first();
      if (await menuItem.count() > 0 && await menuItem.isVisible()) {
        foundMenus.push(menu);
      }
    }

    if (foundMenus.length > 0) {
      console.log('✅ 로그인 확인 - 메뉴 발견:');
      foundMenus.forEach(menu => console.log(`  - ${menu}`));
    } else {
      console.log('⚠️ 메뉴를 찾을 수 없음 - 로그인 상태 불확실');
    }

    // 7. 사용자 정보 확인
    console.log('\n📍 6단계: 사용자 정보 확인');
    const userInfo = page.locator('text=admin').first();
    if (await userInfo.count() > 0 && await userInfo.isVisible()) {
      console.log('✅ 사용자 정보 표시: admin');
    }

    // 로그아웃 버튼 확인
    const logoutButton = page.locator('button:has-text("로그아웃"), button:has-text("Logout")').first();
    if (await logoutButton.count() > 0) {
      console.log('✅ 로그아웃 버튼 발견');
    }

    console.log('\n🎉 로그인 테스트 완료!');
    console.log(`최종 URL: ${page.url()}`);

    // 검증
    const finalUrl = page.url();
    const isLoggedIn = !finalUrl.includes('/login') &&
                       (finalUrl.includes('/ko') || finalUrl.includes('/zh-CN') ||
                        finalUrl.includes('/dashboard') || finalUrl.includes('/inventory'));

    expect(isLoggedIn).toBeTruthy();
    console.log('\n✅ 로그인 상태 검증 통과');
  });
});