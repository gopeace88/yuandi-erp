const { chromium } = require('playwright');

/**
 * YUANDI ERP 배포 사이트 E2E 테스트 - 5가지 시나리오 각 5회 실행
 */

// 테스트할 가능한 배포 URL들
const POSSIBLE_URLS = [
  'https://00-yuandi-erp.vercel.app/ko',
  'https://00-yuandi-erp.vercel.app',
  'https://yuandi-erp.vercel.app',
  'https://yuandi.com',
  'https://www.yuandi.com'
];

// 테스트 결과 저장
const testResults = {
  startTime: new Date().toISOString(),
  workingUrl: null,
  scenarios: {
    'login_dashboard': { runs: [], passed: 0, failed: 0, successRate: 0 },
    'product_management': { runs: [], passed: 0, failed: 0, successRate: 0 },
    'order_management': { runs: [], passed: 0, failed: 0, successRate: 0 },
    'inventory_management': { runs: [], passed: 0, failed: 0, successRate: 0 },
    'cashbook_management': { runs: [], passed: 0, failed: 0, successRate: 0 }
  },
  summary: { totalRuns: 0, totalPassed: 0, totalFailed: 0 }
};

async function findWorkingUrl() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔍 배포된 사이트 URL 확인 중...\n');

  for (const url of POSSIBLE_URLS) {
    try {
      console.log(`  Testing: ${url}`);

      const response = await page.goto(url, {
        timeout: 15000,
        waitUntil: 'networkidle'
      });

      if (response?.status() === 200) {
        const title = await page.title();
        const content = await page.content();

        // YUANDI ERP 관련 키워드 확인
        if (title.toLowerCase().includes('yuandi') ||
            title.toLowerCase().includes('erp') ||
            content.includes('로그인') ||
            content.includes('admin@yuandi.com')) {

          console.log(`  ✅ 성공: ${url}`);
          console.log(`     제목: ${title}`);
          await browser.close();
          return url;
        }
      }

      console.log(`  ❌ 실패: ${url} (Status: ${response?.status() || 'N/A'})`);

    } catch (error) {
      console.log(`  ❌ 오류: ${url} - ${error.message}`);
    }
  }

  await browser.close();
  return null;
}

