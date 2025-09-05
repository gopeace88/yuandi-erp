/**
 * 엑셀 내보내기 서비스
 * 네이티브 모듈 없이 CSV, Excel XML, HTML Table 형식으로 내보내기
 */

export enum ExportFormat {
  CSV = 'csv',
  EXCEL_XML = 'excel_xml',
  HTML = 'html'
}

export interface ExportOptions {
  format?: ExportFormat;
  filename?: string;
  sheetName?: string;
  headers?: { [key: string]: string };
  columnWidths?: { [key: string]: number };
  formatting?: { [key: string]: CellFormat };
  styles?: boolean;
  excelCompatible?: boolean;
  encoding?: string;
}

export interface CellFormat {
  type: 'text' | 'number' | 'currency' | 'date' | 'percentage';
  format?: string;
}

export interface WorksheetData {
  name: string;
  data: any[];
  headers?: { [key: string]: string };
}

export interface ProcessOptions {
  filter?: (item: any) => boolean;
  sort?: (a: any, b: any) => number;
}

export interface FormatOptions {
  currencyFields?: string[];
  dateFields?: string[];
  numberFields?: string[];
}

/**
 * 엑셀 내보내기 서비스
 */
export class ExcelExportService {
  /**
   * CSV 형식으로 내보내기
   */
  exportToCSV(
    data: any[], 
    columns?: string[], 
    headers?: { [key: string]: string }
  ): string {
    if (!data || data.length === 0) {
      return '';
    }

    const cols = columns || Object.keys(data[0]);
    const headerRow = cols.map(col => headers?.[col] || col);
    
    const csvRows = [headerRow.join(',')];
    
    for (const row of data) {
      const values = cols.map(col => {
        const value = row[col];
        return this.escapeCSVValue(value);
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * CSV 값 이스케이프 처리
   */
  private escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const strValue = String(value);
    
    // 쉼표, 줄바꿈, 따옴표가 있는 경우 따옴표로 감싸기
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
      return `"${strValue.replace(/"/g, '""')}"`;
    }
    
    return strValue;
  }

  /**
   * Excel XML 형식으로 내보내기
   */
  exportToExcelXML(
    data: any[], 
    sheetName: string = 'Sheet1',
    options?: ExportOptions
  ): string {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
      ' xmlns:o="urn:schemas-microsoft-com:office:office"',
      ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
      ' xmlns:html="http://www.w3.org/TR/REC-html40">',
      this.generateStyles(options?.formatting),
      `<Worksheet ss:Name="${this.escapeXML(sheetName)}">`,
      '<Table>'
    ];

    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      
      // Column widths
      if (options?.columnWidths) {
        columns.forEach(col => {
          const width = options.columnWidths![col];
          if (width) {
            xml.push(`<Column ss:Width="${width}"/>`);
          }
        });
      }

      // Header row
      xml.push('<Row>');
      columns.forEach(col => {
        const header = options?.headers?.[col] || col;
        xml.push(`<Cell><Data ss:Type="String">${this.escapeXML(header)}</Data></Cell>`);
      });
      xml.push('</Row>');

      // Data rows
      data.forEach(row => {
        xml.push('<Row>');
        columns.forEach(col => {
          const value = row[col];
          const cellXml = this.generateCellXML(value, col, options?.formatting);
          xml.push(cellXml);
        });
        xml.push('</Row>');
      });
    }

    xml.push('</Table>');
    xml.push('</Worksheet>');
    xml.push('</Workbook>');

    return xml.join('\n');
  }

  /**
   * 여러 시트를 Excel XML로 내보내기
   */
  exportMultipleSheetsToXML(sheets: WorksheetData[]): string {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
      ' xmlns:o="urn:schemas-microsoft-com:office:office"',
      ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
    ];

    sheets.forEach(sheet => {
      xml.push(`<Worksheet ss:Name="${this.escapeXML(sheet.name)}">`);
      xml.push('<Table>');

      if (sheet.data.length > 0) {
        const columns = Object.keys(sheet.data[0]);
        
        // Header row
        xml.push('<Row>');
        columns.forEach(col => {
          const header = sheet.headers?.[col] || col;
          xml.push(`<Cell><Data ss:Type="String">${this.escapeXML(header)}</Data></Cell>`);
        });
        xml.push('</Row>');

        // Data rows
        sheet.data.forEach(row => {
          xml.push('<Row>');
          columns.forEach(col => {
            const value = row[col];
            const cellXml = this.generateCellXML(value);
            xml.push(cellXml);
          });
          xml.push('</Row>');
        });
      }

      xml.push('</Table>');
      xml.push('</Worksheet>');
    });

