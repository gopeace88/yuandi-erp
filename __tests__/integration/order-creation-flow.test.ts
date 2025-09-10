/**
 * 주문 생성 통합 테스트
 * 환율 API, 우편번호 API, 주문 생성 플로우 통합 테스트
 */

import { ExchangeRateService } from '@/lib/services/exchange-rate.service';
import { AddressService } from '@/lib/domain/services/address.service';
import { Order } from '@/lib/domain/models/order';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('주문 생성 통합 테스트', () => {
    let exchangeRateService: ExchangeRateService;
    let addressService: AddressService;
    let mockSupabase: any;

    beforeEach(() => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn()
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
        exchangeRateService = new ExchangeRateService();
        addressService = new AddressService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('완전한 주문 생성 플로우', () => {
        it('환율 적용 주문 생성', async () => {
            // 1. 환율 조회
            const mockCachedRate = {
                rate: 180.50,
                date: '2024-01-01'
            };

            mockSupabase.single.mockResolvedValue({
                data: mockCachedRate,
                error: null
            });

            const exchangeRate = await exchangeRateService.getCurrentRate();
            expect(exchangeRate).toBe(180.50);

            // 2. 주소 검증
            const addressData = {
                postcode: '12345',
                address: '서울시 강남구 테헤란로 123',
                addressDetail: '101동 202호',
                customerName: '홍길동',
                phone: '010-1234-5678'
            };

            const addressValidation = await addressService.validateCompleteAddress(addressData);
            expect(addressValidation.isValid).toBe(true);

            // 3. 상품 정보 (중국 원가)
            const productData = {
                name: 'iPhone 15',
                costCNY: 5000,
                quantity: 2
            };

            // 4. 환율 적용 가격 계산
            const costKRW = productData.costCNY * exchangeRate;
            const sellingPriceKRW = costKRW * 1.2; // 20% 마진

            expect(costKRW).toBe(902500); // 5000 * 180.50
            expect(sellingPriceKRW).toBe(1083000); // 902500 * 1.2

            // 5. 주문 생성
            const orderData = {
                customerName: addressData.customerName,
                customerPhone: addressData.phone,
                pccc: 'P123456789012',
                shippingAddress: `${addressData.address} ${addressData.addressDetail}`,
                items: [
                    {
                        productId: 'prod-1',
                        productName: productData.name,
                        quantity: productData.quantity,
                        price: sellingPriceKRW
                    }
                ]
            };

            const order = new Order(orderData);

            expect(order.customerName).toBe('홍길동');
            expect(order.getTotalAmount()).toBe(2166000); // 1083000 * 2
            expect(order.status).toBe('paid');
        });

        it('주소 검증 실패 시 주문 생성 중단', async () => {
            // 1. 환율 조회 성공
            const mockCachedRate = {
                rate: 180.50,
                date: '2024-01-01'
            };

            mockSupabase.single.mockResolvedValue({
                data: mockCachedRate,
                error: null
            });

            const exchangeRate = await exchangeRateService.getCurrentRate();
            expect(exchangeRate).toBe(180.50);

            // 2. 주소 검증 실패
            const invalidAddressData = {
                postcode: '1234', // 잘못된 우편번호
                address: '',
                addressDetail: '101동 202호',
                customerName: '홍길동',
                phone: '010-1234-5678'
            };

            const addressValidation = await addressService.validateCompleteAddress(invalidAddressData);
            expect(addressValidation.isValid).toBe(false);

            // 3. 주문 생성 시도 시 실패
            expect(() => {
                new Order({
                    customerName: invalidAddressData.customerName,
                    customerPhone: invalidAddressData.phone,
                    pccc: 'P123456789012',
                    shippingAddress: `${invalidAddressData.address} ${invalidAddressData.addressDetail}`,
                    items: []
                });
            }).toThrow();
        });

        it('환율 API 실패 시 기본값으로 주문 생성', async () => {
            // 1. 환율 API 실패
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
            });

            (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

            const exchangeRate = await exchangeRateService.getCurrentRate();
            expect(exchangeRate).toBe(178.50); // 기본값

            // 2. 주소 검증 성공
            const addressData = {
                postcode: '12345',
                address: '서울시 강남구 테헤란로 123',
                addressDetail: '101동 202호',
                customerName: '홍길동',
                phone: '010-1234-5678'
            };

            const addressValidation = await addressService.validateCompleteAddress(addressData);
            expect(addressValidation.isValid).toBe(true);

            // 3. 기본 환율로 가격 계산
            const productData = {
                name: 'iPhone 15',
                costCNY: 5000,
                quantity: 2
            };

            const costKRW = productData.costCNY * exchangeRate;
            const sellingPriceKRW = costKRW * 1.2;

            expect(costKRW).toBe(892500); // 5000 * 178.50
            expect(sellingPriceKRW).toBe(1071000); // 892500 * 1.2

            // 4. 주문 생성 성공
            const orderData = {
                customerName: addressData.customerName,
                customerPhone: addressData.phone,
                pccc: 'P123456789012',
                shippingAddress: `${addressData.address} ${addressData.addressDetail}`,
                items: [
                    {
                        productId: 'prod-1',
                        productName: productData.name,
                        quantity: productData.quantity,
                        price: sellingPriceKRW
                    }
                ]
            };

            const order = new Order(orderData);

            expect(order.getTotalAmount()).toBe(2142000); // 1071000 * 2
        });
    });

    describe('특수 배송 지역 주문 처리', () => {
        it('제주도 주문 시 특수 배송비 적용', async () => {
            // 1. 환율 조회
            const mockCachedRate = {
                rate: 180.50,
                date: '2024-01-01'
            };

            mockSupabase.single.mockResolvedValue({
                data: mockCachedRate,
                error: null
            });

            const exchangeRate = await exchangeRateService.getCurrentRate();

            // 2. 제주도 주소 검증
            const jejuAddressData = {
                postcode: '63000',
                address: '제주특별자치도 제주시 연동 123-45',
                addressDetail: '101동 202호',
                customerName: '김제주',
                phone: '010-9876-5432'
            };

            const addressValidation = await addressService.validateCompleteAddress(jejuAddressData);
            expect(addressValidation.isValid).toBe(true);

            // 3. 특수 배송비 확인
            const specialDeliveryInfo = addressService.getSpecialDeliveryInfo(jejuAddressData.address);
            expect(specialDeliveryInfo?.isSpecial).toBe(true);
            expect(specialDeliveryInfo?.additionalFee).toBeGreaterThan(0);

            // 4. 상품 가격 계산
            const productData = {
                name: 'iPhone 15',
                costCNY: 5000,
                quantity: 1
            };

            const costKRW = productData.costCNY * exchangeRate;
            const sellingPriceKRW = costKRW * 1.2;
            const specialShippingFee = specialDeliveryInfo?.additionalFee || 0;

            // 5. 주문 생성 (특수 배송비 포함)
            const orderData = {
                customerName: jejuAddressData.customerName,
                customerPhone: jejuAddressData.phone,
                pccc: 'P123456789012',
                shippingAddress: `${jejuAddressData.address} ${jejuAddressData.addressDetail}`,
                items: [
                    {
                        productId: 'prod-1',
                        productName: productData.name,
                        quantity: productData.quantity,
                        price: sellingPriceKRW
                    }
                ],
                shippingFee: specialShippingFee
            };

            const order = new Order(orderData);

            expect(order.getTotalAmount()).toBe(sellingPriceKRW + specialShippingFee);
        });
    });

    describe('다국어 주문 처리', () => {
        it('한국어 주문 생성', async () => {
            const koreanOrderData = {
                customerName: '홍길동',
                customerPhone: '010-1234-5678',
                pccc: 'P123456789012',
                shippingAddress: '서울시 강남구 테헤란로 123',
                items: [
                    {
                        productId: 'prod-1',
                        productName: '아이폰 15',
                        quantity: 1,
                        price: 1000000
                    }
                ]
            };

            const order = new Order(koreanOrderData);

            expect(order.customerName).toBe('홍길동');
            expect(order.items[0].productName).toBe('아이폰 15');
        });

        it('중국어 주문 생성', async () => {
            const chineseOrderData = {
                customerName: '张三',
                customerPhone: '010-1234-5678',
                pccc: 'P123456789012',
                shippingAddress: '北京市朝阳区三里屯123号',
                items: [
                    {
                        productId: 'prod-1',
                        productName: 'iPhone 15',
                        quantity: 1,
                        price: 1000000
                    }
                ]
            };

            const order = new Order(chineseOrderData);

            expect(order.customerName).toBe('张三');
            expect(order.shippingAddress).toBe('北京市朝阳区三里屯123号');
        });
    });

    describe('에러 복구 시나리오', () => {
        it('환율 API와 우편번호 API 모두 실패 시 기본값으로 처리', async () => {
            // 1. 환율 API 실패
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
            });

            (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

            const exchangeRate = await exchangeRateService.getCurrentRate();
            expect(exchangeRate).toBe(178.50); // 기본값

            // 2. 우편번호 API 실패 (window.daum 없음)
            delete (window as any).daum;

            // 3. 수동 입력 주소로 주문 생성
            const manualAddressData = {
                postcode: '12345',
                address: '서울시 강남구 테헤란로 123',
                addressDetail: '101동 202호',
                customerName: '홍길동',
                phone: '010-1234-5678'
            };

            const addressValidation = await addressService.validateCompleteAddress(manualAddressData);
            expect(addressValidation.isValid).toBe(true);

            // 4. 기본 환율로 주문 생성
            const orderData = {
                customerName: manualAddressData.customerName,
                customerPhone: manualAddressData.phone,
                pccc: 'P123456789012',
                shippingAddress: `${manualAddressData.address} ${manualAddressData.addressDetail}`,
                items: [
                    {
                        productId: 'prod-1',
                        productName: 'iPhone 15',
                        quantity: 1,
                        price: 1000000
                    }
                ]
            };

            const order = new Order(orderData);

            expect(order.customerName).toBe('홍길동');
            expect(order.getTotalAmount()).toBe(1000000);
        });
    });
});
