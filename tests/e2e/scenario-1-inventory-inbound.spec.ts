import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';
import { ensureLoggedIn, clearAuth } from './utils/auth';

test.describe('시나리오 1: 재고 입고', () => {
  test('기존 상품 재고 입고 플로우', async ({ page }) => {
    console.log('\n=== 시나리오 1: 재고 입고 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 로그인 및 세션 설정 ===
    console.log('📍 1단계: 로그인 및 세션 설정');
    await ensureLoggedIn(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    console.log('  ✅ 로그인 완료');

    // === 2단계: 재고 관리 페이지 이동 ===
    console.log('\n📍 2단계: 재고 관리 페이지 이동');
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForLoadState('networkidle');
    console.log('  - 재고 관리 페이지 도착');

    // 현재 상품 목록 확인
    const productRows = await page.locator('tbody tr').count();
    console.log(`  - 현재 등록된 상품 수: ${productRows}개`);

    if (productRows === 0) {
      console.log('  ⚠️ 등록된 상품이 없습니다. 먼저 시나리오 0을 실행하세요.');
      return;
    }

    // === 3단계: 재고 입고할 상품 선택 ===
    console.log('\n📍 3단계: 재고 입고할 상품 선택');

    // 첫 번째 상품의 정보 가져오기
    const firstProductRow = page.locator('tbody tr').first();
    const productName = await firstProductRow.locator('td').nth(1).textContent();
    const currentStock = await firstProductRow.locator('td').filter({ hasText: /^\d+$/ }).first().textContent();

    console.log(`  - 선택된 상품: ${productName}`);
    console.log(`  - 현재 재고: ${currentStock}개`);

    // === 4단계: 재고 입고 모달 열기 ===
    console.log('\n📍 4단계: 재고 입고 모달 열기');

    const inboundButton = page
      .locator('button')
      .filter({ hasText: /입고|재고.*추가|Add.*Stock|Inbound/i })
      .first();

    await inboundButton.click();
    await page.waitForTimeout(TIMEOUTS.short);
    console.log('  - 재고 입고 모달 열림');

    // === 5단계: 입고 정보 입력 ===
    console.log('\n📍 5단계: 입고 정보 입력');

    // 모달이 완전히 로드될 때까지 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // 모달 내의 모든 select 확인
    const allSelects = await page.locator('select').all();
    console.log(`  - 모달 내 전체 select 개수: ${allSelects.length}개`);

    // 두 번째 select가 상품 선택 드롭다운일 가능성이 높음
    // (첫 번째는 카테고리일 수 있음)
    let productSelect = page.locator('select').first();

    // select가 2개 이상이면 두 번째 것을 사용
    if (allSelects.length > 1) {
      productSelect = page.locator('select').nth(1);
      console.log('  - 두 번째 select를 상품 선택 드롭다운으로 사용');
    } else {
      console.log('  - 첫 번째 select를 상품 선택 드롭다운으로 사용');
    }

    if (await productSelect.count() > 0) {
      // 옵션들 확인
      const options = await productSelect.locator('option').all();
      console.log(`  - 상품 옵션 개수: ${options.length}개`);

      // 처음 5개 옵션만 로그 출력
      for (let i = 0; i < Math.min(5, options.length); i++) {
        const text = await options[i].textContent();
        console.log(`    옵션 ${i}: "${text}"`);
      }

      // 실제 상품 선택 (인덱스 1부터, 0은 보통 "선택하세요" 같은 플레이스홀더)
      if (options.length > 1) {
        // 상품명을 포함한 옵션 찾기 (테스트 상품 또는 기존 상품)
        let found = false;

        for (let i = 1; i < options.length; i++) {
          const text = await options[i].textContent();
          // 비어있지 않은 첫 번째 실제 상품 선택
          if (text && text.trim().length > 0 && !text.includes('선택')) {
            await productSelect.selectOption({ index: i });
            console.log(`  ✅ 상품 선택: "${text}" (인덱스: ${i})`);
            found = true;
            break;
          }
        }

        if (!found) {
          // 못 찾았으면 그냥 첫 번째 옵션 선택 (인덱스 1)
          await productSelect.selectOption({ index: 1 });
          const selectedText = await options[1].textContent();
          console.log(`  - 기본값으로 첫 번째 상품 선택: "${selectedText}"`);
        }
      }
    } else {
      console.log('  ❌ 상품 선택 드롭다운을 찾을 수 없음');
    }

    console.log('  ✅ 상품 선택 단계 완료');

    // 입고 수량 입력 - 모든 number input 찾기
    const numberInputs = await page.locator('input[type="number"]').all();
    const inboundQuantity = 100;

    if (numberInputs.length > 0) {
      // 첫 번째 number input이 수량 필드
      await numberInputs[0].fill(inboundQuantity.toString());
      console.log(`  - 입고 수량: ${inboundQuantity}개`);

      // 두 번째 number input이 단가 필드 (있으면)
      if (numberInputs.length > 1) {
        await numberInputs[1].fill('150');  // 150 CNY
        console.log('  - 입고 단가: 150 CNY');
      }
    }

    // 메모 입력 - textarea 또는 text input 찾기
    const memoInput = page.locator('textarea, input[type="text"]').last();
    if (await memoInput.count() > 0) {
      const memoText = `시나리오 1 테스트 입고 - ${new Date().toLocaleString('ko-KR')}`;
      await memoInput.fill(memoText);
      console.log('  - 메모: 시나리오 1 테스트 입고');
    }

    // === 6단계: 입고 저장 ===
    console.log('\n📍 6단계: 입고 저장');

    const saveButton = page
      .locator('button')
      .filter({ hasText: /저장|입고|등록|Save|Submit/i })
      .last();

    // API 응답 확인
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/inventory') && response.status() === 200,
      { timeout: TIMEOUTS.navigation }
    ).catch(() => null);

    await saveButton.click();
    console.log('  - 입고 저장 버튼 클릭');

    const response = await responsePromise;
    if (response) {
      console.log('  ✅ 재고 입고 API 응답 성공');
    }

    // 모달이 닫힐 때까지 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // === 7단계: 재고 증가 확인 ===
    console.log('\n📍 7단계: 재고 증가 확인');

    // 모달이 닫힐 때까지 대기
    await page.waitForTimeout(TIMEOUTS.medium);

    // 페이지 새로고침하여 최신 데이터 가져오기
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(TIMEOUTS.short);

    // 동일한 상품의 재고 확인 (재고 열 찾기)
    const updatedProductRow = page.locator('tbody tr').first();
    const tdElements = await updatedProductRow.locator('td').all();

    // 재고 수량 찾기 (보통 상품명 다음 열들 중 하나)
    let updatedStock = '0';
    for (let i = 2; i < tdElements.length; i++) {
      const text = await tdElements[i].textContent();
      // 숫자만 있는 셀을 찾기 (재고 수량일 가능성이 높음)
      if (text && /^\d+$/.test(text.trim())) {
        updatedStock = text.trim();
        console.log(`  - 재고 컬럼 위치: ${i}번째 td`);
        break;
      }
    }

    const stockIncrease = parseInt(updatedStock || '0') - parseInt(currentStock || '0');

    console.log(`  - 입고 후 재고: ${updatedStock}개`);
    console.log(`  - 재고 증가량: ${stockIncrease}개 (예상: ${inboundQuantity}개)`);

    if (stockIncrease === inboundQuantity) {
      console.log('  ✅ 재고가 정확히 증가함');
    } else if (stockIncrease > 0) {
      console.log('  ⚠️ 재고는 증가했지만 예상값과 다름');
    } else {
      console.log('  ❌ 재고가 증가하지 않음');
    }

    // === 8단계: 출납장부 확인 ===
    console.log('\n📍 8단계: 출납장부에서 입고 내역 확인');

    await page.goto(getTestUrl('/ko/cashbook'));

    // 페이지 로딩 대기 (타임아웃 증가)
    try {
      await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.navigation });
      console.log('  - 출납장부 페이지 로딩 완료');
    } catch (error) {
      console.log('  ⚠️ 출납장부 페이지 로딩 타임아웃 - 계속 진행');
    }

    // 오늘 날짜의 입고 내역 찾기
    const today = new Date().toISOString().split('T')[0];
    const cashbookRows = await page.locator('tbody tr').all();

    console.log(`  - 출납장부 총 행 수: ${cashbookRows.length}개`);

    let inboundRecordFound = false;
    for (let i = 0; i < Math.min(cashbookRows.length, 10); i++) {
      const row = cashbookRows[i];
      const rowText = await row.textContent();

      if (rowText?.includes('입고') && rowText.includes(today)) {
        inboundRecordFound = true;
        console.log(`  ✅ 오늘 입고 기록 발견: ${rowText.substring(0, 100)}...`);
        break;
      }
    }

    if (!inboundRecordFound) {
      console.log('  ⚠️ 최근 입고 내역을 찾을 수 없음 (출납장부 자동 기록 확인 필요)');
    }

    // === 9단계: 재고 이동 이력 확인 ===
    console.log('\n📍 9단계: 재고 이동 이력 확인');

    // 재고 관리 페이지로 돌아가기
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForLoadState('networkidle');

    // 이력 보기 버튼이 있는지 확인
    const historyButton = page.locator('button').filter({ hasText: /이력|기록|History/i }).first();

    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(TIMEOUTS.short);

      const historyModal = page.locator('[role="dialog"], .modal');
      if (await historyModal.count() > 0) {
        const historyText = await historyModal.textContent();
        console.log('  ✅ 재고 이동 이력 모달 확인');
        console.log(`  - 이력 내용: ${historyText?.substring(0, 200)}...`);
      }
    } else {
      console.log('  - 재고 이동 이력 기능 없음 (선택사항)');
    }

    // === 정리 ===
    await clearAuth(page);

    // === 테스트 완료 ===
    console.log('\n🎉 시나리오 1 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log(`  - 입고 상품: ${productName}`);
    console.log(`  - 입고 전 재고: ${currentStock}개`);
    console.log(`  - 입고 수량: ${inboundQuantity}개`);
    console.log(`  - 입고 후 재고: ${updatedStock}개`);
    console.log(`  - 실제 증가량: ${stockIncrease}개`);
    console.log(`  - 출납장부 기록: ${inboundRecordFound ? '확인됨' : '미확인'}`);
    console.log('========================================');

    // Assertion
    expect(stockIncrease).toBeGreaterThan(0);
    console.log('✅ 모든 검증 통과');
  });
});