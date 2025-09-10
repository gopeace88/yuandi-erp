import { 
  generateOrderNumber, 
  getNextSequenceNumber,
  formatOrderDate,
  parseOrderNumber,
  isValidOrderNumber 
} from '../order-number.service';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn()
};

describe('Order Number Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date to ensure consistent test results
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-08-23T10:00:00+09:00')); // Asia/Seoul timezone
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatOrderDate', () => {
    it('should format date as YYMMDD', () => {
      const date = new Date('2024-08-23');
      expect(formatOrderDate(date)).toBe('240823');
    });

    it('should handle different years correctly', () => {
      expect(formatOrderDate(new Date('2023-01-01'))).toBe('230101');
      expect(formatOrderDate(new Date('2025-12-31'))).toBe('251231');
    });

    it('should pad single digits with zero', () => {
      expect(formatOrderDate(new Date('2024-01-05'))).toBe('240105');
      expect(formatOrderDate(new Date('2024-05-01'))).toBe('240501');
    });
  });

  describe('getNextSequenceNumber', () => {
    it('should return 1 when no orders exist for the date', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          like: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      });

      const nextNumber = await getNextSequenceNumber(mockSupabaseClient as any, '240823');
      expect(nextNumber).toBe(1);
    });

    it('should increment the last order number', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          like: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { order_no: '240823-005' }, 
                  error: null 
                })
              })
            })
          })
        })
      });

      const nextNumber = await getNextSequenceNumber(mockSupabaseClient as any, '240823');
      expect(nextNumber).toBe(6);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          like: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: new Error('Database error') 
                })
              })
            })
          })
        })
      });

      await expect(
        getNextSequenceNumber(mockSupabaseClient as any, '240823')
      ).rejects.toThrow('Failed to get next sequence number');
    });

    it('should handle 999 as max sequence number', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          like: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { order_no: '240823-999' }, 
                  error: null 
                })
              })
            })
          })
        })
      });

      await expect(
        getNextSequenceNumber(mockSupabaseClient as any, '240823')
      ).rejects.toThrow('Maximum daily order limit reached');
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate order number with correct format', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          like: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      });

      const orderNo = await generateOrderNumber(mockSupabaseClient as any);
      expect(orderNo).toBe('240823-001');
    });

    it('should use custom date if provided', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          like: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      });

      const customDate = new Date('2024-12-25');
      const orderNo = await generateOrderNumber(mockSupabaseClient as any, customDate);
      expect(orderNo).toBe('241225-001');
    });

    it('should handle concurrent requests with retry logic', async () => {
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => ({
        insert: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call fails with duplicate key error
            return Promise.resolve({ 
              error: { code: '23505', message: 'Duplicate key' } 
            });
          } else {
            // Second call succeeds
            return Promise.resolve({ error: null });
          }
        }),
        select: jest.fn().mockReturnValue({
          like: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn()
                  .mockResolvedValueOnce({ data: null, error: null })
                  .mockResolvedValueOnce({ data: { order_no: '240823-001' }, error: null })
              })
            })
          })
        })
      }));

      const orderNo = await generateOrderNumber(mockSupabaseClient as any, undefined, true);
      expect(orderNo).toBe('240823-002');
      expect(callCount).toBe(1); // Only check, no insert in this test
    });
  });

  describe('parseOrderNumber', () => {
    it('should parse valid order number correctly', () => {
      const parsed = parseOrderNumber('240823-001');
      expect(parsed).toEqual({
        year: 24,
        month: 8,
        day: 23,
        sequence: 1,
        dateString: '240823',
        fullDate: new Date('2024-08-23T00:00:00.000Z')
      });
    });

    it('should return null for invalid format', () => {
      expect(parseOrderNumber('INVALID')).toBeNull();
      expect(parseOrderNumber('24-08-23-001')).toBeNull();
      expect(parseOrderNumber('240823-ABCD')).toBeNull();
    });

    it('should handle edge cases', () => {
      const parsed = parseOrderNumber('991231-999');
      expect(parsed).toEqual({
        year: 99,
        month: 12,
        day: 31,
        sequence: 999,
        dateString: '991231',
        fullDate: new Date('2099-12-31T00:00:00.000Z')
      });
    });
  });

  describe('isValidOrderNumber', () => {
    it('should validate correct order numbers', () => {
      expect(isValidOrderNumber('240823-001')).toBe(true);
      expect(isValidOrderNumber('991231-999')).toBe(true);
      expect(isValidOrderNumber('000101-001')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidOrderNumber('ORD-240823-001')).toBe(false); // Old format
      expect(isValidOrderNumber('24823-001')).toBe(false);
      expect(isValidOrderNumber('240823-0001')).toBe(false);
      expect(isValidOrderNumber('240823-ABC')).toBe(false);
      expect(isValidOrderNumber('')).toBe(false);
      expect(isValidOrderNumber(null as any)).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(isValidOrderNumber('241301-001')).toBe(false); // Month 13
      expect(isValidOrderNumber('240232-001')).toBe(false); // Day 32
      expect(isValidOrderNumber('240000-001')).toBe(false); // Day 00
    });

    it('should reject invalid sequence numbers', () => {
      expect(isValidOrderNumber('240823-000')).toBe(false);
      expect(isValidOrderNumber('240823-1000')).toBe(false);
    });
  });
});