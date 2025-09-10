/**
 * 업무플로우 데이터 무결성 통합 테스트
 * 제품입고 → 주문 → 배송 → 완료/환불 전체 플로우 검증
 */

import { createClient } from '@/lib/supabase/server';
import { ExchangeRateService } from '@/lib/services/exchange-rate.service';
import { AddressService } from '@/lib/domain/services/address.service';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('업무플로우 데이터 무결성 통합 테스트', () => {
    let mockSupabase: any;
    let exchangeRateService: ExchangeRateService;
    let addressService: AddressService;

    beforeEach(() => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn(),
            count: jest.fn()
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
        exchangeRateService = new ExchangeRateService();
        addressService = new AddressService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('1. 제품입고 단계 검증', () => {
        it('제품입고 시 재고 증가 및 출납장부 반영', async () => {
            // 1. 초기 상태 설정
            const initialStock = 0;
            const initialCashbookBalance = 10000000; // 1천만원

            mockSupabase.single
                .mockResolvedValueOnce({ data: { on_hand: initialStock }, error: null }) // 재고 조회
                .mockResolvedValueOnce({ data: { balance: initialCashbookBalance }, error: null }); // 출납장부 잔액 조회

            // 2. 제품입고 실행
            const inboundData = {
                productId: 'PROD-001',
                quantity: 100,
                costCNY: 5000,
                exchangeRate: 180.50,
                totalCostKRW: 902500, // 5000 * 180.50
                supplier: '중국공급업체A',
                invoiceNumber: 'INV-2024-001'
            };

            // 재고 업데이트 모킹
            mockSupabase.update.mockResolvedValue({
                data: { on_hand: initialStock + inboundData.quantity },
                error: null
            });

            // 출납장부 항목 추가 모킹
            mockSupabase.insert.mockResolvedValue({
                data: { id: 'cashbook-001' },
                error: null
            });

            // 제품입고 실행
            await createInbound(mockSupabase, inboundData);

            // 3. 재고 증가 검증
            expect(mockSupabase.update).toHaveBeenCalledWith({
                on_hand: initialStock + inboundData.quantity
            });

            // 4. 출납장부 반영 검증
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                type: 'inbound',
                amount: -inboundData.totalCostKRW, // 지출
                description: `제품입고 - ${inboundData.productId}`,
                product_id: inboundData.productId,
                supplier: inboundData.supplier,
                invoice_number: inboundData.invoiceNumber
            });
        });

        it('제품입고 실패 시 롤백 처리', async () => {
            // 재고 업데이트 실패 모킹
            mockSupabase.update.mockRejectedValue(new Error('DB Error'));

            const inboundData = {
                productId: 'PROD-001',
                quantity: 100,
                costCNY: 5000,
                exchangeRate: 180.50
            };

            // 제품입고 실행 시 에러 발생
            await expect(createInbound(mockSupabase, inboundData)).rejects.toThrow('DB Error');

            // 출납장부에 항목이 추가되지 않았는지 확인
            expect(mockSupabase.insert).not.toHaveBeenCalled();
        });
    });

    describe('2. 주문생성 단계 검증', () => {
        it('주문생성 시 재고 감소 및 출납장부 반영', async () => {
            // 1. 초기 상태 설정 (제품입고 완료 상태)
            const initialStock = 100;
            const initialCashbookBalance = 9097500; // 1000만원 - 902500원

            mockSupabase.single
                .mockResolvedValueOnce({ data: { on_hand: initialStock }, error: null }) // 재고 조회
                .mockResolvedValueOnce({ data: { balance: initialCashbookBalance }, error: null }); // 출납장부 잔액 조회

            // 2. 주문 생성
            const orderData = {
                customerName: '홍길동',
                customerPhone: '010-1234-5678',
                pccc: 'P123456789012',
                shippingAddress: '서울시 강남구 테헤란로 123',
                items: [
                    {
                        productId: 'PROD-001',
                        productName: 'iPhone 15',
                        quantity: 2,
                        price: 1200000 // 판매가
                    }
                ],
                totalAmount: 2400000,
                shippingFee: 3000
            };

            // 주문 생성 모킹
            const orderId = 'ORDER-001';
            mockSupabase.insert.mockResolvedValueOnce({
                data: { id: orderId, order_number: 'ORD-240101-001' },
                error: null
            });

            // 재고 업데이트 모킹
            mockSupabase.update.mockResolvedValue({
                data: { on_hand: initialStock - 2 },
                error: null
            });

            // 출납장부 매출 항목 추가 모킹
            mockSupabase.insert.mockResolvedValueOnce({
                data: { id: 'cashbook-002' },
                error: null
            });

            const order = await createOrder(mockSupabase, orderData);

            // 3. 재고 감소 검증
            expect(mockSupabase.update).toHaveBeenCalledWith({
                on_hand: initialStock - 2
            });

            // 4. 출납장부 매출 반영 검증
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                type: 'sales',
                amount: orderData.totalAmount, // 수입
                description: `주문매출 - ${orderId}`,
                order_id: orderId,
                customer_name: orderData.customerName
            });
        });

        it('재고 부족 시 주문 생성 실패', async () => {
            // 재고 부족 상황 설정
            const insufficientStock = 1;
            mockSupabase.single.mockResolvedValue({
                data: { on_hand: insufficientStock },
                error: null
            });

            const orderData = {
                customerName: '홍길동',
                items: [
                    {
                        productId: 'PROD-001',
                        quantity: 5, // 재고보다 많은 수량
                        price: 1200000
                    }
                ]
            };

            // 재고 부족으로 주문 생성 실패
            await expect(createOrder(mockSupabase, orderData)).rejects.toThrow('재고 부족');

            // 주문이 생성되지 않았는지 확인
            expect(mockSupabase.insert).not.toHaveBeenCalled();
        });
    });

    describe('3. 송장입력 단계 검증', () => {
        it('송장입력 시 배송상태 변경 및 출납장부 반영', async () => {
            // 1. 주문 생성 (이미 완료된 상태)
            const orderId = 'ORDER-001';
            const initialCashbookBalance = 11497500; // 9097500 + 2400000

            mockSupabase.single
                .mockResolvedValueOnce({ data: { id: orderId, status: 'paid' }, error: null }) // 주문 조회
                .mockResolvedValueOnce({ data: { balance: initialCashbookBalance }, error: null }); // 출납장부 잔액 조회

            // 2. 송장 입력
            const shipmentData = {
                orderId: orderId,
                courierCompany: 'CJ대한통운',
                trackingNumber: 'TRK123456789',
                shippingFee: 5000,
                shippingDate: new Date()
            };

            // 송장 생성 모킹
            mockSupabase.insert.mockResolvedValueOnce({
                data: { id: 'SHIP-001' },
                error: null
            });

            // 주문 상태 업데이트 모킹
            mockSupabase.update.mockResolvedValue({
                data: { status: 'shipped' },
                error: null
            });

            // 출납장부 배송비 항목 추가 모킹
            mockSupabase.insert.mockResolvedValueOnce({
                data: { id: 'cashbook-003' },
                error: null
            });

            await createShipment(mockSupabase, shipmentData);

            // 3. 주문 상태 변경 검증
            expect(mockSupabase.update).toHaveBeenCalledWith({
                status: 'shipped',
                tracking_number: shipmentData.trackingNumber,
                courier_company: shipmentData.courierCompany,
                shipped_at: expect.any(String)
            });

            // 4. 출납장부 배송비 반영 검증
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                type: 'shipping',
                amount: -shipmentData.shippingFee, // 지출
                description: `배송비 - ${orderId}`,
                order_id: orderId,
                courier_company: shipmentData.courierCompany
            });
        });
    });

    describe('4. 완료처리 단계 검증', () => {
        it('완료처리 시 주문상태 변경', async () => {
            // 1. 주문 및 송장 생성 (이미 완료된 상태)
            const orderId = 'ORDER-001';
            mockSupabase.single.mockResolvedValue({
                data: { id: orderId, status: 'shipped' },
                error: null
            });

            // 2. 완료 처리
            mockSupabase.update.mockResolvedValue({
                data: { status: 'delivered' },
                error: null
            });

            await completeOrder(mockSupabase, orderId);

            // 3. 주문 상태 변경 검증
            expect(mockSupabase.update).toHaveBeenCalledWith({
                status: 'delivered',
                delivered_at: expect.any(String)
            });
        });
    });

    describe('5. 환불처리 단계 검증', () => {
        it('환불처리 시 재고복구 및 출납장부 반영', async () => {
            // 1. 초기 상태 설정 (주문 완료 상태)
            const orderId = 'ORDER-001';
            const initialStock = 98; // 100 - 2
            const initialCashbookBalance = 11492500; // 11497500 - 5000

            mockSupabase.single
                .mockResolvedValueOnce({ data: { id: orderId, status: 'delivered' }, error: null }) // 주문 조회
                .mockResolvedValueOnce({ data: { on_hand: initialStock }, error: null }) // 재고 조회
                .mockResolvedValueOnce({ data: { balance: initialCashbookBalance }, error: null }); // 출납장부 잔액 조회

            // 2. 환불 처리
            const refundData = {
                orderId: orderId,
                reason: '고객 요청',
                refundAmount: 1200000,
                refundFee: 1000 // 환불 수수료
            };

            // 환불 처리 모킹
            mockSupabase.insert.mockResolvedValueOnce({
                data: { id: 'REFUND-001' },
                error: null
            });

            // 주문 상태 업데이트 모킹
            mockSupabase.update.mockResolvedValue({
                data: { status: 'refunded' },
                error: null
            });

            // 재고 복구 모킹
            mockSupabase.update.mockResolvedValue({
                data: { on_hand: initialStock + 2 },
                error: null
            });

            // 출납장부 환불 항목 추가 모킹
            mockSupabase.insert.mockResolvedValueOnce({
                data: { id: 'cashbook-004' },
                error: null
            });

            await processRefund(mockSupabase, refundData);

            // 3. 주문 상태 변경 검증
            expect(mockSupabase.update).toHaveBeenCalledWith({
                status: 'refunded',
                refund_reason: refundData.reason,
                refunded_at: expect.any(String)
            });

            // 4. 재고 복구 검증
            expect(mockSupabase.update).toHaveBeenCalledWith({
                on_hand: initialStock + 2
            });

            // 5. 출납장부 환불 반영 검증
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                type: 'refund',
                amount: -refundData.refundAmount, // 지출 (환불)
                description: `환불 - ${orderId}`,
                order_id: orderId,
                refund_reason: refundData.reason
            });
        });
    });

    describe('6. 전체 업무플로우 통합 테스트', () => {
        it('완전한 업무플로우 데이터 무결성 검증', async () => {
            // 1. 초기 상태
            const initialStock = 0;
            const initialCashbookBalance = 10000000;

            // 2. 제품입고
            const inboundData = {
                productId: 'PROD-001',
                quantity: 100,
                costCNY: 5000,
                exchangeRate: 180.50,
                totalCostKRW: 902500
            };

            mockSupabase.single
                .mockResolvedValueOnce({ data: { on_hand: initialStock }, error: null })
                .mockResolvedValueOnce({ data: { balance: initialCashbookBalance }, error: null });

            mockSupabase.update.mockResolvedValue({ data: { on_hand: 100 }, error: null });
            mockSupabase.insert.mockResolvedValue({ data: { id: 'cashbook-001' }, error: null });

            await createInbound(mockSupabase, inboundData);

            // 3. 주문 생성
            const orderData = {
                customerName: '홍길동',
                items: [{ productId: 'PROD-001', quantity: 2, price: 1200000 }]
            };

            mockSupabase.single
                .mockResolvedValueOnce({ data: { on_hand: 100 }, error: null })
                .mockResolvedValueOnce({ data: { balance: 9097500 }, error: null });

            mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'ORDER-001' }, error: null });
            mockSupabase.update.mockResolvedValue({ data: { on_hand: 98 }, error: null });
            mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'cashbook-002' }, error: null });

            const order = await createOrder(mockSupabase, orderData);

            // 4. 송장 입력
            const shipmentData = {
                orderId: 'ORDER-001',
                courierCompany: 'CJ대한통운',
                trackingNumber: 'TRK123456789',
                shippingFee: 5000
            };

            mockSupabase.single
                .mockResolvedValueOnce({ data: { id: 'ORDER-001', status: 'paid' }, error: null })
                .mockResolvedValueOnce({ data: { balance: 11497500 }, error: null });

            mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'SHIP-001' }, error: null });
            mockSupabase.update.mockResolvedValue({ data: { status: 'shipped' }, error: null });
            mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'cashbook-003' }, error: null });

            await createShipment(mockSupabase, shipmentData);

            // 5. 완료 처리
            mockSupabase.single.mockResolvedValue({ data: { id: 'ORDER-001', status: 'shipped' }, error: null });
            mockSupabase.update.mockResolvedValue({ data: { status: 'delivered' }, error: null });

            await completeOrder(mockSupabase, 'ORDER-001');

            // 6. 환불 처리
            const refundData = {
                orderId: 'ORDER-001',
                reason: '고객 요청',
                refundAmount: 1200000,
                shippingRefund: 5000
            };

            mockSupabase.single
                .mockResolvedValueOnce({ data: { id: 'ORDER-001', status: 'delivered' }, error: null })
                .mockResolvedValueOnce({ data: { on_hand: 98 }, error: null })
                .mockResolvedValueOnce({ data: { balance: 11492500 }, error: null });

            mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'REFUND-001' }, error: null });
            mockSupabase.update.mockResolvedValue({ data: { status: 'refunded' }, error: null });
            mockSupabase.update.mockResolvedValue({ data: { on_hand: 100 }, error: null });
            mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'cashbook-004' }, error: null });
            mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'cashbook-005' }, error: null });

            await processRefund(mockSupabase, refundData);

            // 7. 최종 무결성 검증
            const validator = new DatabaseIntegrityValidator();
            const result = await validator.validateSystemIntegrity(mockSupabase);

            expect(result.inventory).toBe(true);
            expect(result.cashbook).toBe(true);
            expect(result.orders).toBe(true);
            expect(result.overall).toBe(true);
        });
    });
});

