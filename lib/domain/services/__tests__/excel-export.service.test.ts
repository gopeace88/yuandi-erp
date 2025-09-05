import { ExcelExportService, ExportFormat } from '../excel-export.service';

describe('Excel Export Service', () => {
  let excelService: ExcelExportService;

  beforeEach(() => {
    excelService = new ExcelExportService();
  });

  describe('CSV Export', () => {
    it('should export data to CSV format', () => {
      const data = [
        { id: 1, name: '상품A', price: 10000, stock: 5 },
        { id: 2, name: '상품B', price: 20000, stock: 3 }
      ];

      const csv = excelService.exportToCSV(data, ['id', 'name', 'price', 'stock']);
      
      expect(csv).toContain('id,name,price,stock');
      expect(csv).toContain('1,"상품A",10000,5');
      expect(csv).toContain('2,"상품B",20000,3');
    });

    it('should handle special characters in CSV', () => {
      const data = [
        { name: '상품,A', description: 'Line1\nLine2', price: '₩10,000' }
      ];

      const csv = excelService.exportToCSV(data);
      
      expect(csv).toContain('"상품,A"');
      expect(csv).toContain('"Line1\nLine2"');
      expect(csv).toContain('"₩10,000"');
    });

    it('should export with Korean headers', () => {
      const data = [
        { id: 1, name: '상품A', price: 10000 }
      ];

      const headers = {
        id: '번호',
        name: '상품명',
        price: '가격'
      };

      const csv = excelService.exportToCSV(data, ['id', 'name', 'price'], headers);
      
      expect(csv).toContain('번호,상품명,가격');
    });
  });

  describe('Excel XML Export', () => {
    it('should export data to Excel XML format', () => {
      const data = [
        { id: 1, name: '상품A', price: 10000 },
        { id: 2, name: '상품B', price: 20000 }
      ];

      const xml = excelService.exportToExcelXML(data, '상품목록');
      
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<Worksheet ss:Name="상품목록">');
      expect(xml).toContain('<Data ss:Type="Number">10000</Data>');
      expect(xml).toContain('<Data ss:Type="String">상품A</Data>');
    });

    it('should handle multiple worksheets', () => {
      const sheets = [
        {
          name: '주문목록',
          data: [
            { orderNo: 'ORD-001', customer: '홍길동', total: 50000 }
          ]
        },
        {
          name: '상품목록',
          data: [
            { sku: 'SKU-001', name: '상품A', stock: 10 }
          ]
        }
      ];

      const xml = excelService.exportMultipleSheetsToXML(sheets);
      
      expect(xml).toContain('<Worksheet ss:Name="주문목록">');
      expect(xml).toContain('<Worksheet ss:Name="상품목록">');
      expect(xml).toContain('ORD-001');
      expect(xml).toContain('SKU-001');
    });
  });

  describe('HTML Table Export', () => {
    it('should export data to HTML table', () => {
      const data = [
        { id: 1, name: '상품A', price: 10000 },
        { id: 2, name: '상품B', price: 20000 }
      ];

      const html = excelService.exportToHTMLTable(data, {
        title: '상품 목록',
        styles: true
      });
      
      expect(html).toContain('<table');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('상품A');
      expect(html).toContain('10000');
    });

    it('should include Excel-compatible styles', () => {
      const data = [{ id: 1, name: 'Test' }];
      const html = excelService.exportToHTMLTable(data, {
        styles: true,
        excelCompatible: true
      });
      
      expect(html).toContain('mso-number-format');
      expect(html).toContain('border-collapse');
    });
  });

  describe('Data Formatting', () => {
    it('should format dates correctly', () => {
      const data = [
        { 
          date: new Date('2024-08-23T10:00:00'), 
          name: 'Order 1' 
        }
      ];

      const formatted = excelService.formatDataForExport(data);
      
      expect(formatted[0].date).toMatch(/2024-08-23/);
    });

    it('should format currency values', () => {
      const data = [
        { price: 10000, currency: 'KRW' },
        { price: 100, currency: 'CNY' }
      ];

      const formatted = excelService.formatDataForExport(data, {
        currencyFields: ['price']
      });
      
      expect(formatted[0].price).toBe('₩10,000');
      expect(formatted[1].price).toBe('¥100');
    });

    it('should handle null and undefined values', () => {
      const data = [
        { id: 1, name: null, description: undefined }
      ];

      const formatted = excelService.formatDataForExport(data);
      
      expect(formatted[0].name).toBe('');
      expect(formatted[0].description).toBe('');
    });
  });

  describe('File Generation', () => {
    it('should generate downloadable blob for CSV', () => {
      const data = [
        { id: 1, name: '상품A' }
      ];

      const blob = excelService.generateCSVBlob(data);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');
    });

    it('should generate downloadable blob for Excel', () => {
      const data = [
        { id: 1, name: '상품A' }
      ];

      const blob = excelService.generateExcelBlob(data, 'Sheet1');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.ms-excel');
    });

    it('should trigger download', () => {
      const data = [
        { id: 1, name: '상품A' }
      ];

      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      
      excelService.downloadExcel(data, 'products.xlsx');
      
      expect(mockLink.download).toBe('products.xlsx');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('Advanced Features', () => {
    it('should apply column widths', () => {
      const data = [
        { id: 1, name: '긴 상품명입니다', price: 10000 }
      ];

      const xml = excelService.exportToExcelXML(data, 'Sheet1', {
        columnWidths: { id: 50, name: 200, price: 100 }
      });
      
      expect(xml).toContain('ss:Width="50"');
      expect(xml).toContain('ss:Width="200"');
      expect(xml).toContain('ss:Width="100"');
    });

    it('should apply cell formatting', () => {
      const data = [
        { id: 1, name: '상품', price: 10000, date: '2024-08-23' }
      ];

      const xml = excelService.exportToExcelXML(data, 'Sheet1', {
        formatting: {
          price: { type: 'currency', format: '#,##0' },
          date: { type: 'date', format: 'yyyy-mm-dd' }
        }
      });
      
      expect(xml).toContain('ss:Type="Number"');
      expect(xml).toContain('ss:StyleID=');
    });

    it('should add summary row', () => {
      const data = [
        { name: '상품A', quantity: 5, price: 10000 },
        { name: '상품B', quantity: 3, price: 20000 }
      ];

      const result = excelService.addSummaryRow(data, {
        quantity: 'sum',
        price: 'sum'
      });
      
      expect(result).toHaveLength(3);
      expect(result[2].name).toBe('합계');
      expect(result[2].quantity).toBe(8);
      expect(result[2].price).toBe(30000);
    });

    it('should filter and sort data before export', () => {
      const data = [
        { id: 3, name: '상품C', active: false },
        { id: 1, name: '상품A', active: true },
        { id: 2, name: '상품B', active: true }
      ];

      const processed = excelService.processDataForExport(data, {
        filter: (item) => item.active,
        sort: (a, b) => a.id - b.id
      });
      
      expect(processed).toHaveLength(2);
      expect(processed[0].id).toBe(1);
      expect(processed[1].id).toBe(2);
    });
  });
});