const ExcelJS = require('exceljs');

async function verifyExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('/tmp/bulk-order-test.xlsx');
    
    console.log('✅ Excel file opens successfully!');
    console.log('📋 Worksheets:', workbook.worksheets.map(ws => ws.name).join(', '));
    
    // Check each sheet
    workbook.worksheets.forEach(ws => {
      console.log(`\n📄 Sheet: ${ws.name}`);
      console.log(`  Rows: ${ws.rowCount}`);
      console.log(`  Columns: ${ws.columnCount}`);
      
      // Check first row (headers)
      if (ws.rowCount > 0) {
        const headerRow = ws.getRow(1);
        const headers = [];
        headerRow.eachCell((cell, colNum) => {
          if (cell.value) headers.push(cell.value);
        });
        console.log(`  Headers: ${headers.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
  }
}

verifyExcel();