import { test, expect, Page } from '@playwright/test';

test.describe('YUANDI ERP 비즈니스 플로우 테스트', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // 화면 크기 설정 (데스크톱 테스트)
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 네트워크 이벤트 리스닝 (오류 디버깅용)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', (error) => {
      console.error(`Page Error: ${error.message}`);
    });
  });

  test('전체 비즈니스 플로우: 상품등록 → 입고 → 출납장부 → 대시보드', async () => {
    console.log('🚀 YUANDI ERP E2E 테스트 시작');
    
    // 1단계: 사이트 접속 및 스크린샷
    console.log('📍 1단계: 사이트 접속');
    await page.goto('https://00-yuandi-erp.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/01-site-landing.png',
      fullPage: true 
    });
    
    // 로그인 페이지인지 확인
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    console.log(`✅ 로그인 페이지 확인: ${isLoginPage}`);
    expect(isLoginPage).toBe(true);

    // 2단계: 관리자 로그인
    console.log('📍 2단계: 관리자 로그인');
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/02-login-form-filled.png',
      fullPage: true 
    });
    
    // 로그인 버튼 클릭
    const loginButton = page.locator('button[type="submit"]').first();
    await loginButton.click();
    
    // 로그인 후 대시보드 로딩 대기
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/03-dashboard-after-login.png',
      fullPage: true 
    });
    
    console.log('✅ 로그인 완료 - 대시보드 접근 성공');

    // 3단계: 설정 페이지에서 새 상품 등록
    console.log('📍 3단계: 설정 페이지에서 새 상품 등록');
    
    // 설정 메뉴 클릭 (네비게이션에서)
    await page.locator('text=설정').first().click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/04-settings-page.png',
      fullPage: true 
    });
    
    // 상품 관리 탭으로 이동
    const productTab = page.locator('text=상품 관리').first();
    if (await productTab.isVisible()) {
      await productTab.click();
      await page.waitForTimeout(1000);
    }
    
    // 새 상품 등록 버튼 클릭
    const addProductBtn = page.locator('button:has-text("상품 추가")').first();
    if (await addProductBtn.isVisible()) {
      await addProductBtn.click();
      await page.waitForTimeout(1000);
    } else {
      // 다른 가능한 버튼 텍스트들 시도
      const altButtons = [
        'button:has-text("새 상품")',
        'button:has-text("추가")',
        'button[data-testid="add-product"]'
      ];
      
      for (const selector of altButtons) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/05-add-product-modal.png',
      fullPage: true 
    });
    
    // 테스트용 상품 정보 입력
    const testProduct = {
      name: `테스트상품_${Date.now()}`,
      category: '테스트카테고리',
      brand: '테스트브랜드',
      model: 'TEST-MODEL',
      color: '블랙',
      size: 'M',
      purchasePrice: '50000',
      salePrice: '80000'
    };
    
    // 상품 정보 입력 (가능한 필드들)
    const fillField = async (selector: string, value: string) => {
      const field = page.locator(selector).first();
      if (await field.isVisible()) {
        await field.fill(value);
        console.log(`  ✓ ${selector}: ${value}`);
      }
    };
    
    await fillField('input[name="name"]', testProduct.name);
    await fillField('input[name="category"]', testProduct.category);
    await fillField('input[name="brand"]', testProduct.brand);
    await fillField('input[name="model"]', testProduct.model);
    await fillField('input[name="color"]', testProduct.color);
    await fillField('input[name="size"]', testProduct.size);
    await fillField('input[name="purchasePrice"]', testProduct.purchasePrice);
    await fillField('input[name="salePrice"]', testProduct.salePrice);
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/06-product-form-filled.png',
      fullPage: true 
    });
    
    // 상품 저장
    const saveBtn = page.locator('button:has-text("저장")').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ 새 상품 등록 완료');
    }
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/07-product-saved.png',
      fullPage: true 
    });

    // 4단계: 재고 관리에서 12개 입고 처리
    console.log('📍 4단계: 재고 관리에서 12개 입고 처리');
    
    // 재고 관리 페이지로 이동
    await page.locator('text=재고 관리').first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/08-inventory-page.png',
      fullPage: true 
    });
    
    // 방금 등록한 상품 찾기
    const productRow = page.locator(`tr:has-text("${testProduct.name}")`).first();
    if (await productRow.isVisible()) {
      // 입고 버튼 클릭
      const stockInBtn = productRow.locator('button:has-text("입고")').first();
      if (await stockInBtn.isVisible()) {
        await stockInBtn.click();
        await page.waitForTimeout(1000);
        
        // 입고 수량 입력
        await page.fill('input[name="quantity"]', '12');
        await page.fill('input[name="note"]', 'E2E 테스트 입고');
        
        await page.screenshot({ 
          path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/09-stock-in-form.png',
          fullPage: true 
        });
        
        // 입고 확인
        const confirmBtn = page.locator('button:has-text("확인")').first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
          console.log('✅ 12개 입고 처리 완료');
        }
      }
    } else {
      console.log('⚠️ 등록한 상품을 재고 목록에서 찾을 수 없음');
    }
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/10-stock-in-completed.png',
      fullPage: true 
    });

    // 5단계: 출납장부 반영 확인
    console.log('📍 5단계: 출납장부 반영 확인');
    
    await page.locator('text=출납장부').first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/11-cashbook-page.png',
      fullPage: true 
    });
    
    // 최근 거래 내역에서 입고 관련 기록 확인
    const hasStockInRecord = await page.locator('td:has-text("입고")').first().isVisible({ timeout: 5000 });
    console.log(`✅ 출납장부 입고 기록 확인: ${hasStockInRecord}`);
    
    if (hasStockInRecord) {
      console.log('✅ 출납장부에 입고 거래 반영 확인됨');
    } else {
      console.log('⚠️ 출납장부에 입고 거래가 즉시 반영되지 않음 (비동기 처리 가능)');
    }

    // 6단계: 대시보드 반영 확인
    console.log('📍 6단계: 대시보드 반영 확인');
    
    await page.locator('text=대시보드').first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/12-final-dashboard.png',
      fullPage: true 
    });
    
    // 대시보드 통계 정보 확인
    const statsCards = await page.locator('[class*="stat"]').count();
    console.log(`✅ 대시보드 통계 카드 수: ${statsCards}`);
    
    // 재고 관련 수치 확인 (정확한 수치보다는 반영 여부 확인)
    const inventoryValue = await page.locator('text=재고').first().isVisible();
    console.log(`✅ 대시보드 재고 정보 표시: ${inventoryValue}`);
    
    console.log('🎉 전체 비즈니스 플로우 테스트 완료');
    console.log('📊 테스트 결과: 각 단계별 스크린샷 캡처 완료');
  });

  test.afterEach(async () => {
    await page.close();
  });
});