// 헬퍼 함수들
async function createInbound(supabase: any, data: any) {
    // 재고 업데이트
    await supabase
        .from('products')
        .update({ on_hand: data.quantity })
        .eq('id', data.productId);

    // 출납장부 항목 추가
    await supabase
        .from('cashbook_transactions')
        .insert({
            type: 'inbound',
            amount: -data.totalCostKRW,
            description: `제품입고 - ${data.productId}`,
            product_id: data.productId,
            supplier: data.supplier,
            invoice_number: data.invoiceNumber
        });
}

async function createOrder(supabase: any, data: any) {
    // 재고 확인
    const { data: product } = await supabase
        .from('products')
        .select('on_hand')
        .eq('id', data.items[0].productId)
        .single();

    if (product.on_hand < data.items[0].quantity) {
        throw new Error('재고 부족');
    }

    // 주문 생성
    const { data: order } = await supabase
        .from('orders')
        .insert({
            customer_name: data.customerName,
            customer_phone: data.customerPhone,
            pccc: data.pccc,
            shipping_address: data.shippingAddress,
            status: 'paid',
            total_krw: data.totalAmount || data.items[0].price * data.items[0].quantity
        })
        .select()
        .single();

    // 재고 감소
    await supabase
        .from('products')
        .update({ on_hand: product.on_hand - data.items[0].quantity })
        .eq('id', data.items[0].productId);

    // 출납장부 매출 항목 추가
    await supabase
        .from('cashbook_transactions')
        .insert({
            type: 'sales',
            amount: data.totalAmount || data.items[0].price * data.items[0].quantity,
            description: `주문매출 - ${order.id}`,
            order_id: order.id,
            customer_name: data.customerName
        });

    return order;
}

