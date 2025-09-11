const ExcelJS = require('exceljs');

async function verifyExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('/tmp/bulk-order-new.xlsx');
    
    console.log('✅ Excel 파일이 정상적으로 열립니다!');
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name).join(', '));
    
    // 주문입력 시트 상세 확인
    const orderSheet = workbook.getWorksheet('주문입력');
    if (orderSheet) {
      console.log('\n📄 주문입력 시트 상세:');
      
      // 헤더 확인
      const headerRow = orderSheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell, colNum) => {
        if (cell.value) headers.push(cell.value);
      });
      console.log('  헤더:', headers.join(', '));
      
      // SKU 컬럼이 없는지 확인
      if (!headers.includes('SKU*') && !headers.includes('SKU')) {
        console.log('  ✅ SKU 컬럼이 제거되었습니다');
      } else {
        console.log('  ❌ SKU 컬럼이 아직 있습니다');
      }
      
      // 상품선택 컬럼이 있는지 확인
      if (headers.includes('상품선택*')) {
        console.log('  ✅ 상품선택 컬럼이 추가되었습니다');
        
        // 드롭다운 확인
        const cellI2 = orderSheet.getCell('I2');
        if (cellI2.dataValidation) {
          console.log('  ✅ 상품선택 드롭다운이 설정되었습니다');
          const formula = cellI2.dataValidation.formulae[0];
          const items = formula.substring(1, formula.length - 1).split(',').slice(0, 3);
          console.log('    샘플 아이템:', items.join(', '), '...');
        }
      } else {
        console.log('  ❌ 상품선택 컬럼이 없습니다');
      }
      
      // 샘플 데이터 확인
      console.log('\n📝 샘플 데이터 (2행):');
      const row2 = orderSheet.getRow(2);
      const sampleData = {};
      headerRow.eachCell((cell, colNum) => {
        if (cell.value && colNum <= 12) {
          const header = cell.value;
          const value = row2.getCell(colNum).value;
          if (value) {
            sampleData[header] = value;
          }
        }
      });
      
      // 주요 필드만 출력
      console.log('  고객명:', sampleData['고객명*']);
      console.log('  상품선택:', sampleData['상품선택*']);
      console.log('  수량:', sampleData['수량*']);
      console.log('  판매가:', sampleData['판매가*']);
    }
    
  } catch (error) {
    console.error('❌ Excel 파일 읽기 오류:', error.message);
  }
}

verifyExcel();