async function runScenario(scenarioName, testFunction, runNumber) {
  const browser = await chromium.launch({
    headless: false,  // 시각적 확인을 위해 headless false
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  const startTime = Date.now();
  let status = 'failed';
  let error = null;

  try {
    await testFunction(page, testResults.workingUrl);
    status = 'passed';
    console.log(`    ✅ 성공 (${((Date.now() - startTime) / 1000).toFixed(1)}초)`);
  } catch (e) {
    error = e.message;
    console.log(`    ❌ 실패 (${((Date.now() - startTime) / 1000).toFixed(1)}초): ${error}`);
  } finally {
    await browser.close();
  }

  const result = {
    runNumber,
    status,
    duration: Date.now() - startTime,
    error
  };

  testResults.scenarios[scenarioName].runs.push(result);
  testResults.scenarios[scenarioName][status]++;
  testResults.summary.totalRuns++;
  testResults.summary[`total${status.charAt(0).toUpperCase() + status.slice(1)}`]++;

  return result;
}

// 시나리오 1: 사용자 로그인 및 대시보드
async function scenario1LoginDashboard(page, baseUrl) {
  console.log('      📋 로그인 페이지 접속...');
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // 로그인 필요한지 확인
  if (page.url().includes('/login') || await page.locator('input#email').count() > 0) {
    console.log('      🔑 관리자 계정으로 로그인...');
    await page.fill('input#email', 'admin@yuandi.com');
    await page.fill('input#password', 'yuandi123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  // 대시보드로 이동
  const dashboardUrl = `${baseUrl}/dashboard`;
  await page.goto(dashboardUrl);
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  console.log('      📊 대시보드 표시 확인...');

  // 주요 통계 위젯 확인
  const widgets = [
    '총 상품 수',
    '총 주문 수',
    '재고 현황',
    '이번 달 매출'
  ];

  let foundWidgets = 0;
  for (const widget of widgets) {
    if (await page.locator(`text=${widget}`).count() > 0) {
      foundWidgets++;
      console.log(`        ✓ ${widget} 위젯 확인`);
    }
  }

  if (foundWidgets < 2) {
    throw new Error(`대시보드 위젯을 충분히 찾지 못함 (${foundWidgets}/${widgets.length})`);
  }

  console.log('      ✅ 대시보드 로드 및 위젯 확인 완료');
}

// 시나리오 2: 상품 관리
async function scenario2ProductManagement(page, baseUrl) {
  // 로그인
  await loginIfNeeded(page, baseUrl);

  console.log('      📦 상품 목록 페이지 이동...');
  await page.goto(`${baseUrl}/settings`);
  await page.waitForLoadState('networkidle');

  // 상품 관리 탭 클릭
  const productTab = page.locator('button:has-text("상품 관리")');
  if (await productTab.count() > 0) {
    await productTab.click();
    await page.waitForTimeout(1000);
  }

  console.log('      ➕ 새 상품 추가...');
  await page.click('button:has-text("+ 상품 추가")');
  await page.waitForTimeout(1000);

  // 상품 정보 입력
  const timestamp = Date.now();
  const testModel = `TEST-PROD-${timestamp}`;

  await page.locator('input[type="text"]').nth(0).fill('테스트 상품');
  await page.locator('input[type="text"]').nth(1).fill('测试产品');
  await page.locator('input[type="text"]').nth(2).fill(testModel);
  await page.locator('input[type="text"]').nth(3).fill('검정');
  await page.locator('input[type="text"]').nth(4).fill('黑色');
  await page.locator('input[type="text"]').nth(5).fill('테스트브랜드');
  await page.locator('input[type="text"]').nth(6).fill('测试品牌');
  await page.locator('input[type="number"]').nth(0).fill('1000');
  await page.locator('input[type="number"]').nth(1).fill('300000');

  await page.click('button:has-text("저장")');
  await page.waitForTimeout(2000);

  console.log('      ✏️ 상품 정보 수정...');
  // 방금 추가한 상품을 찾아서 수정
  const editButton = page.locator(`text=${testModel}`).locator('..').locator('button:has-text("수정")');
  if (await editButton.count() > 0) {
    await editButton.click();
    await page.waitForTimeout(1000);

    // 가격 수정
    await page.locator('input[type="number"]').nth(1).fill('350000');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(2000);
  }

  console.log('      🗑️ 상품 삭제...');
  // 삭제 버튼 찾아서 클릭
  const deleteButton = page.locator(`text=${testModel}`).locator('..').locator('button:has-text("삭제")');
  if (await deleteButton.count() > 0) {
    await deleteButton.click();
    await page.waitForTimeout(500);

    // 확인 대화상자가 있으면 확인
    const confirmButton = page.locator('button:has-text("확인")');
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
      await page.waitForTimeout(2000);
    }
  }

  console.log('      ✅ 상품 관리 작업 완료');
}

// 시나리오 3: 주문 관리
async function scenario3OrderManagement(page, baseUrl) {
  await loginIfNeeded(page, baseUrl);

  console.log('      📋 주문 목록 페이지 이동...');
  await page.goto(`${baseUrl}/orders`);
  await page.waitForLoadState('networkidle');

  console.log('      ➕ 새 주문 생성...');
  await page.click('button:has-text("+ 주문 추가")');
  await page.waitForTimeout(1000);

  // 주문 정보 입력
  await page.fill('input[placeholder*="고객명"]', '테스트 고객');
  await page.fill('input[placeholder*="전화번호"]', '010-1234-5678');
  await page.fill('input[placeholder*="주소"]', '서울시 강남구 테헤란로 123');

  // 상품 선택 (첫 번째 상품)
  const productSelect = page.locator('select').first();
  const options = await productSelect.locator('option').all();
  if (options.length > 1) {
    await productSelect.selectOption({ index: 1 });
  }

  await page.fill('input[type="number"]', '2'); // 수량
  await page.click('button:has-text("저장")');
  await page.waitForTimeout(2000);

  console.log('      🔄 주문 상태 변경...');
  // 첫 번째 주문 상태를 배송중으로 변경
  const statusButton = page.locator('select').first();
  if (await statusButton.count() > 0) {
    await statusButton.selectOption('SHIPPED');
    await page.waitForTimeout(2000);
  }

  console.log('      📄 주문 상세 조회...');
  // 첫 번째 주문 클릭
  const firstOrder = page.locator('tbody tr').first();
  if (await firstOrder.count() > 0) {
    await firstOrder.click();
    await page.waitForTimeout(1000);
  }

  console.log('      ✅ 주문 관리 작업 완료');
}

// 시나리오 4: 재고 이동
async function scenario4InventoryManagement(page, baseUrl) {
  await loginIfNeeded(page, baseUrl);

  console.log('      📦 재고 관리 페이지 이동...');
  await page.goto(`${baseUrl}/inventory`);
  await page.waitForLoadState('networkidle');

  console.log('      ⬇️ 입고 처리...');
  await page.click('button:has-text("재고 입고")');
  await page.waitForTimeout(1000);

  // 입고 정보 입력
  const productSelect = page.locator('select').first();
  const options = await productSelect.locator('option').all();
  if (options.length > 1) {
    await productSelect.selectOption({ index: 1 });
  }

  await page.fill('input[type="number"]', '5'); // 수량
  await page.fill('input[type="number"]', '100'); // 단가
  await page.click('button:has-text("저장")');
  await page.waitForTimeout(2000);

  console.log('      ⬆️ 출고 처리...');
  await page.click('button:has-text("재고 출고")');
  await page.waitForTimeout(1000);

  // 출고 정보 입력
  const outProductSelect = page.locator('select').first();
  const outOptions = await outProductSelect.locator('option').all();
  if (outOptions.length > 1) {
    await outProductSelect.selectOption({ index: 1 });
  }

  await page.fill('input[type="number"]', '2'); // 출고 수량
  await page.click('button:has-text("저장")');
  await page.waitForTimeout(2000);

  console.log('      📊 재고 현황 확인...');
  // 재고 테이블 확인
  const inventoryTable = page.locator('table tbody tr');
  const rowCount = await inventoryTable.count();

  if (rowCount === 0) {
    throw new Error('재고 현황 테이블이 비어있음');
  }

  console.log(`      ✅ 재고 관리 작업 완료 (${rowCount}개 상품 확인)`);
}

// 시나리오 5: 출납장부 관리
async function scenario5CashbookManagement(page, baseUrl) {
  await loginIfNeeded(page, baseUrl);

  console.log('      💰 출납장부 페이지 이동...');
  await page.goto(`${baseUrl}/cashbook`);
  await page.waitForLoadState('networkidle');

  console.log('      ➕ 수입 기록 추가...');
  await page.click('button:has-text("+ 거래 추가")');
  await page.waitForTimeout(1000);

  // 수입 기록 입력
  await page.selectOption('select', 'INCOME');
  await page.fill('input[type="number"]', '50000'); // 금액
  await page.fill('input[placeholder*="설명"]', '테스트 수입');
  await page.click('button:has-text("저장")');
  await page.waitForTimeout(2000);

  console.log('      ➖ 지출 기록 추가...');
  await page.click('button:has-text("+ 거래 추가")');
  await page.waitForTimeout(1000);

  // 지출 기록 입력
  await page.selectOption('select', 'EXPENSE');
  await page.fill('input[type="number"]', '30000'); // 금액
  await page.fill('input[placeholder*="설명"]', '테스트 지출');
  await page.click('button:has-text("저장")');
  await page.waitForTimeout(2000);

  console.log('      💵 잔액 확인...');
  // 잔액 표시 확인
  const balanceElement = page.locator('text=잔액').first();
  if (await balanceElement.count() > 0) {
    const balanceContainer = balanceElement.locator('..');
    const balanceText = await balanceContainer.textContent();
    console.log(`        현재 잔액: ${balanceText}`);
  }

  // 거래 내역 테이블 확인
  const transactionTable = page.locator('table tbody tr');
  const transactionCount = await transactionTable.count();

  if (transactionCount === 0) {
    throw new Error('거래 내역이 없음');
  }

  console.log(`      ✅ 출납장부 관리 완료 (${transactionCount}개 거래 확인)`);
}

// 로그인 헬퍼 함수
async function loginIfNeeded(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login') || await page.locator('input#email').count() > 0) {
    await page.fill('input#email', 'admin@yuandi.com');
    await page.fill('input#password', 'yuandi123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }
}

// 메인 실행 함수
async function runAllTests() {
  console.log('🚀 YUANDI ERP 배포 사이트 E2E 테스트 시작');
  console.log('═'.repeat(60));

  // 1. 작동하는 URL 찾기
  testResults.workingUrl = await findWorkingUrl();

  if (!testResults.workingUrl) {
    console.log('❌ 접근 가능한 배포 사이트를 찾을 수 없습니다.');
    console.log('확인된 URL들:');
    POSSIBLE_URLS.forEach(url => console.log(`  - ${url}`));
    return;
  }

  console.log(`\n✅ 테스트 대상 사이트: ${testResults.workingUrl}\n`);

  // 2. 각 시나리오 5회씩 실행
  const scenarios = [
    { name: 'login_dashboard', title: '시나리오 1: 사용자 로그인 및 대시보드', func: scenario1LoginDashboard },
    { name: 'product_management', title: '시나리오 2: 상품 관리', func: scenario2ProductManagement },
    { name: 'order_management', title: '시나리오 3: 주문 관리', func: scenario3OrderManagement },
    { name: 'inventory_management', title: '시나리오 4: 재고 이동', func: scenario4InventoryManagement },
    { name: 'cashbook_management', title: '시나리오 5: 출납장부 관리', func: scenario5CashbookManagement }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📌 ${scenario.title}`);
    console.log('-'.repeat(50));

    for (let i = 1; i <= 5; i++) {
      console.log(`  실행 ${i}/5:`);
      await runScenario(scenario.name, scenario.func, i);

      // 테스트 간 간격
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 시나리오별 성공률 계산
    const scenarioResult = testResults.scenarios[scenario.name];
    scenarioResult.successRate = Math.round((scenarioResult.passed / 5) * 100);

    console.log(`  📊 성공률: ${scenarioResult.successRate}% (${scenarioResult.passed}/5)`);
  }

  // 3. 결과 요약 출력
  console.log('\n' + '═'.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('═'.repeat(60));

  console.log(`🌐 테스트 사이트: ${testResults.workingUrl}`);
  console.log(`📅 테스트 시간: ${new Date().toLocaleString('ko-KR')}`);

  console.log('\n📈 시나리오별 결과:');
  Object.entries(testResults.scenarios).forEach(([key, result]) => {
    const scenarioTitles = {
      'login_dashboard': '로그인 및 대시보드',
      'product_management': '상품 관리',
      'order_management': '주문 관리',
      'inventory_management': '재고 이동',
      'cashbook_management': '출납장부 관리'
    };

    console.log(`  ${scenarioTitles[key]}: ${result.successRate}% (${result.passed}/${result.passed + result.failed})`);
  });

  const overallSuccess = Math.round((testResults.summary.totalPassed / testResults.summary.totalRuns) * 100);
  console.log(`\n🎯 전체 성공률: ${overallSuccess}% (${testResults.summary.totalPassed}/${testResults.summary.totalRuns})`);

  // 안정성 평가
  let stability = '';
  if (overallSuccess >= 90) stability = '🟢 매우 안정적';
  else if (overallSuccess >= 70) stability = '🟡 안정적';
  else if (overallSuccess >= 50) stability = '🟠 불안정';
  else stability = '🔴 매우 불안정';

  console.log(`📊 시스템 안정성: ${stability}`);

  // 문제 시나리오 식별
  const problematicScenarios = Object.entries(testResults.scenarios)
    .filter(([_, result]) => result.successRate < 80)
    .map(([key, result]) => ({ key, successRate: result.successRate }));

  if (problematicScenarios.length > 0) {
    console.log('\n⚠️ 주의가 필요한 시나리오:');
    problematicScenarios.forEach(({ key, successRate }) => {
      const titles = {
        'login_dashboard': '로그인 및 대시보드',
        'product_management': '상품 관리',
        'order_management': '주문 관리',
        'inventory_management': '재고 이동',
        'cashbook_management': '출납장부 관리'
      };
      console.log(`  - ${titles[key]}: ${successRate}% 성공률`);
    });
  }

  // 개선 제안사항
  console.log('\n💡 개선 제안사항:');
  if (overallSuccess < 90) {
    console.log('  - 실패한 테스트의 오류 로그를 분석하여 UI 안정성 개선 필요');
    console.log('  - 페이지 로딩 시간 최적화 고려');
  }
  if (problematicScenarios.length > 0) {
    console.log('  - 불안정한 시나리오의 셀렉터 및 타이밍 최적화 필요');
  }
  console.log('  - E2E 테스트 자동화를 CI/CD 파이프라인에 통합 고려');

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ 테스트 완료: ${new Date().toLocaleString('ko-KR')}`);
  console.log('═'.repeat(60));

  // 결과를 파일로 저장
  const fs = require('fs');
  fs.writeFileSync(
    'production-e2e-test-results.json',
    JSON.stringify(testResults, null, 2),
    'utf-8'
  );
  console.log('\n📁 상세 결과가 production-e2e-test-results.json 파일에 저장되었습니다.');
}

// 실행
runAllTests().catch(console.error);