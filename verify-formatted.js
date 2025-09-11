const ExcelJS = require('exceljs');

async function verifyExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('/tmp/bulk-order-formatted.xlsx');
    
    console.log('✅ Excel 파일이 정상적으로 열립니다!');
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name).join(', '));
    
    // 상품리스트 시트 확인
    const productListSheet = workbook.getWorksheet('상품리스트');
    if (productListSheet) {
      console.log('\n📄 상품리스트 시트 (드롭다운용):');
      console.log('  행 수:', productListSheet.rowCount);
      console.log('  숨김 상태:', productListSheet.state);
      
      // 샘플 데이터 (모델명으로 정렬되었는지 확인)
      console.log('\n  📝 상품 목록 (모델명 정렬 확인):');
      for (let i = 2; i <= Math.min(6, productListSheet.rowCount); i++) {
        const row = productListSheet.getRow(i);
        const value = row.getCell(1).value;
        if (value) {
          const parts = value.split(':');
          console.log(`    ${i-1}. 모델: ${parts[0]}, 상품: ${parts[1]}, 카테고리: ${parts[2]}, 색상: ${parts[3]}, 브랜드: ${parts[4]}`);
        }
      }
    }
    
    // 주문입력 시트 확인
    const orderSheet = workbook.getWorksheet('주문입력');
    if (orderSheet) {
      console.log('\n📄 주문입력 시트:');
      
      // 샘플 데이터 확인
      const row2 = orderSheet.getRow(2);
      const productValue = row2.getCell(9).value; // 상품선택 컬럼
      if (productValue) {
        console.log('\n  📝 샘플 상품선택 데이터:');
        console.log(`    원본: ${productValue}`);
        const parts = productValue.split(':');
        if (parts.length === 5) {
          console.log(`    모델: ${parts[0]}`);
          console.log(`    상품명: ${parts[1]}`);
          console.log(`    카테고리: ${parts[2]}`);
          console.log(`    색상: ${parts[3]}`);
          console.log(`    브랜드: ${parts[4]}`);
        }
      }
      
      // 드롭다운 확인
      const cellI2 = orderSheet.getCell('I2');
      if (cellI2.dataValidation) {
        console.log('\n  ✅ 드롭다운 설정 확인됨');
        console.log('    참조: ' + cellI2.dataValidation.formulae);
      }
    }
    
  } catch (error) {
    console.error('❌ Excel 파일 읽기 오류:', error.message);
  }
}

verifyExcel();