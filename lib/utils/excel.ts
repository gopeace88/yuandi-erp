import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportExcelParams {
  data: any[];
  columns: ExcelColumn[];
  fileName: string;
  sheetName?: string;
}

export const exportToExcel = ({ data, columns, fileName, sheetName = 'Sheet1' }: ExportExcelParams) => {
  // 헤더 생성
  const headers = columns.map(col => col.header);
  
  // 데이터 변환
  const rows = data.map(item => {
    return columns.map(col => {
      const keys = col.key.split('.');
      let value = item;
      
      // 중첩된 객체 속성 접근 (예: 'customer.name')
      for (const key of keys) {
        value = value?.[key];
      }
      
      // null이나 undefined는 빈 문자열로
      return value ?? '';
    });
  });
  
  // 워크시트 데이터 생성
  const wsData = [headers, ...rows];
  
  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // 컬럼 너비 설정
  if (columns.some(col => col.width)) {
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
  }
  
  // 워크북 생성
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // 엑셀 파일 생성
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // 파일 다운로드
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(blob, `${fileName}_${timestamp}.xlsx`);
};

// 날짜 포맷팅 헬퍼
export const formatDateForExcel = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR');
};

// 통화 포맷팅 헬퍼
export const formatCurrencyForExcel = (amount: number, currency: string = 'KRW'): string => {
  if (amount == null) return '';
  
  switch (currency) {
    case 'KRW':
      return `₩${amount.toLocaleString('ko-KR')}`;
    case 'CNY':
      return `¥${amount.toLocaleString('zh-CN')}`;
    case 'USD':
      return `$${amount.toLocaleString('en-US')}`;
    default:
      return amount.toString();
  }
};