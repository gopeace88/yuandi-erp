import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/track/route';
import { createServerSupabase } from '@/lib/supabase/server';
import { getEventLogger } from '@/lib/middleware/event-logger';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/middleware/event-logger');

describe('Track API Route', () => {
  let mockSupabaseClient: any;
  let mockEventLogger: any;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabaseClient);

    // Mock EventLogger
    mockEventLogger = {
      logEvent: jest.fn().mockResolvedValue(undefined),
    };

    (getEventLogger as jest.Mock).mockReturnValue(mockEventLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/track', () => {
    it('should return 400 if name is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/track?phone=01012345678');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and phone number are required');
      expect(data.message).toBe('이름과 전화번호를 입력해주세요');
    });

    it('should return 400 if phone is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and phone number are required');
    });

    it('should return 400 for invalid name (too short)', async () => {
      const request = new NextRequest('http://localhost:3000/api/track?name=홍&phone=01012345678');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid name');
      expect(data.message).toBe('올바른 이름을 입력해주세요');
    });

    it('should return 400 for invalid phone (too short)', async () => {
      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid phone number');
      expect(data.message).toBe('올바른 전화번호를 입력해주세요');
    });

    it('should normalize phone number by removing non-digits', async () => {
      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=010-1234-5678');
      await GET(request);

      expect(mockSupabaseClient.ilike).toHaveBeenCalledWith('customer_phone', '%01012345678%');
    });

    it('should query orders with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=01012345678');
      await GET(request);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(expect.stringContaining('order_no'));
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('customer_name', '홍길동');
      expect(mockSupabaseClient.ilike).toHaveBeenCalledWith('customer_phone', '%01012345678%');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(5);
    });

    it('should mask sensitive data in response', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            order_no: 'ORD-240823-001',
            status: 'PAID',
            customer_name: '홍길동',
            customer_phone: '01012345678',
            customer_email: 'test@example.com',
            shipping_address: '서울시 강남구',
            shipping_address_detail: '아파트 101동',
            pccc_code: 'P1234567890',
            zip_code: '12345',
            total_amount: 50000,
            created_at: '2024-08-23T10:00:00Z',
            order_items: [],
            shipments: [],
          },
        ],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=01012345678');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orders[0].customer_phone).toBe('010-****-5678');
      expect(data.orders[0].customer_email).toBe('te***@example.com');
      expect(data.orders[0].shipping_address).toBe('서울시 강남구'); // Basic address not masked
      expect(data.orders[0].shipping_address_detail).toBeUndefined(); // Detail removed
      expect(data.orders[0].pccc_code).toBeUndefined(); // PCCC removed
    });

    it('should return empty array when no orders found', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=01012345678');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('조회된 주문이 없습니다');
      expect(data.orders).toEqual([]);
    });

    it('should log event to EventLogger', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/track?name=홍길동&phone=01012345678',
        {
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Mozilla/5.0',
          },
        }
      );

      await GET(request);

      expect(mockEventLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          table_name: 'orders',
          operation: 'SELECT',
          record_id: 'track_query',
          action_description: expect.stringContaining('주문 조회'),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed'),
      });

      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=01012345678');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch orders');
      expect(data.message).toBe('주문 조회 중 오류가 발생했습니다');
    });

    it('should include response time in successful response', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            order_no: 'ORD-240823-001',
            status: 'PAID',
            customer_name: '홍길동',
            customer_phone: '01012345678',
            total_amount: 50000,
            created_at: '2024-08-23T10:00:00Z',
            order_items: [],
          },
        ],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=01012345678');
      const response = await GET(request);
      const data = await response.json();

      expect(data.responseTime).toBeDefined();
      expect(typeof data.responseTime).toBe('number');
      expect(data.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should process shipments data correctly', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            order_no: 'ORD-240823-001',
            status: 'SHIPPED',
            customer_name: '홍길동',
            customer_phone: '01012345678',
            total_amount: 50000,
            created_at: '2024-08-23T10:00:00Z',
            order_items: [],
            shipments: [
              {
                courier: 'CJ대한통운',
                tracking_no: '1234567890',
                tracking_url: 'https://tracking.cj.com/1234567890',
                shipped_at: '2024-08-23T12:00:00Z',
                delivered_at: null,
              },
            ],
          },
        ],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/track?name=홍길동&phone=01012345678');
      const response = await GET(request);
      const data = await response.json();

      expect(data.orders[0].shipments).toHaveLength(1);
      expect(data.orders[0].shipments[0]).toEqual({
        courier: 'CJ대한통운',
        tracking_no: '1234567890',
        tracking_url: 'https://tracking.cj.com/1234567890',
        shipped_at: '2024-08-23T12:00:00Z',
        delivered_at: null,
      });
    });
  });

  describe('POST /api/track', () => {
    it('should return 405 Method Not Allowed', async () => {
      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });
});