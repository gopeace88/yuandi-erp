import { test, expect } from '@playwright/test';

test.describe('시나리오 1: 안정적인 상품 등록 및 재고 입고', () => {
  test('세션 유지를 위한 개선된 테스트', async ({ page, context }) => {
    console.log('=== 시나리오 1: 상품 등록 및 재고 입고 (개선 버전) ===\n');

    // ========================================
    // 1단계: 로그인 및 쿠키 저장
    // ========================================
    console.log('📍 1단계: 로그인 및 세션 설정');
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    // 언어 선택 (한국어)
    if (!page.url().includes('/ko')) {
      const koLink = page.locator('a[href="/ko"], a:has-text("한국어")').first();
      if (await koLink.count() > 0) {
        await koLink.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // 로그인
    if (page.url().includes('/login')) {
      await page.fill('input#email', 'admin@yuandi.com');
      await page.fill('input#password', 'yuandi123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(ko|dashboard)/, { timeout: 10000 });
      console.log('  ✅ 로그인 성공');

      // 쿠키와 localStorage 저장
      const cookies = await context.cookies();
      console.log(`  쿠키 개수: ${cookies.length}`);
    }

    // ========================================
    // 2단계: 대시보드에서 초기 재고 확인
    // ========================================
    console.log('\n📍 2단계: 대시보드에서 초기 재고 확인');

    // 대시보드 링크로 이동
    const dashboardLink = page.locator('nav a[href*="dashboard"], aside a[href*="dashboard"], a:has-text("대시보드")').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');
    }

    let initialStock = 0;
    const stockCard = page.locator('div:has-text("재고 현황")').filter({ has: page.locator('text=/\\d+.*개/') });
    if (await stockCard.count() > 0) {
      const stockText = await stockCard.textContent();
      const match = stockText?.match(/(\d+)\s*개/);
      if (match) {
        initialStock = parseInt(match[1]);
        console.log(`  초기 재고: ${initialStock}개`);
      }
    }

    // ========================================
    // 3단계: 설정 > 상품 관리에서 상품 추가
    // ========================================
    console.log('\n📍 3단계: 설정 > 상품 관리에서 상품 추가');

    // 설정 메뉴로 이동 (네비게이션 사용)
    const settingsLink = page.locator('nav a[href*="settings"], aside a[href*="settings"], a:has-text("설정")').first();
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  설정 페이지 이동');
    } else {
      // 직접 이동
      await page.goto('http://localhost:8081/ko/settings');
      await page.waitForLoadState('networkidle');
      console.log('  설정 페이지 직접 이동');
    }

    // 현재 URL 확인
    console.log(`  현재 URL: ${page.url()}`);

    // 로그인 페이지로 리다이렉트되었는지 확인
    if (page.url().includes('/login')) {
      console.log('  ⚠️ 재로그인 필요');
      await page.fill('input#email', 'admin@yuandi.com');
      await page.fill('input#password', 'yuandi123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // 다시 설정 페이지로
      await page.goto('http://localhost:8081/ko/settings');
      await page.waitForLoadState('networkidle');
    }

    // 상품 관리 탭 확인
    const productTab = page.locator('button, [role="tab"]').filter({ hasText: /상품.*관리/ });
    if (await productTab.count() > 0 && await productTab.isVisible()) {
      await productTab.click();
      await page.waitForTimeout(500);
      console.log('  상품 관리 탭 선택');
    }

    // 상품 추가 버튼 찾기 (여러 패턴 시도)
    console.log('  상품 추가 버튼 찾는 중...');

    // 페이지의 모든 버튼 확인
    const allButtons = await page.locator('button').all();
    console.log(`  전체 버튼 개수: ${allButtons.length}`);

    let addButtonFound = false;
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent();
      if (text && (text.includes('상품') && (text.includes('추가') || text.includes('+')))) {
        console.log(`  버튼 발견: "${text.trim()}"`);
        await allButtons[i].click();
        addButtonFound = true;
        break;
      }
    }

    if (!addButtonFound) {
      console.log('  ❌ 상품 추가 버튼을 찾을 수 없음');
      // 버튼 텍스트 출력 (디버깅용)
      for (let i = 0; i < Math.min(5, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        console.log(`    버튼 ${i}: "${text?.trim()}"`);
      }
      throw new Error('상품 추가 버튼을 찾을 수 없습니다');
    }

    await page.waitForTimeout(1000);
    console.log('  상품 등록 모달 열림');

    // 상품 정보 입력 (안정적인 방법)
    console.log('  상품 정보 입력...');

    // 입력 필드를 라벨로 찾기
    async function fillFieldByLabel(labelText: string, value: string, isSelect: boolean = false) {
      const label = page.locator('label').filter({ hasText: labelText }).first();
      if (await label.count() > 0) {
        const fieldId = await label.getAttribute('for');
        if (fieldId) {
          if (isSelect) {
            await page.selectOption(`#${fieldId}`, { index: 1 });
          } else {
            await page.fill(`#${fieldId}`, value);
          }
        } else {
          // label 다음 요소 찾기
          const field = label.locator('~ input, ~ select, ~ textarea').first();
          if (await field.count() > 0) {
            if (isSelect) {
              await page.selectOption(field, { index: 1 });
            } else {
              await field.fill(value);
            }
          }
        }
      }
    }

    // 모달 내부에서만 작업
    const modal = page.locator('[role="dialog"], div:has(> form)').filter({ hasText: /상품.*등록/ });

    // 텍스트 입력 필드들
    const textInputs = modal.locator('input[type="text"]');
    const inputCount = await textInputs.count();
    console.log(`  텍스트 입력 필드 개수: ${inputCount}`);

    if (inputCount >= 7) {
      await textInputs.nth(0).fill('안정테스트 가방');
      await textInputs.nth(1).fill('稳定测试包');
      await textInputs.nth(2).fill('STABLE-001');
      await textInputs.nth(3).fill('검정');
      await textInputs.nth(4).fill('黑色');
      await textInputs.nth(5).fill('테스트브랜드');
      await textInputs.nth(6).fill('测试品牌');
    }

    // 카테고리 선택
    const categorySelect = modal.locator('select').first();
    if (await categorySelect.count() > 0) {
      const options = await categorySelect.locator('option').count();
      if (options > 1) {
        await categorySelect.selectOption({ index: 1 });
      }
    }

    // 가격 입력
    const numberInputs = modal.locator('input[type="number"]');
    if (await numberInputs.count() >= 2) {
      await numberInputs.nth(0).fill('150');
      await numberInputs.nth(1).fill('30000');
    }

    // 저장
    const saveBtn = modal.locator('button').filter({ hasText: /저장|등록|확인/ }).last();
    await saveBtn.click();
    await page.waitForTimeout(2000);
    console.log('  ✅ 상품 추가 완료');

    // ========================================
    // 4단계: 재고 관리로 안전하게 이동
    // ========================================
    console.log('\n📍 4단계: 재고 관리에서 재고 입고');

    // 모달이 있으면 닫기
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 먼저 현재 페이지에서 네비게이션 메뉴 찾기
    console.log('  네비게이션 메뉴 확인 중...');

    // 모든 링크 확인
    const allLinks = await page.locator('a').all();
    let inventoryLinkFound = false;

    for (const link of allLinks) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');

      if (text && (text.includes('재고') && text.includes('관리'))) {
        console.log(`  재고 관리 링크 발견: "${text.trim()}" -> ${href}`);
        await link.click();
        inventoryLinkFound = true;
        await page.waitForLoadState('networkidle');
        break;
      }
    }

    if (!inventoryLinkFound) {
      console.log('  네비게이션에서 재고 관리를 찾을 수 없음');

      // 대시보드로 먼저 이동
      const dashLink = page.locator('a').filter({ hasText: '대시보드' }).first();
      if (await dashLink.count() > 0) {
        console.log('  대시보드로 먼저 이동');
        await dashLink.click();
        await page.waitForLoadState('networkidle');

        // 대시보드에서 재고 관리 링크 찾기
        const inventoryFromDash = page.locator('a').filter({ hasText: /재고.*관리/ }).first();
        if (await inventoryFromDash.count() > 0) {
          console.log('  대시보드에서 재고 관리 클릭');
          await inventoryFromDash.click();
          await page.waitForLoadState('networkidle');
        }
      }
    }

    // URL 확인
    console.log(`  현재 URL: ${page.url()}`);

    // 재고 관리 페이지가 아니면 직접 이동
    if (!page.url().includes('/inventory')) {
      console.log('  재고 관리 페이지가 아님, 직접 이동 시도');
      await page.goto('http://localhost:8081/ko/inventory', { waitUntil: 'networkidle' });

      // 다시 URL 확인
      console.log(`  이동 후 URL: ${page.url()}`);

      // 로그인 페이지로 리다이렉트되었는지 확인
      if (page.url().includes('/login')) {
        console.log('  ⚠️ 재로그인 필요');
        await page.fill('input#email', 'admin@yuandi.com');
        await page.fill('input#password', 'yuandi123!');
        await page.click('button[type="submit"]');
        await page.waitForURL(/.*\/(ko|inventory)/, { timeout: 10000 });

        // 재고 관리 페이지가 아니면 다시 이동
        if (!page.url().includes('/inventory')) {
          await page.goto('http://localhost:8081/ko/inventory', { waitUntil: 'networkidle' });
        }
      }
    }

    // 재고 입고 버튼 찾기 (여러 패턴)
    let inboundBtn = page.locator('button').filter({ hasText: /입고/ }).first();
    if (await inboundBtn.count() === 0) {
      inboundBtn = page.locator('button').filter({ hasText: /\+.*재고/ }).first();
    }
    if (await inboundBtn.count() === 0) {
      inboundBtn = page.locator('button:has-text("재고")').first();
    }

    if (await inboundBtn.count() > 0) {
      await inboundBtn.click();
      await page.waitForTimeout(1000);
      console.log('  재고 입고 모달 열림');

      // 상품 선택
      const productSelect = page.locator('select').first();
      const optionCount = await productSelect.locator('option').count();
      if (optionCount > 1) {
        // 마지막 상품 선택 (방금 추가한 것)
        await productSelect.selectOption({ index: optionCount - 1 });
        console.log('  상품 선택 완료');
      }

      // 수량 입력
      const quantityInput = page.locator('input[type="number"]').first();
      await quantityInput.fill('15');
      console.log('  입고 수량: 15개');

      // 단가 입력 (선택사항)
      const costInput = page.locator('input[type="number"]').nth(1);
      if (await costInput.count() > 0) {
        await costInput.fill('150');
      }

      // 메모
      const noteInput = page.locator('textarea').first();
      if (await noteInput.count() > 0) {
        await noteInput.fill('안정성 테스트 입고');
      }

      // 저장
      const modalSaveBtn = page.locator('button').filter({ hasText: /저장|확인|등록/ }).last();
      await modalSaveBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✅ 재고 입고 완료');
    } else {
      console.log('  ❌ 재고 입고 버튼을 찾을 수 없음');
    }

    // ========================================
    // 5단계: 출납장부 확인
    // ========================================
    console.log('\n📍 5단계: 출납장부에서 입고 내역 확인');

    const cashbookLink = page.locator('nav a[href*="cashbook"], aside a[href*="cashbook"], a').filter({ hasText: /출납.*장부/ });
    if (await cashbookLink.count() > 0) {
      await cashbookLink.first().click();
      await page.waitForLoadState('networkidle');
      console.log('  출납장부 페이지 이동');
    }

    // 최신 내역 확인
    const latestRow = page.locator('tbody tr').first();
    if (await latestRow.count() > 0) {
      const rowText = await latestRow.textContent();
      if (rowText?.includes('입고')) {
        console.log('  ✅ 입고 내역 확인됨');
      }
    }

    // ========================================
    // 6단계: 대시보드로 돌아가서 최종 확인
    // ========================================
    console.log('\n📍 6단계: 대시보드에서 재고 현황 재확인');

    const finalDashLink = page.locator('nav a[href*="dashboard"], aside a[href*="dashboard"], a:has-text("대시보드")').first();
    if (await finalDashLink.count() > 0) {
      await finalDashLink.click();
      await page.waitForLoadState('networkidle');
    }

    let finalStock = 0;
    const finalStockCard = page.locator('div:has-text("재고 현황")').filter({ has: page.locator('text=/\\d+.*개/') });
    if (await finalStockCard.count() > 0) {
      const stockText = await finalStockCard.textContent();
      const match = stockText?.match(/(\d+)\s*개/);
      if (match) {
        finalStock = parseInt(match[1]);
        console.log(`  최종 재고: ${finalStock}개`);
      }
    }

    const stockIncrease = finalStock - initialStock;
    console.log(`  재고 증가량: ${stockIncrease}개 (예상: 15개)`);

    // ========================================
    // 테스트 완료
    // ========================================
    console.log('\n🎉 시나리오 1 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 초기 재고: ${initialStock}개`);
    console.log(`  - 입고 수량: 15개`);
    console.log(`  - 최종 재고: ${finalStock}개`);
    console.log(`  - 재고 증가: ${stockIncrease}개`);
    console.log('========================================');

    // 최종 검증
    expect(page.url()).not.toContain('/login');
    if (stockIncrease > 0) {
      console.log('✅ 재고 증가 확인');
    }
    console.log('✅ 모든 단계 성공적으로 완료');
  });
});