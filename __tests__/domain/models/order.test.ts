import { Order, OrderStatus, generateOrderNumber, validateOrder } from '@/lib/domain/models/order';

describe('Order Domain Model', () => {
  describe('generateOrderNumber', () => {
    it('should generate order number with correct format', () => {
      const orderNumber = generateOrderNumber();
      const today = new Date();
      const expectedPrefix = `ORD-${today.getFullYear().toString().slice(2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      
      expect(orderNumber).toMatch(new RegExp(`^${expectedPrefix}-\\d{3}$`));
    });

    it('should increment sequence number', () => {
      const order1 = generateOrderNumber(1);
      const order2 = generateOrderNumber(2);
      const order3 = generateOrderNumber(10);
      
      expect(order1).toMatch(/-001$/);
      expect(order2).toMatch(/-002$/);
      expect(order3).toMatch(/-010$/);
    });

    it('should handle date in KST timezone', () => {
      const orderNumber = generateOrderNumber(1, new Date('2024-08-23T15:00:00Z'));
      // 2024-08-23 15:00 UTC = 2024-08-24 00:00 KST
      expect(orderNumber).toBe('ORD-240824-001');
    });
  });

  describe('validateOrder', () => {
    const validOrder = {
      customerName: '홍길동',
      customerPhone: '010-1234-5678',
      pccc: 'P123456789012',
      shippingAddress: '서울시 강남구 테헤란로 123',
      items: [
        { productId: 'prod-1', quantity: 2, price: 5000 }
      ]
    };

    it('should validate required fields', () => {
      const order = { ...validOrder, customerName: '' };
      const result = validateOrder(order);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer name is required');
    });

    it('should validate phone number format', () => {
      const order = { ...validOrder, customerPhone: '1234' };
      const result = validateOrder(order);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone number format');
    });

    it('should validate PCCC format', () => {
      const order = { ...validOrder, pccc: 'INVALID' };
      const result = validateOrder(order);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid PCCC format');
    });

    it('should validate order has items', () => {
      const order = { ...validOrder, items: [] };
      const result = validateOrder(order);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order must have at least one item');
    });

    it('should validate item quantities', () => {
      const order = {
        ...validOrder,
        items: [{ productId: 'prod-1', quantity: 0, price: 5000 }]
      };
      const result = validateOrder(order);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item quantity must be positive');
    });

    it('should pass validation for valid order', () => {
      const result = validateOrder(validOrder);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Order class', () => {
    const orderInput = {
      customerName: '홍길동',
      customerPhone: '010-1234-5678',
      pccc: 'P123456789012',
      shippingAddress: '서울시 강남구 테헤란로 123',
      items: [
        { productId: 'prod-1', productName: 'iPhone 15', quantity: 2, price: 5000 },
        { productId: 'prod-2', productName: 'AirPods', quantity: 1, price: 2000 }
      ]
    };

    it('should create order with auto-generated order number', () => {
      const order = new Order(orderInput);
      
      expect(order.orderNumber).toMatch(/^ORD-\d{6}-\d{3}$/);
      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.customerName).toBe('홍길동');
    });

    it('should calculate total amount correctly', () => {
      const order = new Order(orderInput);
      
      expect(order.getTotalAmount()).toBe(12000); // (2*5000) + (1*2000)
    });

    it('should calculate total items correctly', () => {
      const order = new Order(orderInput);
      
      expect(order.getTotalItems()).toBe(3); // 2 + 1
    });

    it('should transition status correctly', () => {
      const order = new Order(orderInput);
      
      expect(order.status).toBe(OrderStatus.PAID);
      
      order.ship('CJ대한통운', 'TRK123456789');
      expect(order.status).toBe(OrderStatus.SHIPPED);
      expect(order.trackingNumber).toBe('TRK123456789');
      expect(order.courierCompany).toBe('CJ대한통운');
      
      order.complete();
      expect(order.status).toBe(OrderStatus.DONE);
    });

    it('should handle refund correctly', () => {
      const order = new Order(orderInput);
      order.ship('CJ대한통운', 'TRK123456789');
      
      order.refund('Customer request');
      expect(order.status).toBe(OrderStatus.REFUNDED);
      expect(order.refundReason).toBe('Customer request');
      expect(order.refundedAt).toBeDefined();
    });

    it('should not allow invalid status transitions', () => {
      const order = new Order(orderInput);
      order.complete();
      
      expect(() => order.ship('CJ대한통운', 'TRK123456789')).toThrow('Cannot ship order in DONE status');
    });

    it('should generate tracking URL correctly', () => {
      const order = new Order(orderInput);
      order.ship('CJ대한통운', 'TRK123456789');
      
      const trackingUrl = order.getTrackingUrl();
      expect(trackingUrl).toContain('TRK123456789');
    });
  });
});