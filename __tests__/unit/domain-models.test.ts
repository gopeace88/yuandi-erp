/**
 * 도메인 모델 유닛 테스트
 * Product, Order, Address, ExchangeRate 모델 테스트
 */

import { Product, generateSKU, validateProduct } from '@/lib/domain/models/product';
import { Order, generateOrderNumber, validateOrder } from '@/lib/domain/models/order';

describe('도메인 모델 유닛 테스트', () => {

    describe('Product 모델', () => {
        describe('generateSKU', () => {
            it('영어 입력으로 SKU 생성', () => {
                const sku = generateSKU({
                    category: 'ELEC',
                    model: 'iPhone15',
                    color: 'Black',
                    brand: 'Apple',
                });

                expect(sku).toMatch(/^ELEC-iPhone15-Black-Apple-[A-Z0-9]{5}$/);
            });

            it('한국어 입력으로 SKU 생성', () => {
                const sku = generateSKU({
                    category: '전자',
                    model: '아이폰15',
                    color: '검정',
                    brand: '애플',
                });

                expect(sku).toMatch(/^전자-아이폰15-검정-애플-[A-Z0-9]{5}$/);
            });

            it('동일한 상품에 대해 고유한 SKU 생성', () => {
                const input = {
                    category: 'ELEC',
                    model: 'iPhone15',
                    color: 'Black',
                    brand: 'Apple',
                };

                const sku1 = generateSKU(input);
                const sku2 = generateSKU(input);

                expect(sku1).not.toBe(sku2);
            });
        });

        describe('validateProduct', () => {
            it('필수 필드 검증', () => {
                const product = {
                    category: '',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: 5000,
                    onHand: 10,
                };

                const result = validateProduct(product);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Category is required');
            });

            it('가격이 양수인지 검증', () => {
                const product = {
                    category: 'ELEC',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: -100,
                    onHand: 10,
                };

                const result = validateProduct(product);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Cost must be positive');
            });

            it('재고가 음수가 아닌지 검증', () => {
                const product = {
                    category: 'ELEC',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: 5000,
                    onHand: -5,
                };

                const result = validateProduct(product);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Stock cannot be negative');
            });

            it('유효한 상품 데이터 통과', () => {
                const product = {
                    category: 'ELEC',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: 5000,
                    onHand: 10,
                };

                const result = validateProduct(product);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        describe('Product 클래스', () => {
            it('자동 생성된 SKU로 상품 생성', () => {
                const product = new Product({
                    category: 'ELEC',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: 5000,
                    onHand: 10,
                });

                expect(product.sku).toMatch(/^ELEC-A3090-Black-Apple-[A-Z0-9]{5}$/);
                expect(product.name).toBe('iPhone 15');
                expect(product.costCNY).toBe(5000);
                expect(product.onHand).toBe(10);
            });

            it('총 가치 계산', () => {
                const product = new Product({
                    category: 'ELEC',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: 5000,
                    onHand: 10,
                });

                expect(product.getTotalValue()).toBe(50000);
            });

            it('재고 부족 확인', () => {
                const product = new Product({
                    category: 'ELEC',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: 5000,
                    onHand: 3,
                });

                expect(product.isLowStock()).toBe(true);
                expect(product.isLowStock(10)).toBe(true);
                expect(product.isLowStock(2)).toBe(false);
            });

            it('재고 조정', () => {
                const product = new Product({
                    category: 'ELEC',
                    name: 'iPhone 15',
                    model: 'A3090',
                    color: 'Black',
                    brand: 'Apple',
                    costCNY: 5000,
                    onHand: 10,
                });

                product.adjustStock(5);
                expect(product.onHand).toBe(15);

                product.adjustStock(-3);
                expect(product.onHand).toBe(12);

                expect(() => product.adjustStock(-20)).toThrow('Insufficient stock');
            });
        });
    });

    describe('Order 모델', () => {
        describe('generateOrderNumber', () => {
            it('올바른 형식의 주문번호 생성', () => {
                const orderNumber = generateOrderNumber();
                const today = new Date();
                const expectedPrefix = `ORD-${today.getFullYear().toString().slice(2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

                expect(orderNumber).toMatch(new RegExp(`^${expectedPrefix}-\\d{3}$`));
            });

            it('시퀀스 번호 증가', () => {
                const order1 = generateOrderNumber(1);
                const order2 = generateOrderNumber(2);
                const order3 = generateOrderNumber(10);

                expect(order1).toMatch(/-001$/);
                expect(order2).toMatch(/-002$/);
                expect(order3).toMatch(/-010$/);
            });

            it('KST 시간대 날짜 처리', () => {
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

            it('필수 필드 검증', () => {
                const order = { ...validOrder, customerName: '' };
                const result = validateOrder(order);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('customer name is required');
            });

            it('전화번호 형식 검증', () => {
                const order = { ...validOrder, customerPhone: '1234' };
                const result = validateOrder(order);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Invalid phone number format');
            });

            it('PCCC 형식 검증', () => {
                const order = { ...validOrder, pccc: 'INVALID' };
                const result = validateOrder(order);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Invalid PCCC format');
            });

            it('주문에 상품이 있는지 검증', () => {
                const order = { ...validOrder, items: [] };
                const result = validateOrder(order);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Order must have at least one item');
            });

            it('상품 수량 검증', () => {
                const order = {
                    ...validOrder,
                    items: [{ productId: 'prod-1', quantity: 0, price: 5000 }]
                };
                const result = validateOrder(order);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Item quantity must be positive');
            });

            it('유효한 주문 데이터 통과', () => {
                const result = validateOrder(validOrder);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        describe('Order 클래스', () => {
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

            it('자동 생성된 주문번호로 주문 생성', () => {
                const order = new Order(orderInput);

                expect(order.orderNumber).toMatch(/^ORD-\d{6}-\d{3}$/);
                expect(order.status).toBe('paid');
                expect(order.customerName).toBe('홍길동');
            });

            it('총 금액 계산', () => {
                const order = new Order(orderInput);

                expect(order.getTotalAmount()).toBe(12000); // (2*5000) + (1*2000)
            });

            it('총 상품 수 계산', () => {
                const order = new Order(orderInput);

                expect(order.getTotalItems()).toBe(3); // 2 + 1
            });

            it('상태 전환', () => {
                const order = new Order(orderInput);

                expect(order.status).toBe('paid');

                order.ship('CJ대한통운', 'TRK123456789');
                expect(order.status).toBe('shipped');
                expect(order.trackingNumber).toBe('TRK123456789');
                expect(order.courierCompany).toBe('CJ대한통운');

                order.complete();
                expect(order.status).toBe('delivered');
            });

            it('환불 처리', () => {
                const order = new Order(orderInput);
                order.ship('CJ대한통운', 'TRK123456789');

                order.refund('customer request');
                expect(order.status).toBe('refunded');
                expect(order.refundReason).toBe('customer request');
                expect(order.refundedAt).toBeDefined();
            });

            it('잘못된 상태 전환 방지', () => {
                const order = new Order(orderInput);
                order.complete();

                expect(() => order.ship('CJ대한통운', 'TRK123456789')).toThrow('Cannot ship order in delivered status');
            });

            it('추적 URL 생성', () => {
                const order = new Order(orderInput);
                order.ship('CJ대한통운', 'TRK123456789');

                const trackingUrl = order.getTrackingUrl();
                expect(trackingUrl).toContain('TRK123456789');
            });
        });
    });
});
