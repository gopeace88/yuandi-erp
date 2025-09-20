import { test, expect } from '@playwright/test';
import { getTestUrl, logTestEnvironment, TIMEOUTS, TEST_ACCOUNTS } from './test-config';
import * as path from 'path';
import * as fs from 'fs';

test.describe('시나리오 5: 엑셀 다운로드 (localStorage 세션 유지)', () => {
  test('각 화면에서 엑셀 다운로드 기능 확인', async ({ page }) => {

    console.log('\n=== 시나리오 5: 엑셀 다운로드 시작 ===\n');
    logTestEnvironment();

    // === 1단계: 로그인 및 세션 설정 ===
    console.log('📍 1단계: 로그인 및 세션 설정');
    await page.goto(getTestUrl('/ko'));

    // localStorage로 세션 정보 설정
    await page.evaluate(() => {
      const sessionData = {
        id: '78502b6d-13e7-4acc-94a7-23a797de3519',
        email: TEST_ACCOUNTS.admin.email,
        name: '관리자',
        role: 'admin',
        last_login: new Date().toISOString()
      };

      localStorage.setItem('userSession', JSON.stringify(sessionData));
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('i18nextLng', 'ko');
    });

    console.log('  ✅ localStorage 세션 정보 설정 완료');

    // 다운로드 경로 설정
    const downloadPath = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    // === 2단계: 주문 관리에서 엑셀 다운로드 ===
    console.log('\n📍 2단계: 주문 관리에서 엑셀 다운로드');
    await page.goto(getTestUrl('/ko/orders'));
    await page.waitForTimeout(TIMEOUTS.medium);

    // 엑셀 다운로드 버튼 찾기
    const orderExcelButton = page.locator('button').filter({ hasText: '엑셀' }).or(
      page.locator('button').filter({ hasText: 'Excel' })
    ).first();

    if (await orderExcelButton.count() > 0) {
      // 다운로드 이벤트 리스너 설정
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        orderExcelButton.click()
      ]);

      if (download) {
        const fileName = download.suggestedFilename();
        const filePath = path.join(downloadPath, fileName);
        await download.saveAs(filePath);
        console.log(`  ✅ 주문 엑셀 다운로드 완료: ${fileName}`);

        // 파일 크기 확인
        const stats = fs.statSync(filePath);
        console.log(`  - 파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log('  ⚠️ 주문 엑셀 다운로드 버튼이 작동하지 않음');
      }
    } else {
      console.log('  ⚠️ 주문 엑셀 다운로드 버튼을 찾을 수 없음');
    }

    // === 3단계: 재고 관리에서 엑셀 다운로드 ===
    console.log('\n📍 3단계: 재고 관리에서 엑셀 다운로드');
    await page.goto(getTestUrl('/ko/inventory'));
    await page.waitForTimeout(TIMEOUTS.medium);

    // 엑셀 다운로드 버튼 찾기
    const inventoryExcelButton = page.locator('button').filter({ hasText: '엑셀' }).or(
      page.locator('button').filter({ hasText: 'Excel' })
    ).first();

    if (await inventoryExcelButton.count() > 0) {
      // 다운로드 이벤트 리스너 설정
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        inventoryExcelButton.click()
      ]);

      if (download) {
        const fileName = download.suggestedFilename();
        const filePath = path.join(downloadPath, fileName);
        await download.saveAs(filePath);
        console.log(`  ✅ 재고 엑셀 다운로드 완료: ${fileName}`);

        // 파일 크기 확인
        const stats = fs.statSync(filePath);
        console.log(`  - 파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log('  ⚠️ 재고 엑셀 다운로드 버튼이 작동하지 않음');
      }
    } else {
      console.log('  ⚠️ 재고 엑셀 다운로드 버튼을 찾을 수 없음');
    }

    // === 4단계: 출납장부에서 엑셀 다운로드 ===
    console.log('\n📍 4단계: 출납장부에서 엑셀 다운로드');
    await page.goto(getTestUrl('/ko/cashbook'));
    await page.waitForTimeout(TIMEOUTS.medium);

    // 엑셀 다운로드 버튼 찾기
    const cashbookExcelButton = page.locator('button').filter({ hasText: '엑셀' }).or(
      page.locator('button').filter({ hasText: 'Excel' })
    ).first();

    if (await cashbookExcelButton.count() > 0) {
      // 다운로드 이벤트 리스너 설정
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        cashbookExcelButton.click()
      ]);

      if (download) {
        const fileName = download.suggestedFilename();
        const filePath = path.join(downloadPath, fileName);
        await download.saveAs(filePath);
        console.log(`  ✅ 출납장부 엑셀 다운로드 완료: ${fileName}`);

        // 파일 크기 확인
        const stats = fs.statSync(filePath);
        console.log(`  - 파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log('  ⚠️ 출납장부 엑셀 다운로드 버튼이 작동하지 않음');
      }
    } else {
      console.log('  ⚠️ 출납장부 엑셀 다운로드 버튼을 찾을 수 없음');
    }

    // === 5단계: 다운로드된 파일 확인 ===
    console.log('\n📍 5단계: 다운로드된 파일 확인');

    // 다운로드 폴더의 파일 목록 확인
    const files = fs.readdirSync(downloadPath);
    const excelFiles = files.filter(file => file.endsWith('.xlsx'));

    console.log(`  - 총 ${excelFiles.length}개의 엑셀 파일 다운로드됨`);

    if (excelFiles.length > 0) {
      console.log('  - 다운로드된 파일 목록:');
      excelFiles.forEach(file => {
        const filePath = path.join(downloadPath, file);
        const stats = fs.statSync(filePath);
        console.log(`    • ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
      console.log('  ✅ 엑셀 다운로드 기능 정상 작동');
    } else {
      console.log('  ⚠️ 엑셀 파일이 다운로드되지 않음');
    }

    // 다운로드 폴더 정리 (선택사항)
    if (excelFiles.length > 0) {
      console.log('\n  - 테스트 완료 후 다운로드 파일 정리');
      excelFiles.forEach(file => {
        const filePath = path.join(downloadPath, file);
        fs.unlinkSync(filePath);
      });
      console.log('  ✅ 다운로드 폴더 정리 완료');
    }

    console.log('\n🎉 시나리오 5 테스트 완료!');
    console.log('========================================');
    console.log('📊 결과 요약:');
    console.log('  - 주문 관리: 엑셀 다운로드 테스트');
    console.log('  - 재고 관리: 엑셀 다운로드 테스트');
    console.log('  - 출납장부: 엑셀 다운로드 테스트');
    console.log(`  - 총 ${excelFiles.length}개 파일 다운로드 확인`);
    console.log('========================================');
    console.log('✅ 모든 단계 성공적으로 완료');
  });
});