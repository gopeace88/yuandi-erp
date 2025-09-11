const ExcelJS = require('exceljs');

async function verifyExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('/tmp/bulk-order-with-stock.xlsx');
    
    console.log('✅ Excel 파일이 정상적으로 열립니다!');
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name).join(', '));
    
    // 상품리스트 시트 확인
    const productListSheet = workbook.getWorksheet('상품리스트');
    if (productListSheet) {
      console.log('\n📄 상품리스트 시트 (드롭다운용):');
      console.log('  행 수:', productListSheet.rowCount);
      
      console.log('\n  📝 상품 목록 (재고 포함):');
      for (let i = 2; i <= Math.min(8, productListSheet.rowCount); i++) {
        const row = productListSheet.getRow(i);
        const value = row.getCell(1).value;
        if (value) {
          // [품절] 표시 확인
          if (value.startsWith('[품절]')) {
            console.log(`    ${i-1}. 🚫 ${value}`);
          } else {
            const parts = value.split(':');
            if (parts.length >= 6) {
              console.log(`    ${i-1}. ✅ 모델:${parts[0]}, 상품:${parts[1]}, 카테고리:${parts[2]}, 색상:${parts[3]}, 브랜드:${parts[4]}, ${parts[5]}`);
            }
          }
        }
      }
    }
    
    // 주문입력 시트 샘플 데이터 확인
    const orderSheet = workbook.getWorksheet('주문입력');
    if (orderSheet) {
      console.log('\n📄 주문입력 시트:');
      
      const row2 = orderSheet.getRow(2);
      const productValue = row2.getCell(9).value;
      if (productValue) {
        console.log('\n  📝 샘플 상품선택 데이터:');
        console.log(`    ${productValue}`);
      }
    }
    
    // 사용안내 시트 확인
    const guideSheet = workbook.getWorksheet('사용안내');
    if (guideSheet) {
      console.log('\n📄 사용안내 시트:');
      // 품절 관련 안내 찾기
      for (let i = 1; i <= guideSheet.rowCount; i++) {
        const row = guideSheet.getRow(i);
        const item = row.getCell(1).value;
        const desc = row.getCell(2).value;
        if (item && item.toString().includes('품절')) {
          console.log(`  ✅ 품절 안내: ${desc}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Excel 파일 읽기 오류:', error.message);
  }
}

verifyExcel();