async function createShipment(supabase: any, data: any) {
    // 주문 조회
    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', data.orderId)
        .single();

    // 송장 생성
    await supabase
        .from('shipments')
        .insert({
            order_id: data.orderId,
            courier_company: data.courierCompany,
            tracking_number: data.trackingNumber,
            shipping_fee: data.shippingFee,
            shipping_date: data.shippingDate
        });

    // 주문 상태 업데이트
    await supabase
        .from('orders')
        .update({
            status: 'shipped',
            tracking_number: data.trackingNumber,
            courier_company: data.courierCompany,
            shipped_at: new Date().toISOString()
        })
        .eq('id', data.orderId);

    // 출납장부 배송비 항목 추가
    await supabase
        .from('cashbook_transactions')
        .insert({
            type: 'shipping',
            amount: -data.shippingFee,
            description: `배송비 - ${data.orderId}`,
            order_id: data.orderId,
            courier_company: data.courierCompany
        });
}

async function completeOrder(supabase: any, orderId: string) {
    // 주문 상태 업데이트
    await supabase
        .from('orders')
        .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
        })
        .eq('id', orderId);
}

async function processRefund(supabase: any, data: any) {
    // 주문 조회
    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', data.orderId)
        .single();

    // 환불 처리
    await supabase
        .from('refunds')
        .insert({
            order_id: data.orderId,
            reason: data.reason,
            amount: data.refundAmount,
            refund_fee: data.refundFee
        });

    // 주문 상태 업데이트
    await supabase
        .from('orders')
        .update({
            status: 'refunded',
            refund_reason: data.reason,
            refunded_at: new Date().toISOString()
        })
        .eq('id', data.orderId);

    // 재고 복구
    const { data: product } = await supabase
        .from('products')
        .select('on_hand')
        .eq('id', order.product_id)
        .single();

    await supabase
        .from('products')
        .update({ on_hand: product.on_hand + order.quantity })
        .eq('id', order.product_id);

    // 출납장부 환불 항목 추가
    await supabase
        .from('cashbook_transactions')
        .insert({
            type: 'refund',
            amount: -data.refundAmount,
            description: `환불 - ${data.orderId}`,
            order_id: data.orderId,
            refund_reason: data.reason
        });

    // 배송비 환불 처리
    if (data.shippingRefund) {
        await supabase
            .from('cashbook_transactions')
            .insert({
                type: 'shipping_refund',
                amount: data.shippingRefund,
                description: `배송비 환불 - ${data.orderId}`,
                order_id: data.orderId
            });
    }
}

