const ExcelJS = require('exceljs');
const fs = require('fs');

async function createTestFile() {
  try {
    console.log('테스트용 Excel 파일 생성 중...');
    
    const workbook = new ExcelJS.Workbook();
    
    // 주문입력 시트 생성
    const wsOrders = workbook.addWorksheet('주문입력');
    wsOrders.columns = [
      { header: '고객명*', key: 'customerName', width: 15 },
      { header: '전화번호*', key: 'customerPhone', width: 20 },
      { header: '이메일', key: 'customerEmail', width: 25 },
      { header: '카카오ID', key: 'kakaoId', width: 15 },
      { header: 'PCCC*', key: 'pccc', width: 15 },
      { header: '우편번호*', key: 'zipCode', width: 10 },
      { header: '주소*', key: 'address', width: 40 },
      { header: '상세주소', key: 'addressDetail', width: 30 },
      { header: '상품선택*', key: 'productName', width: 70 },
      { header: '수량*', key: 'quantity', width: 10 },
      { header: '판매가*', key: 'price', width: 15 },
      { header: '메모', key: 'memo', width: 30 }
    ];
    
    // 테스트 데이터 추가
    wsOrders.addRow({
      customerName: '김테스트',
      customerPhone: '010-1111-2222',
      customerEmail: 'test@example.com',
      kakaoId: 'test123',
      pccc: 'P11111111111',
      zipCode: '12345',
      address: '서울시 강남구 테스트로 123',
      addressDetail: '101호',
      productName: 'BP2024:비즈니스 백팩:BAG:그레이:YUANDI:재고25',
      quantity: 2,
      price: 75000,
      memo: '테스트 주문'
    });
    
    const filename = '/tmp/test-bulk-order.xlsx';
    await workbook.xlsx.writeFile(filename);
    console.log(`✅ 테스트 파일 생성: ${filename}`);
    
    // 파일 크기 확인
    const stats = fs.statSync(filename);
    console.log(`📊 파일 크기: ${stats.size} bytes`);
    
    // 파일 내용 검증
    const workbook2 = new ExcelJS.Workbook();
    await workbook2.xlsx.readFile(filename);
    const sheet = workbook2.getWorksheet('주문입력');
    console.log(`✅ 시트 확인: ${sheet.name}`);
    console.log(`✅ 데이터 행 수: ${sheet.rowCount}`);
    
    // 두 번째 행 (데이터) 확인
    const row2 = sheet.getRow(2);
    console.log(`✅ 테스트 데이터:
  고객명: ${row2.getCell(1).value}
  전화번호: ${row2.getCell(2).value}
  상품선택: ${row2.getCell(9).value}
  수량: ${row2.getCell(10).value}`);
    
    return filename;
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

createTestFile();