    xml.push('</Workbook>');
    return xml.join('\n');
  }

  /**
   * HTML 테이블로 내보내기
   */
  exportToHTMLTable(
    data: any[], 
    options?: { title?: string; styles?: boolean; excelCompatible?: boolean }
  ): string {
    const html = [];

    if (options?.styles) {
      html.push('<style>');
      html.push('table { border-collapse: collapse; width: 100%; }');
      html.push('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
      html.push('th { background-color: #f2f2f2; font-weight: bold; }');
      
      if (options.excelCompatible) {
        html.push('td.number { mso-number-format:"\\#\\,\\#\\#0"; }');
        html.push('td.currency { mso-number-format:"\\#\\,\\#\\#0"; }');
        html.push('td.date { mso-number-format:"yyyy\\-mm\\-dd"; }');
      }
      
      html.push('</style>');
    }

    if (options?.title) {
      html.push(`<h2>${options.title}</h2>`);
    }

    html.push('<table>');
    
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      
      // Header
      html.push('<thead><tr>');
      columns.forEach(col => {
        html.push(`<th>${col}</th>`);
      });
      html.push('</tr></thead>');

      // Body
      html.push('<tbody>');
      data.forEach(row => {
        html.push('<tr>');
        columns.forEach(col => {
          const value = row[col];
          const cellClass = this.getCellClass(value);
          html.push(`<td${cellClass ? ` class="${cellClass}"` : ''}>${value || ''}</td>`);
        });
        html.push('</tr>');
      });
      html.push('</tbody>');
    }

    html.push('</table>');
    return html.join('\n');
  }

  /**
   * 데이터 포맷팅
   */
  formatDataForExport(data: any[], options?: FormatOptions): any[] {
    return data.map(row => {
      const formatted: any = {};
      
      Object.keys(row).forEach(key => {
        let value = row[key];
        
        // Null/undefined 처리
        if (value === null || value === undefined) {
          formatted[key] = '';
          return;
        }

        // Date 처리
        if (value instanceof Date) {
          formatted[key] = this.formatDate(value);
        } 
        // Currency 처리
        else if (options?.currencyFields?.includes(key)) {
          formatted[key] = this.formatCurrency(value, row.currency);
        }
        // Number 처리
        else if (typeof value === 'number') {
          formatted[key] = value;
        }
        // 기타
        else {
          formatted[key] = String(value);
        }
      });
      
      return formatted;
    });
  }

  /**
   * CSV Blob 생성
   */
  generateCSVBlob(data: any[]): Blob {
    const csv = this.exportToCSV(data);
    const BOM = '\uFEFF'; // UTF-8 BOM
    return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Excel Blob 생성
   */
  generateExcelBlob(data: any[], sheetName: string): Blob {
    const xml = this.exportToExcelXML(data, sheetName);
    return new Blob([xml], { type: 'application/vnd.ms-excel' });
  }

  /**
   * 파일 다운로드
   */
  downloadExcel(data: any[], filename: string, format: ExportFormat = ExportFormat.EXCEL_XML): void {
    let blob: Blob;
    
    if (format === ExportFormat.CSV) {
      blob = this.generateCSVBlob(data);
    } else {
      const sheetName = filename.replace(/\.[^/.]+$/, '');
      blob = this.generateExcelBlob(data, sheetName);
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * 요약 행 추가
   */
  addSummaryRow(data: any[], summaryConfig: { [key: string]: 'sum' | 'avg' | 'count' }): any[] {
    if (data.length === 0) return data;

    const summary: any = {};
    const firstKey = Object.keys(data[0])[0];
    summary[firstKey] = '합계';

    Object.keys(summaryConfig).forEach(key => {
      const operation = summaryConfig[key];
      
      if (operation === 'sum') {
        summary[key] = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
      } else if (operation === 'avg') {
        const sum = data.reduce((s, row) => s + (Number(row[key]) || 0), 0);
        summary[key] = sum / data.length;
      } else if (operation === 'count') {
        summary[key] = data.filter(row => row[key] !== null && row[key] !== undefined).length;
      }
    });

    return [...data, summary];
  }

  /**
   * 데이터 처리 (필터링, 정렬)
   */
  processDataForExport(data: any[], options: ProcessOptions): any[] {
    let processed = [...data];

    if (options.filter) {
      processed = processed.filter(options.filter);
    }

    if (options.sort) {
      processed = processed.sort(options.sort);
    }

    return processed;
  }

  // Private helper methods

  private escapeXML(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private generateCellXML(value: any, column?: string, formatting?: { [key: string]: CellFormat }): string {
    if (value === null || value === undefined) {
      return '<Cell><Data ss:Type="String"></Data></Cell>';
    }

    const format = formatting?.[column || ''];
    let type = 'String';
    let processedValue = value;

    if (typeof value === 'number') {
      type = 'Number';
    } else if (value instanceof Date) {
      type = 'String';
      processedValue = this.formatDate(value);
    } else {
      processedValue = this.escapeXML(String(value));
    }

    const styleAttr = format ? ` ss:StyleID="${format.type}"` : '';
    return `<Cell${styleAttr}><Data ss:Type="${type}">${processedValue}</Data></Cell>`;
  }

  private generateStyles(formatting?: { [key: string]: CellFormat }): string {
    if (!formatting) return '';

    const styles = ['<Styles>'];
    
    // Default style
    styles.push('<Style ss:ID="Default" ss:Name="Normal">');
    styles.push('<Font ss:FontName="Calibri" ss:Size="11"/>');
    styles.push('</Style>');

    // Format-specific styles
    if (Object.values(formatting).some(f => f.type === 'currency')) {
      styles.push('<Style ss:ID="currency">');
      styles.push('<NumberFormat ss:Format="#,##0"/>');
      styles.push('</Style>');
    }

    if (Object.values(formatting).some(f => f.type === 'date')) {
      styles.push('<Style ss:ID="date">');
      styles.push('<NumberFormat ss:Format="yyyy-mm-dd"/>');
      styles.push('</Style>');
    }

    styles.push('</Styles>');
    return styles.join('');
  }

  private getCellClass(value: any): string {
    if (typeof value === 'number') {
      return 'number';
    }
    if (value instanceof Date) {
      return 'date';
    }
    if (typeof value === 'string' && (value.includes('₩') || value.includes('¥'))) {
      return 'currency';
    }
    return '';
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  private formatCurrency(value: number, currency?: string): string {
    const formatted = value.toLocaleString();
    
    if (currency === 'KRW') {
      return `₩${formatted}`;
    } else if (currency === 'CNY') {
      return `¥${formatted}`;
    } else if (currency === 'USD') {
      return `$${formatted}`;
    }
    
    return formatted;
  }
}