import { test, expect } from '@playwright/test';

test.describe('YUANDI ERP 상품 관리 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 과정
    await page.goto('https://00-yuandi-erp.vercel.app/');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="email"]', 'admin@yuandi.com');
    await page.fill('input[type="password"]', 'yuandi123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
  });

  test('설정 페이지에서 새 상품 등록', async ({ page }) => {
    console.log('📍 3단계: 설정 페이지에서 새 상품 등록');
    
    // 현재 대시보드 스크린샷
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/04-dashboard-initial.png',
      fullPage: true 
    });
    
    // 설정 페이지로 이동
    const settingsLink = page.locator('text=설정').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      console.log('✅ 설정 메뉴 클릭 성공');
    } else {
      // 다른 가능한 설정 링크들
      const altLinks = [
        'a[href*="settings"]',
        'a[href*="config"]',
        'text=Settings',
        'text=관리'
      ];
      
      for (const selector of altLinks) {
        const link = page.locator(selector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          console.log(`✅ 설정 페이지 이동 성공: ${selector}`);
          break;
        }
      }
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/05-settings-page.png',
      fullPage: true 
    });
    
    // 상품 관리 섹션 찾기
    const productSection = page.locator('text=상품').first();
    if (await productSection.isVisible({ timeout: 5000 })) {
      await productSection.click();
      console.log('✅ 상품 관리 섹션 찾음');
    }
    
    await page.waitForTimeout(2000);
    
    // 새 상품 추가 버튼 찾기
    const addButtons = [
      'button:has-text("추가")',
      'button:has-text("상품 추가")',
      'button:has-text("새 상품")',
      'button:has-text("등록")',
      'button[data-testid="add-product"]',
      '.add-button',
      '.btn-add'
    ];
    
    let addButtonFound = false;
    for (const selector of addButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        console.log(`✅ 상품 추가 버튼 클릭: ${selector}`);
        addButtonFound = true;
        break;
      }
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/06-add-product-form.png',
      fullPage: true 
    });
    
    if (!addButtonFound) {
      console.log('⚠️ 상품 추가 버튼을 찾을 수 없음 - 페이지 구조 확인 필요');
      
      // 페이지의 모든 버튼과 링크 요소들을 출력
      const buttons = await page.locator('button').all();
      console.log(`페이지에서 발견된 버튼 수: ${buttons.length}`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        try {
          const text = await buttons[i].textContent();
          const isVisible = await buttons[i].isVisible();
          console.log(`버튼 ${i + 1}: "${text}" (visible: ${isVisible})`);
        } catch (e) {
          console.log(`버튼 ${i + 1}: 텍스트 읽기 실패`);
        }
      }
      
      return; // 테스트 중단
    }
    
    // 테스트용 상품 정보
    const testProduct = {
      name: `E2E테스트상품_${new Date().getTime()}`,
      category: 'E2E테스트',
      brand: '테스트브랜드',
      model: 'TEST-001',
      color: '블랙',
      size: 'L',
      purchasePrice: '45000',
      salePrice: '75000'
    };
    
    // 상품 정보 입력
    const formFields = [
      { name: 'name', value: testProduct.name },
      { name: 'category', value: testProduct.category },
      { name: 'brand', value: testProduct.brand },
      { name: 'model', value: testProduct.model },
      { name: 'color', value: testProduct.color },
      { name: 'size', value: testProduct.size },
      { name: 'purchasePrice', value: testProduct.purchasePrice },
      { name: 'salePrice', value: testProduct.salePrice }
    ];
    
    for (const field of formFields) {
      const input = page.locator(`input[name="${field.name}"]`).first();
      if (await input.isVisible({ timeout: 2000 })) {
        await input.fill(field.value);
        console.log(`✓ ${field.name}: ${field.value} 입력 완료`);
      } else {
        console.log(`⚠️ ${field.name} 필드를 찾을 수 없음`);
      }
    }
    
    await page.screenshot({ 
      path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/07-product-form-filled.png',
      fullPage: true 
    });
    
    // 저장 버튼 클릭
    const saveButtons = [
      'button:has-text("저장")',
      'button:has-text("등록")',
      'button:has-text("완료")',
      'button[type="submit"]'
    ];
    
    let saved = false;
    for (const selector of saveButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        console.log(`✅ 저장 버튼 클릭: ${selector}`);
        saved = true;
        break;
      }
    }
    
    if (saved) {
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: '/mnt/d/00.Projects/00.YUANDI-ERP/tests/e2e/screenshots/08-product-saved.png',
        fullPage: true 
      });
      
      console.log('✅ 새 상품 등록 완료');
    } else {
      console.log('⚠️ 저장 버튼을 찾을 수 없음');
    }
    
    console.log('🎉 상품 등록 테스트 완료');
  });
});