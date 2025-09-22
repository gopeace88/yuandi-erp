import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 0: 상품 등록', () => {
  test('신규 상품 등록 플로우', async ({ page }) => {
    console.log('\n=== 시나리오 0: 상품 등록 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 로그인 및 세션 설정 ===
    console.log('📍 1단계: 로그인 및 세션 설정');
    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    console.log('  ✅ 로그인 완료');

    // === 2단계: 대시보드에서 초기 재고 확인 ===
    console.log('\n📍 2단계: 대시보드에서 초기 재고 확인');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');

    const inventoryCard = page.locator('.grid .bg-white').filter({ hasText: /재고/ });
    const inventoryText = await inventoryCard.textContent();
    const initialStock = parseInt(inventoryText?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
    console.log(`  - 현재 총 재고: ${initialStock.toLocaleString()}개`);

    // === 3단계: 설정 페이지에서 상품 추가 ===
    console.log('\n📍 3단계: 설정 페이지에서 상품 추가');

    // 설정 페이지 이동
    await page.goto(getTestUrl('/ko/settings'));
    await page.waitForLoadState('networkidle');
    console.log('  - 설정 페이지 이동');

    // 상품 관리 탭 클릭
    const productTab = page.locator('button[role="tab"]').filter({ hasText: /상품.*관리/i });
    if (await productTab.count() > 0) {
      await productTab.click();
      await page.waitForTimeout(TIMEOUTS.short);
      console.log('  - 상품 관리 탭 선택');
    }

    // 상품 추가 버튼 찾기
    const addProductButton = page
      .locator('button')
      .filter({ hasText: /추가|새.*상품|Add.*Product/i })
      .or(page.locator('[data-testid="add-product-button"]'))
      .first();

    await addProductButton.click();
    await page.waitForTimeout(TIMEOUTS.short);
    console.log('  - 상품 추가 모달 열림');

    // === 4단계: 상품 정보 입력 ===
    console.log('\n📍 4단계: 상품 정보 입력');

    // 테스트용 고유 상품명 생성
    const timestamp = Date.now();
    const productName = `테스트 상품 ${timestamp}`;
    const productNameZh = `测试产品 ${timestamp}`;

    // 카테고리 선택 (첫 번째 카테고리)
    const categorySelect = page.locator('select').filter({ hasText: /카테고리|Category/i }).first();
    if (await categorySelect.count() === 0) {
      // select가 없으면 일반 드롭다운 찾기
      const categoryDropdown = page.locator('[data-testid*="category"], [id*="category"]').first();
      await categoryDropdown.click();
      const firstOption = page.locator('[role="option"], [data-value]').first();
      await firstOption.click();
      console.log('  - 카테고리 선택 (드롭다운)');
    } else {
      const options = await categorySelect.locator('option').all();
      if (options.length > 1) {
        await categorySelect.selectOption({ index: 1 });
        console.log('  - 카테고리 선택 (select)');
      }
    }

    // 상품명 입력 (한국어/중국어)
    const nameInputKo = page.locator('input[name*="name_ko"], input[placeholder*="한글"], input[placeholder*="상품명"]').first();
    const nameInputZh = page.locator('input[name*="name_zh"], input[placeholder*="중문"], input[placeholder*="中文"]').first();

    await nameInputKo.fill(productName);
    await nameInputZh.fill(productNameZh);
    console.log(`  - 상품명 입력: ${productName}`);

    // 모델명, 색상, 브랜드 입력
    const modelInput = page.locator('input[name*="model"], input[placeholder*="모델"]').first();
    const colorInput = page.locator('input[name*="color"], input[placeholder*="색상"]').first();
    const brandInput = page.locator('input[name*="brand"], input[placeholder*="브랜드"]').first();

    await modelInput.fill(`MODEL-${timestamp}`);
    await colorInput.fill('블랙');
    await brandInput.fill('TEST BRAND');
    console.log('  - 모델명, 색상, 브랜드 입력 완료');

    // 가격 정보 입력
    const costInput = page.locator('input[name*="cost"], input[placeholder*="원가"]').first();
    const priceInput = page.locator('input[name*="price"], input[placeholder*="판매가"]').first();

    await costInput.fill('500');  // 500 CNY
    await priceInput.fill('100000');  // 100,000 KRW
    console.log('  - 원가: 500 CNY, 판매가: 100,000 KRW');

    // 초기 재고 입력
    const stockInput = page.locator('input[name*="stock"], input[name*="on_hand"], input[placeholder*="재고"]').first();
    await stockInput.fill('50');
    console.log('  - 초기 재고: 50개');

    // === 5단계: 상품 저장 ===
    console.log('\n📍 5단계: 상품 저장');

    const saveButton = page
      .locator('button')
      .filter({ hasText: /저장|추가|등록|Save/i })
      .last();

    // API 응답 확인을 위한 Promise
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/products') && response.status() === 200,
      { timeout: TIMEOUTS.navigation }
    ).catch(() => null);

    await saveButton.click();
    console.log('  - 저장 버튼 클릭');

    // 응답 대기
    const response = await responsePromise;
    if (response) {
      console.log('  ✅ 상품 등록 API 응답 성공');
    }

    // 모달이 닫힐 때까지 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // === 6단계: 등록 확인 ===
    console.log('\n📍 6단계: 상품 등록 확인');

    // 재고 관리 페이지로 이동
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForLoadState('networkidle');

    // 검색창에 상품명 입력
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill(productName);
    await page.waitForTimeout(TIMEOUTS.short);

    // 검색 결과 확인
    const productRow = page.locator('tr', { hasText: productName });
    const isProductFound = await productRow.count() > 0;

    if (isProductFound) {
      console.log('  ✅ 상품이 재고 목록에서 확인됨');

      // 상품 정보 확인
      const rowText = await productRow.textContent();
      console.log(`  - 등록된 상품 정보: ${rowText?.substring(0, 100)}...`);

      // 재고 수량 확인
      const stockCell = productRow.locator('td').filter({ hasText: /50/ });
      if (await stockCell.count() > 0) {
        console.log('  ✅ 초기 재고 50개 확인');
      }
    } else {
      console.log('  ❌ 상품이 재고 목록에서 찾을 수 없음');
    }

    // === 7단계: 대시보드에서 재고 변화 확인 ===
    console.log('\n📍 7단계: 대시보드에서 재고 변화 확인');
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');

    const finalInventoryCard = page.locator('.grid .bg-white').filter({ hasText: /재고/ });
    const finalInventoryText = await finalInventoryCard.textContent();
    const finalStock = parseInt(finalInventoryText?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
    const stockIncrease = finalStock - initialStock;

    console.log(`  - 최종 총 재고: ${finalStock.toLocaleString()}개`);
    console.log(`  - 재고 증가량: ${stockIncrease}개 (예상: 50개)`);

    if (stockIncrease === 50) {
      console.log('  ✅ 재고 증가량이 정확히 반영됨');
    } else if (stockIncrease > 0) {
      console.log('  ⚠️ 재고는 증가했지만 예상값과 다름');
    } else {
      console.log('  ❌ 재고가 증가하지 않음');
    }

    // === 정리 ===
    await clearAuth(page);

    // === 테스트 완료 ===
    console.log('\n🎉 시나리오 0 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 상품명: ${productName}`);
    console.log(`  - 초기 재고: ${initialStock.toLocaleString()}개`);
    console.log(`  - 등록 재고: 50개`);
    console.log(`  - 최종 재고: ${finalStock.toLocaleString()}개`);
    console.log(`  - 재고 증가: ${stockIncrease}개`);
    console.log('========================================');

    // Assertion
    expect(isProductFound).toBeTruthy();
    expect(stockIncrease).toBeGreaterThan(0);
    console.log('✅ 모든 검증 통과');
  });
});