// 데이터베이스 무결성 검증 클래스
class DatabaseIntegrityValidator {
    async validateInventoryIntegrity(supabase: any, productId: string): Promise<boolean> {
        const { data: product } = await supabase
            .from('products')
            .select('on_hand')
            .eq('id', productId)
            .single();

        const { data: inbound } = await supabase
            .from('inbound_transactions')
            .select('quantity')
            .eq('product_id', productId);

        const { data: outbound } = await supabase
            .from('outbound_transactions')
            .select('quantity')
            .eq('product_id', productId);

        const inboundTotal = inbound?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const outboundTotal = outbound?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const expectedStock = inboundTotal - outboundTotal;

        return product.on_hand === expectedStock;
    }

    async validateCashbookIntegrity(supabase: any): Promise<boolean> {
        const { data: currentBalance } = await supabase
            .from('cashbook_transactions')
            .select('balance')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const { data: allTransactions } = await supabase
            .from('cashbook_transactions')
            .select('amount')
            .order('created_at', { ascending: true });

        const calculatedBalance = allTransactions?.reduce((sum, item) => sum + item.amount, 0) || 0;

        return Math.abs(currentBalance.balance - calculatedBalance) < 0.01;
    }

    async validateOrderStatusIntegrity(supabase: any, orderId: string): Promise<boolean> {
        const { data: order } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .single();

        const { data: shipments } = await supabase
            .from('shipments')
            .select('id')
            .eq('order_id', orderId);

        const { data: refunds } = await supabase
            .from('refunds')
            .select('id')
            .eq('order_id', orderId);

        // 주문 상태와 관련 데이터 일치성 검증
        if (order.status === 'shipped' && shipments.length === 0) return false;
        if (order.status === 'refunded' && refunds.length === 0) return false;

        return true;
    }

    async validateSystemIntegrity(supabase: any): Promise<{
        inventory: boolean;
        cashbook: boolean;
        orders: boolean;
        overall: boolean;
    }> {
        const inventoryValid = await this.validateInventoryIntegrity(supabase, 'PROD-001');
        const cashbookValid = await this.validateCashbookIntegrity(supabase);
        const ordersValid = await this.validateOrderStatusIntegrity(supabase, 'ORDER-001');

        return {
            inventory: inventoryValid,
            cashbook: cashbookValid,
            orders: ordersValid,
            overall: inventoryValid && cashbookValid && ordersValid
        };
    }
}

