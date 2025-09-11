const ExcelJS = require('exceljs');

async function verifyExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('/tmp/bulk-order-fixed.xlsx');
    
    console.log('✅ Excel 파일이 정상적으로 열립니다!');
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name).join(', '));
    
    // 상품리스트 시트 확인
    const productListSheet = workbook.getWorksheet('상품리스트');
    if (productListSheet) {
      console.log('\n📄 상품리스트 시트:');
      console.log('  행 수:', productListSheet.rowCount);
      console.log('  숨김 상태:', productListSheet.state);
      
      // 샘플 데이터
      console.log('  샘플 데이터:');
      for (let i = 1; i <= Math.min(5, productListSheet.rowCount); i++) {
        const row = productListSheet.getRow(i);
        console.log(`    행 ${i}: ${row.getCell(1).value}`);
      }
    }
    
    // 주문입력 시트 확인
    const orderSheet = workbook.getWorksheet('주문입력');
    if (orderSheet) {
      console.log('\n📄 주문입력 시트:');
      
      // 드롭다운 확인
      const cellI2 = orderSheet.getCell('I2');
      if (cellI2.dataValidation) {
        console.log('  ✅ 드롭다운 설정 있음');
        console.log('    타입:', cellI2.dataValidation.type);
        console.log('    참조:', cellI2.dataValidation.formulae);
      } else {
        console.log('  ❌ 드롭다운 설정 없음');
      }
    }
    
    console.log('\n📝 파일 크기:', require('fs').statSync('/tmp/bulk-order-fixed.xlsx').size, 'bytes');
    
  } catch (error) {
    console.error('❌ Excel 파일 읽기 오류:', error.message);
  }
}

verifyExcel();