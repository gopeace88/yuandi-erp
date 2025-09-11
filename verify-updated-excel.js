const ExcelJS = require('exceljs');

async function verifyExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('/tmp/bulk-order-updated.xlsx');
    
    console.log('✅ Excel file opens successfully!');
    console.log('📋 Worksheets:', workbook.worksheets.map(ws => ws.name).join(', '));
    
    // Check 주문입력 sheet specifically
    const orderSheet = workbook.getWorksheet('주문입력');
    if (orderSheet) {
      console.log('\n📄 주문입력 Sheet Details:');
      console.log(`  Rows: ${orderSheet.rowCount}`);
      console.log(`  Columns: ${orderSheet.columnCount}`);
      
      // Check headers
      const headerRow = orderSheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell, colNum) => {
        if (cell.value) headers.push(cell.value);
      });
      console.log(`  Headers: ${headers.join(', ')}`);
      
      // Check if column I (9th column) has dropdown
      const cellI2 = orderSheet.getCell('I2');
      if (cellI2.dataValidation) {
        console.log('\n✅ Dropdown validation found on column I (상품선택)');
        console.log('  Type:', cellI2.dataValidation.type);
        if (cellI2.dataValidation.formulae && cellI2.dataValidation.formulae[0]) {
          const formula = cellI2.dataValidation.formulae[0];
          // Extract first few items from dropdown list
          const items = formula.substring(1, formula.length - 1).split(',').slice(0, 3);
          console.log('  Sample items:', items.join(', '), '...');
        }
      } else {
        console.log('❌ No dropdown found on column I');
      }
      
      // Check sample data in row 2
      console.log('\n📝 Sample data (row 2):');
      const row2 = orderSheet.getRow(2);
      row2.eachCell((cell, colNum) => {
        if (cell.value && colNum <= 12) {
          const header = headerRow.getCell(colNum).value;
          console.log(`  ${header}: ${cell.value}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
  }
}

verifyExcel();