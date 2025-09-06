import { EventLogger, EventLogCache } from '@/lib/middleware/event-logger';
import { createServerSupabase } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabase: jest.fn(),
}));

describe('EventLogger', () => {
  let mockSupabaseClient: any;
  let eventLogger: EventLogger;

  beforeEach(() => {
    jest.useFakeTimers();
    
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ 
        data: [
          {
            id: '1',
            table_name: 'orders',
            operation: 'INSERT',
            record_id: 'order-1',
            actor_id: 'user-1',
            action_description: 'Created order',
            created_at: '2024-08-23T10:00:00Z',
          },
        ], 
        error: null 
      }),
    };

    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabaseClient);
    eventLogger = new EventLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('logEvent', () => {
    it('should add event to batch queue', async () => {
      const eventData = {
        table_name: 'orders',
        operation: 'INSERT' as const,
        record_id: 'order-123',
        actor_id: 'user-1',
        action_description: 'Created new order',
      };

      await eventLogger.logEvent(eventData);

      // Event should be in queue, not immediately inserted
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should flush batch when size limit reached', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        table_name: 'orders',
        operation: 'INSERT' as const,
        record_id: `order-${i}`,
        actor_id: 'user-1',
        action_description: `Created order ${i}`,
      }));

      for (const event of events) {
        await eventLogger.logEvent(event);
      }

      // Batch should be flushed after 10 events
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('event_logs');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should flush batch after timeout', async () => {
      const eventData = {
        table_name: 'orders',
        operation: 'UPDATE' as const,
        record_id: 'order-456',
        actor_id: 'user-2',
        action_description: 'Updated order status',
      };

      await eventLogger.logEvent(eventData);

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      // Batch should be flushed after timeout
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('event_logs');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should include metadata in event log', async () => {
      const eventData = {
        table_name: 'products',
        operation: 'DELETE' as const,
        record_id: 'product-789',
        actor_id: 'admin-1',
        action_description: 'Deleted product',
        metadata: {
          reason: 'Out of stock',
          deleted_by: 'Admin',
        },
      };

      await eventLogger.logEvent(eventData);
      
      // Force flush
      jest.advanceTimersByTime(5000);

      const insertCall = mockSupabaseClient.insert.mock.calls[0][0];
      expect(insertCall[0].metadata).toEqual(eventData.metadata);
    });

    it('should include before and after data', async () => {
      const eventData = {
        table_name: 'inventory',
        operation: 'UPDATE' as const,
        record_id: 'inv-001',
        actor_id: 'user-3',
        action_description: 'Stock adjustment',
        before_data: { quantity: 100 },
        after_data: { quantity: 95 },
      };

      await eventLogger.logEvent(eventData);
      
      // Force flush
      jest.advanceTimersByTime(5000);

      const insertCall = mockSupabaseClient.insert.mock.calls[0][0];
      expect(insertCall[0].before_data).toEqual(eventData.before_data);
      expect(insertCall[0].after_data).toEqual(eventData.after_data);
    });

    it('should handle flush errors gracefully', async () => {
      mockSupabaseClient.insert.mockResolvedValueOnce({ 
        data: null, 
        error: new Error('Database error') 
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const eventData = {
        table_name: 'orders',
        operation: 'INSERT' as const,
        record_id: 'order-error',
        actor_id: 'user-1',
        action_description: 'Test error handling',
      };

      await eventLogger.logEvent(eventData);
      
      // Force flush
      jest.advanceTimersByTime(5000);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to flush event log batch:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getWorkLogs', () => {
    it('should retrieve work logs with default pagination', async () => {
      const result = await eventLogger.getWorkLogs({});

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('event_logs');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50);
      expect(result.data).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it('should filter by table name', async () => {
      await eventLogger.getWorkLogs({ table_name: 'orders' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('table_name', 'orders');
    });

    it('should filter by operation type', async () => {
      await eventLogger.getWorkLogs({ operation: 'UPDATE' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('operation', 'UPDATE');
    });

    it('should filter by actor ID', async () => {
      await eventLogger.getWorkLogs({ actor_id: 'user-123' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('actor_id', 'user-123');
    });

    it('should filter by record ID', async () => {
      await eventLogger.getWorkLogs({ record_id: 'order-456' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('record_id', 'order-456');
    });

    it('should apply custom limit', async () => {
      await eventLogger.getWorkLogs({ limit: 100 });

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(100);
    });

    it('should handle query errors', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({ 
        data: null, 
        error: new Error('Query failed') 
      });

      const result = await eventLogger.getWorkLogs({});

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Query failed');
    });
  });
});

describe('EventLogCache', () => {
  let cache: EventLogCache;
  let mockFlushCallback: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFlushCallback = jest.fn().mockResolvedValue(undefined);
    cache = new EventLogCache(mockFlushCallback);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should batch events up to batch size', () => {
    for (let i = 0; i < 9; i++) {
      cache.addToBatch({
        table_name: 'test',
        operation: 'INSERT',
        record_id: `test-${i}`,
        action_description: `Test ${i}`,
      });
    }

    expect(mockFlushCallback).not.toHaveBeenCalled();

    // Add 10th event to trigger flush
    cache.addToBatch({
      table_name: 'test',
      operation: 'INSERT',
      record_id: 'test-10',
      action_description: 'Test 10',
    });

    expect(mockFlushCallback).toHaveBeenCalledTimes(1);
    expect(mockFlushCallback).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ record_id: 'test-0' }),
      expect.objectContaining({ record_id: 'test-9' }),
    ]));
  });

  it('should auto-flush after timeout', () => {
    cache.addToBatch({
      table_name: 'test',
      operation: 'INSERT',
      record_id: 'test-timeout',
      action_description: 'Test timeout',
    });

    expect(mockFlushCallback).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    expect(mockFlushCallback).toHaveBeenCalledTimes(1);
    expect(mockFlushCallback).toHaveBeenCalledWith([
      expect.objectContaining({ record_id: 'test-timeout' }),
    ]);
  });

  it('should force flush when requested', () => {
    cache.addToBatch({
      table_name: 'test',
      operation: 'UPDATE',
      record_id: 'test-force',
      action_description: 'Test force flush',
    });

    cache.forceFlush();

    expect(mockFlushCallback).toHaveBeenCalledTimes(1);
    expect(mockFlushCallback).toHaveBeenCalledWith([
      expect.objectContaining({ record_id: 'test-force' }),
    ]);
  });

  it('should reset timer when batch is flushed', () => {
    // Add first event
    cache.addToBatch({
      table_name: 'test',
      operation: 'INSERT',
      record_id: 'test-1',
      action_description: 'Test 1',
    });

    // Advance time by 4 seconds
    jest.advanceTimersByTime(4000);

    // Force flush
    cache.forceFlush();
    expect(mockFlushCallback).toHaveBeenCalledTimes(1);

    // Add another event
    cache.addToBatch({
      table_name: 'test',
      operation: 'INSERT',
      record_id: 'test-2',
      action_description: 'Test 2',
    });

    // Advance time by 4 seconds (should not trigger flush yet)
    jest.advanceTimersByTime(4000);
    expect(mockFlushCallback).toHaveBeenCalledTimes(1);

    // Advance time by 1 more second to trigger flush
    jest.advanceTimersByTime(1000);
    expect(mockFlushCallback).toHaveBeenCalledTimes(2);
  });

  it('should handle empty batch flush gracefully', () => {
    cache.forceFlush();
    expect(mockFlushCallback).not.toHaveBeenCalled();
  });
});