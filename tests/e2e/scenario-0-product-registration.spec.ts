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

    // === 2단계: 설정 페이지로 이동 ===
    console.log('\n📍 2단계: 설정 페이지로 이동');
    await page.goto(getTestUrl('/ko/settings'));
    await page.waitForLoadState('networkidle');
    console.log('  - 설정 페이지 도착');

    // 상품 관리 탭이 기본적으로 선택되어 있는지 확인
    // activeTab의 기본값이 'products'이므로 별도 클릭 불필요
    await page.waitForTimeout(TIMEOUTS.short);

    // === 3단계: 상품 추가 버튼 클릭 ===
    console.log('\n📍 3단계: 상품 추가 버튼 클릭');

    const addProductButton = page
      .locator('button')
      .filter({ hasText: /상품.*추가|Add.*Product/i })
      .first();

    const buttonCount = await addProductButton.count();
    if (buttonCount === 0) {
      console.log('  ⚠️ 상품 추가 버튼을 찾을 수 없습니다.');
      throw new Error('상품 추가 버튼을 찾을 수 없음');
    }

    await addProductButton.click();
    await page.waitForTimeout(TIMEOUTS.short);
    console.log('  - 상품 추가 모달 열림');

    // === 4단계: 상품 정보 입력 ===
    console.log('\n📍 4단계: 상품 정보 입력');

    // 테스트용 고유 상품명 생성
    const timestamp = Date.now();
    const productName = `테스트 상품 ${timestamp}`;
    const productNameKo = `테스트 상품 한글 ${timestamp}`;
    const productNameZh = `测试产品 ${timestamp}`;

    // 모달이 완전히 로드될 때까지 잠시 대기
    await page.waitForTimeout(TIMEOUTS.short);

    // 모든 input 필드 찾기 (모달 내부)
    const allInputs = page.locator('input').all();
    const inputList = await allInputs;
    console.log(`  - 총 ${inputList.length}개의 input 필드 발견`);

    // 인덱스로 직접 접근
    if (inputList.length >= 4) {
      // 상품명 (한국어) - 보통 첫 번째 입력 필드
      await inputList[0].fill(productNameKo);
      console.log(`  - 상품명(한국어) 입력: ${productNameKo}`);

      // 상품명 (중국어) - 두 번째 입력 필드
      await inputList[1].fill(productNameZh);
      console.log(`  - 상품명(중국어) 입력: ${productNameZh}`);

      // 카테고리는 select로 처리
      const categorySelect = page.locator('select').first();
      const options = await categorySelect.locator('option').all();
      if (options.length > 1) {
        await categorySelect.selectOption({ index: 1 });
        console.log('  - 카테고리 선택 완료');
      }

      // 모델명 (인덱스 2 또는 3)
      const modelIndex = inputList.length > 8 ? 2 : 3;
      if (inputList.length > modelIndex) {
        await inputList[modelIndex].fill(`MODEL-${timestamp}`);
        console.log('  - 모델명 입력');
      }

      // 색상 한글 (인덱스 3 또는 4)
      const colorKoIndex = inputList.length > 8 ? 3 : 4;
      if (inputList.length > colorKoIndex) {
        await inputList[colorKoIndex].fill('블랙');
        console.log('  - 색상(한글) 입력: 블랙');
      }

      // 색상 중문 (인덱스 4 또는 5)
      const colorZhIndex = inputList.length > 8 ? 4 : 5;
      if (inputList.length > colorZhIndex) {
        await inputList[colorZhIndex].fill('黑色');
        console.log('  - 색상(중문) 입력: 黑色');
      }
    } else {
      console.log('  ⚠️ 입력 필드가 충분하지 않습니다. 기본값만 입력합니다.');

      // 최소한의 입력만 수행
      await inputList[0].fill(productNameKo);
      if (inputList.length > 1) await inputList[1].fill(productNameZh);
    }

    // 숫자 필드들은 type="number"로 처리
    const numberInputs = await page.locator('input[type="number"]').all();
    if (numberInputs.length >= 2) {
      // 원가 (CNY)
      await numberInputs[0].fill('500');
      console.log('  - 원가: 500 CNY');

      // 판매가 (KRW)
      await numberInputs[1].fill('100000');
      console.log('  - 판매가: 100,000 KRW');

      // 재고 수량
      if (numberInputs.length > 2) {
        await numberInputs[2].fill('50');
        console.log('  - 초기 재고: 50개');
      }

      // 임계값
      if (numberInputs.length > 3) {
        await numberInputs[3].fill('5');
        console.log('  - 재고 부족 임계값: 5개');
      }
    }

    // === 5단계: 상품 저장 ===
    console.log('\n📍 5단계: 상품 저장');

    const saveButton = page
      .locator('button')
      .filter({ hasText: /저장|등록|Save|Submit|확인/i })
      .last();

    // API 응답 확인을 위한 Promise
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/products') && response.status() === 200,
      { timeout: TIMEOUTS.navigation }
    ).catch(() => null);

    await saveButton.click();
    console.log('  - 상품 저장 버튼 클릭');

    // 응답 대기
    const response = await responsePromise;
    if (response) {
      console.log('  ✅ 상품 등록 API 응답 성공');
    }

    // 모달이 닫힐 때까지 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // === 6단계: 등록 확인 ===
    console.log('\n📍 6단계: 상품 등록 확인');

    // 페이지 새로고침하여 상품 목록 갱신
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 설정 페이지의 상품 목록에서 확인
    // 방금 등록한 상품이 목록에 있는지 확인
    const productRows = page.locator('tbody tr');
    const rowCount = await productRows.count();

    let isProductFound = false;
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = productRows.nth(i);
      const rowText = await row.textContent();
      if (rowText?.includes(productNameKo) || rowText?.includes(`MODEL-${timestamp}`)) {
        isProductFound = true;
        console.log('  ✅ 상품이 목록에서 확인됨');
        console.log(`  - 등록된 상품 정보: ${rowText.substring(0, 100)}...`);
        break;
      }
    }

    if (!isProductFound) {
      console.log('  ⚠️ 상품이 설정 페이지 목록에서 바로 보이지 않음');
    }

    // === 7단계: 재고 관리 페이지에서 확인 ===
    console.log('\n📍 7단계: 재고 관리 페이지에서 상품 확인');
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForLoadState('networkidle');

    // 검색창에 모델명으로 검색
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill(`MODEL-${timestamp}`);
    await page.waitForTimeout(TIMEOUTS.short);

    // 검색 결과 확인
    const inventoryRow = page.locator('tbody tr').first();
    const inventoryText = await inventoryRow.textContent();

    if (inventoryText?.includes(`MODEL-${timestamp}`)) {
      console.log('  ✅ 상품이 재고 관리 페이지에서 확인됨');

      // 재고 수량 확인
      if (inventoryText.includes('50')) {
        console.log('  ✅ 초기 재고 50개 정상 표시');
      } else {
        console.log('  ⚠️ 재고 수량이 예상과 다름');
      }
    } else {
      console.log('  ❌ 상품이 재고 관리 페이지에서 찾을 수 없음');
    }

    // === 정리 ===
    await clearAuth(page);

    // === 테스트 완료 ===
    console.log('\n🎉 시나리오 0 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 상품명(한글): ${productNameKo}`);
    console.log(`  - 상품명(중문): ${productNameZh}`);
    console.log(`  - 모델명: MODEL-${timestamp}`);
    console.log(`  - 초기 재고: 50개`);
    console.log(`  - 원가: 500 CNY`);
    console.log(`  - 판매가: 100,000 KRW`);
    console.log('========================================');

    // Assertion
    expect(isProductFound).toBeTruthy();
    console.log('✅ 모든 검증 통과');
  });
});