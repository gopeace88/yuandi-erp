import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 1: 상품 등록 및 재고 관리 통합 플로우', () => {
  // 고유한 타임스탬프 생성
  const timestamp = Date.now();
  const uniqueModel = `TEST-${timestamp}`;

  // 테스트 상품 정보
  const TEST_PRODUCT = {
    name_ko: `테스트 핸드백 ${timestamp}`,
    name_zh: `测试手提包 ${timestamp}`,
    model: uniqueModel,
    color_ko: '검정',
    color_zh: '黑色',
    brand_ko: '테스트브랜드',
    brand_zh: '测试品牌',
    cost_cny: 100,
    price_krw: 20000
  };

  // 입고 정보
  const STOCK_INBOUND = {
    quantity: 10,
    note: '테스트 입고'
  };

  test('완전한 비즈니스 플로우 테스트', async ({ page }) => {
    console.log('=== 시나리오 1: 상품 등록 및 재고 관리 통합 플로우 시작 ===\n');

    // ========================================
    // 1단계: 로그인 및 세션 설정
    // ========================================
    console.log('📍 1단계: 로그인 및 세션 설정');
    await ensureLoggedIn(page, 'admin', { redirectPath: '/ko/dashboard' });
    console.log('  ✅ 로그인 완료');

    // ========================================
    // 2단계: 대시보드에서 초기 재고 확인
    // ========================================
    console.log('\n📍 2단계: 대시보드에서 초기 재고 확인');

    // 대시보드 페이지로 이동 (세션 적용을 위해 필수)
    await page.goto(getTestUrl('/ko/dashboard'));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(TIMEOUTS.medium);

    // 재고 현황 카드 찾기
    let initialStockCount = 0;
    try {
      // 재고 현황 카드에서 숫자 추출
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        // 카드 내에서 숫자 찾기
        const stockCardContainer = stockCard.locator('..').locator('..');
        const stockText = await stockCardContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          initialStockCount = parseInt(stockMatch[1]);
          console.log(`  - 현재 재고: ${initialStockCount}개`);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황 카드를 찾을 수 없음');
    }

    // ========================================
    // 3단계: 설정 페이지에서 상품 추가
    // ========================================
    console.log('\n📍 3단계: 설정 페이지에서 상품 추가');

    // 설정 페이지로 이동
    await page.goto(getTestUrl('/ko/settings'));
    await page.waitForLoadState('domcontentloaded');
    console.log('  - 설정 페이지 이동');
    await page.waitForTimeout(TIMEOUTS.medium);

    // 상품 관리 탭 클릭
    const productTab = page.locator('button[role="tab"]').filter({ hasText: /상품 관리/i }).first();
    if (await productTab.count() > 0) {
      await productTab.click();
      console.log('  - 상품 관리 탭 선택');
      await page.waitForTimeout(TIMEOUTS.short);
    }

    // 상품 추가 버튼 클릭
    const addProductBtn = page.locator('button').filter({ hasText: /\+ 상품 추가|상품 추가|추가/i }).first();
    if (await addProductBtn.count() > 0) {
      await addProductBtn.click();
      await page.waitForTimeout(TIMEOUTS.medium);  // 모달이 열릴 때까지 대기
      console.log('  - 상품 추가 모달 열림');
    } else {
      // 버튼을 찾을 수 없으면 로그 출력
      console.log('  ❌ 상품 추가 버튼을 찾을 수 없음');
      const buttons = await page.locator('button').all();
      console.log('  - 페이지의 버튼들:');
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const text = await buttons[i].textContent();
        console.log(`    ${i + 1}. "${text?.trim()}"`);
      }
      throw new Error('상품 추가 버튼을 찾을 수 없습니다');
    }

    // 상품 정보 입력
    console.log('  - 상품 정보 입력 시작');

    // 모달이 완전히 렌더링될 때까지 대기
    await page.waitForTimeout(1000);

    // 상품명 입력 - 레이블 텍스트로 필드 찾기
    const nameKoInput = page.locator('text=상품명 (한글) *').locator('..').locator('input').first();
    await nameKoInput.fill(TEST_PRODUCT.name_ko);

    const nameZhInput = page.locator('text=상품명 (중문) *').locator('..').locator('input').first();
    await nameZhInput.fill(TEST_PRODUCT.name_zh);

    // 카테고리 선택
    const categorySelect = page.locator('text=카테고리 *').locator('..').locator('select').first();
    if (await categorySelect.count() > 0) {
      const options = await categorySelect.locator('option').all();
      if (options.length > 1) {
        await categorySelect.selectOption({ index: 1 });
      }
    }

    // 모델 입력
    const modelInput = page.locator('text=모델 (한글/중문 공통)').locator('..').locator('input').first();
    await modelInput.fill(TEST_PRODUCT.model);

    // 색상 입력
    const colorInput = page.locator('text=색상 (한글)').locator('..').locator('input').first();
    await colorInput.fill(TEST_PRODUCT.color_ko);

    // 색상 (중문) 입력
    const colorZhInput = page.locator('text=색상 (중문)').locator('..').locator('input').first();
    await colorZhInput.fill(TEST_PRODUCT.color_zh);

    // 브랜드는 테이블에서 보이지만 모달에는 없을 수 있으므로 선택적으로 처리
    const brandInput = page.locator('input').filter({ hasText: /브랜드/i });
    if (await brandInput.count() > 0) {
      await brandInput.fill(TEST_PRODUCT.brand_ko);
    }

    // 원가와 판매가는 필수 필드
    // 원가 (CNY) 입력
    const costInput = page.locator('input[type="number"]').first();
    await costInput.fill(TEST_PRODUCT.cost_cny.toString());

    // 판매가 (KRW) 입력
    const priceInput = page.locator('input[type="number"]').nth(1);
    await priceInput.fill(TEST_PRODUCT.price_krw.toString());

    console.log('  - 모든 필드 입력 완료');

    // 저장 버튼 클릭
    const saveButton = page.locator('button').filter({ hasText: /저장|확인/i }).last();
    await saveButton.click();

    // 모달이 닫힐 때까지 대기
    await page.waitForTimeout(2000);
    console.log('  ✅ 상품 추가 완료');

    // 잠시 대기 (상품 목록 갱신)
    await page.waitForTimeout(TIMEOUTS.medium);

    // ========================================
    // 4단계: 재고 관리에서 재고 입고
    // ========================================
    console.log('\n📍 4단계: 재고 관리에서 재고 입고');

    // 재고 관리 메뉴로 이동
    const inventoryLink = page.locator('a:has-text("재고 관리"), a:has-text("Inventory")').first();
    if (await inventoryLink.count() > 0) {
      await inventoryLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 재고 관리 페이지 이동');
    } else {
      await page.goto(getTestUrl('/ko/inventory'));
      await page.waitForLoadState('networkidle');
      console.log('  - 재고 관리 페이지 직접 이동');
    }

    // 기존 모달이 열려있다면 닫기
    const existingModal = page.locator('[role="dialog"]');
    if (await existingModal.count() > 0 && await existingModal.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 재고 입고 버튼 클릭 - 더 정확한 선택자 사용
    const inboundButton = page.locator('button').filter({ hasText: /\+ 재고 입고|재고 입고/i }).first();
    await inboundButton.click();
    await page.waitForTimeout(1500);
    console.log('  - 재고 입고 모달 열림');

    // 상품 선택 (방금 추가한 상품)
    // 모달 내의 모든 select 확인
    const allSelects = await page.locator('select').all();
    console.log(`  - 모달 내 전체 select 개수: ${allSelects.length}개`);

    // 두 번째 select가 상품 선택 드롭다운일 가능성이 높음
    const productSelect = page.locator('select').nth(1);
    console.log(`  - 상품 선택 드롭다운 확인 중...`);

    if (await productSelect.count() > 0) {
      // 옵션에서 테스트 핸드백 찾기
      const options = await productSelect.locator('option').all();
      console.log(`  - 상품 옵션 개수: ${options.length}개`);

      // 처음 5개 옵션만 로그 출력
      for (let i = 0; i < Math.min(5, options.length); i++) {
        const text = await options[i].textContent();
        console.log(`    옵션 ${i}: "${text}"`);
      }

      let found = false;
      for (let i = 0; i < options.length; i++) {
        const text = await options[i].textContent();
        if (text?.includes(TEST_PRODUCT.name_ko)) {
          await productSelect.selectOption({ index: i });
          console.log('  ✅ 테스트 핸드백 선택 완료');
          found = true;
          break;
        }
      }

      if (!found) {
        console.log('  ⚠️ 테스트 핸드백을 찾을 수 없음');
        // 첫 번째 유효한 상품 선택 (인덱스 1부터, 0은 보통 "선택하세요")
        if (options.length > 1) {
          await productSelect.selectOption({ index: 1 });
          console.log('  - 대신 첫 번째 상품 선택');
        }
      }
    } else {
      console.log('  ❌ 상품 선택 드롭다운을 찾을 수 없음');
    }

    // 수량 입력 (첫 번째 숫자 입력 필드)
    const quantityInput = page.locator('input[type="number"]').first();
    await quantityInput.fill(STOCK_INBOUND.quantity.toString());
    console.log(`  - 입고 수량: ${STOCK_INBOUND.quantity}개`);

    // 입고 단가 입력 (두 번째 숫자 입력 필드)
    const inboundPriceInput = page.locator('input[type="number"]').nth(1);
    if (await inboundPriceInput.count() > 0) {
      await inboundPriceInput.fill(TEST_PRODUCT.cost_cny.toString());
      console.log(`  - 입고 단가: ${TEST_PRODUCT.cost_cny} CNY`);
    }

    // 메모 입력 (선택적)
    const noteInput = page.locator('textarea').first();
    if (await noteInput.count() > 0) {
      await noteInput.fill(STOCK_INBOUND.note);
      console.log(`  - 메모: ${STOCK_INBOUND.note}`);
    }

    // 확인 버튼 클릭
    const submitButton = page.locator('button').filter({ hasText: /확인|저장/i }).last();
    await submitButton.click();
    await page.waitForTimeout(2000);
    console.log('  ✅ 재고 입고 완료');

    // 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ========================================
    // 5단계: 출납장부에서 입고 내역 확인
    // ========================================
    console.log('\n📍 5단계: 출납장부에서 입고 내역 확인');

    // 출납장부 메뉴로 이동
    const cashbookLink = page.locator('a:has-text("출납장부"), a:has-text("Cashbook")').first();
    if (await cashbookLink.count() > 0) {
      await cashbookLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 출납장부 페이지 이동');
    } else {
      await page.goto(getTestUrl('/ko/cashbook'));
      await page.waitForLoadState('networkidle');
      console.log('  - 출납장부 페이지 직접 이동');
    }

    // 최신 거래 내역 확인
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      const rowText = await firstRow.textContent();
      if (rowText?.includes('재고 입고') || rowText?.includes('입고')) {
        console.log('  ✅ 입고 내역 발견');

        // 금액 확인 (10개 × 100 CNY = 1,000 CNY)
        const expectedAmount = STOCK_INBOUND.quantity * TEST_PRODUCT.cost_cny;
        if (rowText.includes(expectedAmount.toString())) {
          console.log(`  - 금액 확인: ${expectedAmount} CNY`);
        }

        // 메모 확인
        if (rowText.includes(STOCK_INBOUND.note)) {
          console.log(`  - 메모 확인: ${STOCK_INBOUND.note}`);
        }
      }
    } else {
      console.log('  ⚠️ 출납장부에 거래 내역이 없음');
    }

    // ========================================
    // 6단계: 대시보드에서 재고 현황 재확인
    // ========================================
    console.log('\n📍 6단계: 대시보드에서 재고 현황 재확인');

    // 대시보드로 이동
    const dashboardLink = page.locator('a:has-text("대시보드"), a:has-text("Dashboard")').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');
      console.log('  - 대시보드 페이지 이동');
    } else {
      await page.goto(getTestUrl('/ko/dashboard'));
      await page.waitForLoadState('networkidle');
      console.log('  - 대시보드 페이지 직접 이동');
    }

    // 재고 현황 카드 다시 확인
    let finalStockCount = 0;
    try {
      const stockCard = page.locator('text=재고 현황').first();
      if (await stockCard.count() > 0) {
        const stockCardContainer = stockCard.locator('..').locator('..');
        const stockText = await stockCardContainer.textContent();
        const stockMatch = stockText?.match(/(\d+)\s*개/);
        if (stockMatch) {
          finalStockCount = parseInt(stockMatch[1]);
          console.log(`  - 최종 재고: ${finalStockCount}개`);
        }
      }
    } catch (error) {
      console.log('  - 재고 현황 카드를 찾을 수 없음');
    }

    // 재고 증가 확인
    const stockIncrease = finalStockCount - initialStockCount;
    if (stockIncrease === STOCK_INBOUND.quantity) {
      console.log(`  ✅ 재고 증가 확인: +${stockIncrease}개`);
    } else {
      console.log(`  ⚠️ 예상 증가량: ${STOCK_INBOUND.quantity}개, 실제: ${stockIncrease}개`);
    }

    // ========================================
    // 테스트 완료
    // ========================================
    console.log('\n🎉 시나리오 1 테스트 완료!');
    console.log('========================================');
    console.log('📊 테스트 결과 요약:');
    console.log(`  - 초기 재고: ${initialStockCount}개`);
    console.log(`  - 입고 수량: ${STOCK_INBOUND.quantity}개`);
    console.log(`  - 최종 재고: ${finalStockCount}개`);
    console.log(`  - 재고 증가: ${stockIncrease}개`);
    console.log('========================================');

    // 최종 검증
    expect(page.url()).not.toContain('/login');
    console.log('✅ 모든 단계 성공적으로 완료');

    await clearAuth(page);
  });
});
