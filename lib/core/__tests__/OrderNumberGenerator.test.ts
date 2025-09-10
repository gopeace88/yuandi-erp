import { OrderNumberGenerator } from '../utils/OrderNumberGenerator';

describe('OrderNumberGenerator', () => {
  beforeEach(() => {
    // 각 테스트 전에 카운터 리셋
    OrderNumberGenerator.reset();
  });
  
  describe('generate', () => {
    it('should generate order number with correct pattern', async () => {
      const orderNo = await OrderNumberGenerator.generate();
      
      // 패턴 검증: YYMMDD-###
      expect(orderNo).toMatch(/^\d{6}-\d{3}$/);
    });
    
    it('should start with 001 for first order of the day', async () => {
      const orderNo = await OrderNumberGenerator.generate();
      
      expect(orderNo).toMatch(/^\d{6}-001$/);
    });
    
    it('should increment sequence for same day', async () => {
      const orderNo1 = await OrderNumberGenerator.generate();
      const orderNo2 = await OrderNumberGenerator.generate();
      const orderNo3 = await OrderNumberGenerator.generate();
      
      expect(orderNo1).toMatch(/-001$/);
      expect(orderNo2).toMatch(/-002$/);
      expect(orderNo3).toMatch(/-003$/);
    });
    
    it('should handle existing order numbers', async () => {
      const today = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(today.getTime() + kstOffset);
      
      const year = kstDate.getUTCFullYear().toString().slice(2);
      const month = (kstDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = kstDate.getUTCDate().toString().padStart(2, '0');
      const dateKey = `${year}${month}${day}`;
      
      const existingNumbers = [
        `${dateKey}-001`,
        `${dateKey}-002`,
        `${dateKey}-005`,
      ];
      
      const orderNo = await OrderNumberGenerator.generate(existingNumbers);
      
      expect(orderNo).toBe(`${dateKey}-006`);
    });
    
    it('should handle concurrent generation', async () => {
      const promises = [];
      
      // 10개 동시 생성
      for (let i = 0; i < 10; i++) {
        promises.push(OrderNumberGenerator.generate());
      }
      
      const orderNumbers = await Promise.all(promises);
      
      // 모든 번호가 유니크해야 함
      const uniqueNumbers = new Set(orderNumbers);
      expect(uniqueNumbers.size).toBe(10);
      
      // 순서대로 생성되어야 함
      const sequences = orderNumbers.map(no => parseInt(no.slice(-3), 10));
      const sortedSequences = [...sequences].sort((a, b) => a - b);
      
      expect(sequences).toEqual(sortedSequences);
    });
    
    it('should use Korean time (UTC+9)', async () => {
      const orderNo = await OrderNumberGenerator.generate();
      
      // 한국 시간 계산
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(now.getTime() + kstOffset);
      
      const expectedYear = kstDate.getUTCFullYear().toString().slice(2);
      const expectedMonth = (kstDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const expectedDay = kstDate.getUTCDate().toString().padStart(2, '0');
      const expectedDateKey = `${expectedYear}${expectedMonth}${expectedDay}`;
      
      expect(orderNo).toContain(`${expectedDateKey}-`);
    });
  });
  
  describe('generateSync', () => {
    it('should generate order number synchronously', () => {
      const orderNo = OrderNumberGenerator.generateSync();
      
      expect(orderNo).toMatch(/^\d{6}-\d{3}$/);
    });
    
    it('should increment sequence correctly', () => {
      const orderNo1 = OrderNumberGenerator.generateSync();
      const orderNo2 = OrderNumberGenerator.generateSync();
      
      expect(orderNo1).toMatch(/-001$/);
      expect(orderNo2).toMatch(/-002$/);
    });
  });
  
  describe('validate', () => {
    it('should validate correct order number format', () => {
      expect(OrderNumberGenerator.validate('241225-001')).toBe(true);
      expect(OrderNumberGenerator.validate('240101-999')).toBe(true);
    });
    
    it('should reject invalid order number format', () => {
      expect(OrderNumberGenerator.validate('INVALID')).toBe(false);
      expect(OrderNumberGenerator.validate('241225')).toBe(false); // Missing sequence
      expect(OrderNumberGenerator.validate('241225-1')).toBe(false); // Short sequence
      expect(OrderNumberGenerator.validate('ORD-241225-001')).toBe(false); // Old format
      expect(OrderNumberGenerator.validate('241325-001')).toBe(false); // Invalid month
      expect(OrderNumberGenerator.validate('240230-001')).toBe(false); // Invalid day
    });
  });
  
  describe('parse', () => {
    it('should parse valid order number correctly', () => {
      const orderNo = '241225-001';
      const parsed = OrderNumberGenerator.parse(orderNo);
      
      expect(parsed).not.toBeNull();
      expect(parsed!.date.getFullYear()).toBe(2024);
      expect(parsed!.date.getMonth()).toBe(11); // December (0-indexed)
      expect(parsed!.date.getDate()).toBe(25);
      expect(parsed!.sequence).toBe(1);
    });
    
    it('should return null for invalid order number', () => {
      expect(OrderNumberGenerator.parse('INVALID')).toBeNull();
      expect(OrderNumberGenerator.parse('')).toBeNull();
      expect(OrderNumberGenerator.parse('999999-001')).toBeNull();
    });
  });
  
  describe('reset', () => {
    it('should reset all counters', async () => {
      // 첫 번째 생성
      const orderNo1 = await OrderNumberGenerator.generate();
      expect(orderNo1).toMatch(/-001$/);
      
      // 리셋
      OrderNumberGenerator.reset();
      
      // 리셋 후 다시 001부터 시작
      const orderNo2 = await OrderNumberGenerator.generate();
      expect(orderNo2).toMatch(/-001$/);
    });
  });
});