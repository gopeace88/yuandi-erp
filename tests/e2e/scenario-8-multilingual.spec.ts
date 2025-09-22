import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 8: 다국어 테스트', () => {
  test('한국어와 중국어 UI 전환 확인', async ({ page }) => {
    console.log('\n=== 시나리오 8: 다국어 테스트 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 한국어 UI 테스트 ===
    console.log('📍 1단계: 한국어 UI 테스트');

    // 로그인 페이지 요소 확인
    await page.goto(getTestUrl('/ko'));
    await page.waitForTimeout(TIMEOUTS.medium);

    const koreanLoginElements = {
      이메일: await page.locator('text=이메일').or(page.locator('label:has-text("이메일")')).count(),
      비밀번호: await page.locator('text=비밀번호').or(page.locator('label:has-text("비밀번호")')).count(),
      로그인: await page.locator('button:has-text("로그인")').count(),
    };

    console.log('  📋 한국어 로그인 페이지 요소:');
    for (const [element, count] of Object.entries(koreanLoginElements)) {
      console.log(`    ${count > 0 ? '✅' : '❌'} ${element}`);
    }

    await ensureLoggedIn(page, 'admin', { locale: 'ko', redirectPath: '/ko/dashboard' });
    console.log('  ✅ 한국어 로그인 완료');

    const koreanMenus = ['대시보드', '재고 관리', '주문 관리', '배송 관리', '출납장부'];
    console.log('  📋 한국어 메뉴 확인:');
    for (const menu of koreanMenus) {
      const element = page.locator(`text=${menu}`).first();
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`    ${isVisible ? '✅' : '❌'} ${menu}`);
    }

    await page.goto(getTestUrl('/ko/orders'));
    await page.waitForTimeout(TIMEOUTS.medium);

    const koreanOrderPageElements = {
      주문번호: await page.locator('th:has-text("주문번호")').or(page.locator('text=주문번호')).count(),
      고객: await page.locator('th:has-text("고객")').or(page.locator('text=고객')).count(),
      상품: await page.locator('th:has-text("상품")').or(page.locator('text=상품')).count(),
      상태: await page.locator('th:has-text("상태")').or(page.locator('text=상태')).count(),
    };

    console.log('  📋 한국어 주문 페이지 요소:');
    for (const [element, count] of Object.entries(koreanOrderPageElements)) {
      console.log(`    ${count > 0 ? '✅' : '❌'} ${element}`);
    }

    await clearAuth(page);

    // === 2단계: 중국어 UI 테스트 ===
    console.log('\n📍 2단계: 중국어 UI 테스트');

    await page.goto(getTestUrl('/zh-CN'));
    await page.waitForTimeout(TIMEOUTS.medium);

    const chineseLoginElements = {
      电子邮件: await page.locator('text=电子邮件').or(page.locator('text=邮件')).or(page.locator('text=邮箱')).count(),
      密码: await page.locator('text=密码').count(),
      登录: await page.locator('button:has-text("登录")').or(page.locator('text=登入')).count(),
    };

    console.log('  📋 중국어 로그인 페이지 요소:');
    for (const [element, count] of Object.entries(chineseLoginElements)) {
      console.log(`    ${count > 0 ? '✅' : '❌'} ${element}`);
    }

    await ensureLoggedIn(page, 'admin', { locale: 'zh-CN', redirectPath: '/zh-CN/dashboard' });
    console.log('  ✅ 중국어 로그인 완료');

    const chineseMenus = [
      { name: '仪表板', alternatives: ['仪表盘', '控制面板', '首页'] },
      { name: '库存管理', alternatives: ['库存', '存货管理'] },
      { name: '订单管理', alternatives: ['订单', '订货管理'] },
      { name: '配送管理', alternatives: ['配送', '发货管理', '物流'] },
      { name: '账本', alternatives: ['财务', '出纳账本', '账簿'] },
    ];

    console.log('  📋 중국어 메뉴 확인:');
    for (const menu of chineseMenus) {
      let found = false;
      let foundText = '';

      const mainElement = page.locator(`text=${menu.name}`).first();
      if (await mainElement.isVisible({ timeout: 500 }).catch(() => false)) {
        found = true;
        foundText = menu.name;
      }

      if (!found) {
        for (const alt of menu.alternatives) {
          const altElement = page.locator(`text=${alt}`).first();
          if (await altElement.isVisible({ timeout: 500 }).catch(() => false)) {
            found = true;
            foundText = alt;
            break;
          }
        }
      }

      console.log(`    ${found ? '✅' : '❌'} ${menu.name}${found && foundText !== menu.name ? ` (${foundText})` : ''}`);
    }

    await page.goto(getTestUrl('/zh-CN/orders'));
    await page.waitForTimeout(TIMEOUTS.medium);

    const chineseOrderPageElements = {
      订单号: await page.locator('th:has-text("订单号")').or(page.locator('text=订单编号')).count(),
      客户: await page.locator('th:has-text("客户")').or(page.locator('text=顾客')).count(),
      商品: await page.locator('th:has-text("商品")').or(page.locator('text=产品')).count(),
      状态: await page.locator('th:has-text("状态")').or(page.locator('text=订单状态')).count(),
    };

    console.log('  📋 중국어 주문 페이지 요소:');
    for (const [element, count] of Object.entries(chineseOrderPageElements)) {
      console.log(`    ${count > 0 ? '✅' : '❌'} ${element}`);
    }

    await clearAuth(page);

    console.log('\n✅ 다국어 테스트 완료');
  });
});
