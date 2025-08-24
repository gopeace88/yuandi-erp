import {
  formatDate,
  formatCurrency,
  formatNumber,
  formatPhoneNumber,
  formatRelativeTime,
} from '@/lib/i18n/formatters';

describe('i18n Formatters', () => {
  describe('formatDate', () => {
    const testDate = '2024-08-23T10:30:00Z';

    it('should format date in Korean locale', () => {
      const result = formatDate(testDate, 'ko');
      expect(result).toMatch(/2024년 8월 23일/);
    });

    it('should format date in Chinese locale', () => {
      const result = formatDate(testDate, 'zh-CN');
      expect(result).toMatch(/2024年8月23日/);
    });

    it('should handle null date', () => {
      expect(formatDate(null, 'ko')).toBe('');
      expect(formatDate(undefined, 'ko')).toBe('');
    });

    it('should handle invalid date', () => {
      expect(formatDate('invalid', 'ko')).toBe('Invalid Date');
    });
  });

  describe('formatCurrency', () => {
    it('should format KRW currency in Korean locale', () => {
      const result = formatCurrency(10000, 'KRW', 'ko');
      expect(result).toBe('₩10,000');
    });

    it('should format CNY currency in Chinese locale', () => {
      const result = formatCurrency(100, 'CNY', 'zh-CN');
      expect(result).toContain('100');
      expect(result).toMatch(/¥|￥/);
    });

    it('should format USD currency', () => {
      const result = formatCurrency(99.99, 'USD', 'ko');
      expect(result).toContain('99.99');
      expect(result).toContain('$');
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'KRW', 'ko');
      expect(result).toBe('₩0');
    });

    it('should handle negative amount', () => {
      const result = formatCurrency(-1000, 'KRW', 'ko');
      expect(result).toContain('1,000');
      expect(result).toContain('-');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Korean locale', () => {
      const result = formatNumber(1234567, 'ko');
      expect(result).toBe('1,234,567');
    });

    it('should format number with Chinese locale', () => {
      const result = formatNumber(1234567, 'zh-CN');
      expect(result).toBe('1,234,567');
    });

    it('should handle decimal numbers', () => {
      const result = formatNumber(1234.56, 'ko');
      expect(result).toBe('1,234.56');
    });

    it('should handle zero', () => {
      const result = formatNumber(0, 'ko');
      expect(result).toBe('0');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 11-digit mobile number', () => {
      const result = formatPhoneNumber('01012345678', 'ko');
      expect(result).toBe('010-1234-5678');
    });

    it('should format 10-digit mobile number', () => {
      const result = formatPhoneNumber('0101234567', 'ko');
      expect(result).toBe('010-123-4567');
    });

    it('should format Seoul landline number', () => {
      const result = formatPhoneNumber('0212345678', 'ko');
      expect(result).toBe('02-1234-5678');
    });

    it('should format other area landline number', () => {
      const result = formatPhoneNumber('0311234567', 'ko');
      expect(result).toBe('031-123-4567');
    });

    it('should handle numbers with dashes', () => {
      const result = formatPhoneNumber('010-1234-5678', 'ko');
      expect(result).toBe('010-1234-5678');
    });

    it('should return original for invalid format', () => {
      const result = formatPhoneNumber('123', 'ko');
      expect(result).toBe('123');
    });

    it('should handle empty string', () => {
      const result = formatPhoneNumber('', 'ko');
      expect(result).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    const now = new Date('2024-08-23T12:00:00Z');
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format time as "just now" for recent times', () => {
      const recentTime = new Date('2024-08-23T11:59:30Z');
      const result = formatRelativeTime(recentTime.toISOString(), 'ko');
      expect(result).toBe('방금 전');
    });

    it('should format minutes ago in Korean', () => {
      const pastTime = new Date('2024-08-23T11:30:00Z');
      const result = formatRelativeTime(pastTime.toISOString(), 'ko');
      expect(result).toBe('30분 전');
    });

    it('should format hours ago in Korean', () => {
      const pastTime = new Date('2024-08-23T09:00:00Z');
      const result = formatRelativeTime(pastTime.toISOString(), 'ko');
      expect(result).toBe('3시간 전');
    });

    it('should format days ago in Korean', () => {
      const pastTime = new Date('2024-08-20T12:00:00Z');
      const result = formatRelativeTime(pastTime.toISOString(), 'ko');
      expect(result).toBe('3일 전');
    });

    it('should format minutes ago in Chinese', () => {
      const pastTime = new Date('2024-08-23T11:45:00Z');
      const result = formatRelativeTime(pastTime.toISOString(), 'zh-CN');
      expect(result).toBe('15分钟前');
    });

    it('should format hours ago in Chinese', () => {
      const pastTime = new Date('2024-08-23T10:00:00Z');
      const result = formatRelativeTime(pastTime.toISOString(), 'zh-CN');
      expect(result).toBe('2小时前');
    });

    it('should format days ago in Chinese', () => {
      const pastTime = new Date('2024-08-22T12:00:00Z');
      const result = formatRelativeTime(pastTime.toISOString(), 'zh-CN');
      expect(result).toBe('1天前');
    });

    it('should handle future dates', () => {
      const futureTime = new Date('2024-08-24T12:00:00Z');
      const result = formatRelativeTime(futureTime.toISOString(), 'ko');
      expect(result).toMatch(/2024년 8월 24일/);
    });

    it('should handle null date', () => {
      expect(formatRelativeTime(null, 'ko')).toBe('');
      expect(formatRelativeTime(undefined, 'ko')).toBe('');
    });
  });
});