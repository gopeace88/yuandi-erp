/**
 * 환율 API 테스트
 * 한국수출입은행 API 연동 및 환율 서비스 테스트
 */

import { ExchangeRateService } from '@/lib/services/exchange-rate.service';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('환율 API 테스트', () => {
    let exchangeRateService: ExchangeRateService;
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('한국수출입은행 API 연동', () => {
        it('API 정상 호출 시 환율 데이터 반환', async () => {
            const mockApiResponse = [
                {
                    result: 1,
                    cur_unit: 'CNH',
                    ttb: '180.50',
                    tts: '181.20',
                    deal_bas_r: '180.85'
                }
            ];

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            process.env.KOREA_EXIM_API_KEY = 'test-api-key';

            const rate = await exchangeRateService.fetchFromKoreaExim('20240101');

            expect(rate).toBe(180.85);
            expect(global.fetch).toHaveBeenCalledWith(
                'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=test-api-key&searchdate=20240101&data=AP01'
            );
        });

        it('API 키가 없을 때 null 반환', async () => {
            delete process.env.KOREA_EXIM_API_KEY;

            const rate = await exchangeRateService.fetchFromKoreaExim();

            expect(rate).toBeNull();
        });

        it('API 응답 오류 시 null 반환', async () => {
            const mockApiResponse = [
                {
                    result: 2,
                    cur_unit: 'CNH',
                    ttb: '180.50',
                    tts: '181.20',
                    deal_bas_r: '180.85'
                }
            ];

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            process.env.KOREA_EXIM_API_KEY = 'test-api-key';

            const rate = await exchangeRateService.fetchFromKoreaExim('20240101');

            expect(rate).toBeNull();
        });

        it('네트워크 오류 시 null 반환', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            process.env.KOREA_EXIM_API_KEY = 'test-api-key';

            const rate = await exchangeRateService.fetchFromKoreaExim('20240101');

            expect(rate).toBeNull();
        });

        it('주말 날짜 자동 조정', async () => {
            const mockApiResponse = [
                {
                    result: 1,
                    cur_unit: 'CNH',
                    ttb: '180.50',
                    tts: '181.20',
                    deal_bas_r: '180.85'
                }
            ];

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            process.env.KOREA_EXIM_API_KEY = 'test-api-key';

            // 일요일 날짜로 호출
            const sunday = new Date('2024-01-07T00:00:00Z'); // 일요일
            const rate = await exchangeRateService.fetchFromKoreaExim();

            // 금요일 날짜로 조정되어 호출되는지 확인
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('searchdate=20240105') // 금요일
            );
        });
    });

    describe('환율 캐싱 로직', () => {
        it('캐시된 환율 데이터 사용', async () => {
            const mockCachedRate = {
                rate: 180.50,
                date: '2024-01-01'
            };

            mockSupabase.single.mockResolvedValue({
                data: mockCachedRate,
                error: null
            });

            const rate = await exchangeRateService.getCurrentRate();

            expect(rate).toBe(180.50);
            expect(mockSupabase.from).toHaveBeenCalledWith('exchange_rates');
        });

        it('캐시 없을 때 API 호출 후 저장', async () => {
            const mockApiResponse = [
                {
                    result: 1,
                    cur_unit: 'CNH',
                    ttb: '180.50',
                    tts: '181.20',
                    deal_bas_r: '180.85'
                }
            ];

            // 캐시 조회 실패
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
            });

            // API 호출 성공
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            // DB 저장 성공
            mockSupabase.insert.mockResolvedValue({
                data: { id: 'test-id' },
                error: null
            });

            process.env.KOREA_EXIM_API_KEY = 'test-api-key';

            const rate = await exchangeRateService.getCurrentRate();

            expect(rate).toBe(180.85);
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                date: expect.any(String),
                base_currency: 'CNY',
                target_currency: 'KRW',
                rate: 180.85,
                source: 'api_bank',
                is_active: true
            });
        });

        it('7일 이상 된 캐시는 무시하고 API 호출', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 8); // 8일 전

            const mockOldCachedRate = {
                rate: 175.00,
                date: oldDate.toISOString().split('T')[0]
            };

            // 오래된 캐시 조회
            mockSupabase.single.mockResolvedValue({
                data: mockOldCachedRate,
                error: null
            });

            const mockApiResponse = [
                {
                    result: 1,
                    cur_unit: 'CNH',
                    ttb: '180.50',
                    tts: '181.20',
                    deal_bas_r: '180.85'
                }
            ];

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            mockSupabase.insert.mockResolvedValue({
                data: { id: 'test-id' },
                error: null
            });

            process.env.KOREA_EXIM_API_KEY = 'test-api-key';

            const rate = await exchangeRateService.getCurrentRate();

            expect(rate).toBe(180.85); // API에서 가져온 최신 환율
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe('환율 계산 로직', () => {
        it('CNY to KRW 환율 계산', async () => {
            const mockCachedRate = {
                rate: 180.50,
                date: '2024-01-01'
            };

            mockSupabase.single.mockResolvedValue({
                data: mockCachedRate,
                error: null
            });

            const rate = await exchangeRateService.getCurrentRate();
            const cnyAmount = 1000;
            const krwAmount = cnyAmount * rate;

            expect(krwAmount).toBe(180500);
        });

        it('KRW to CNY 환율 계산', async () => {
            const mockCachedRate = {
                rate: 180.50,
                date: '2024-01-01'
            };

            mockSupabase.single.mockResolvedValue({
                data: mockCachedRate,
                error: null
            });

            const rate = await exchangeRateService.getCurrentRate();
            const krwAmount = 180500;
            const cnyAmount = krwAmount / rate;

            expect(cnyAmount).toBeCloseTo(1000, 2);
        });
    });

    describe('에러 처리', () => {
        it('API 호출 실패 시 기본값 반환', async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
            });

            (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

            const rate = await exchangeRateService.getCurrentRate();

            expect(rate).toBe(178.50); // 기본값
        });

        it('DB 저장 실패 시에도 환율 반환', async () => {
            const mockApiResponse = [
                {
                    result: 1,
                    cur_unit: 'CNH',
                    ttb: '180.50',
                    tts: '181.20',
                    deal_bas_r: '180.85'
                }
            ];

            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
            });

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            mockSupabase.insert.mockResolvedValue({
                data: null,
                error: new Error('DB Error')
            });

            process.env.KOREA_EXIM_API_KEY = 'test-api-key';

            const rate = await exchangeRateService.getCurrentRate();

            expect(rate).toBe(180.85); // API에서 가져온 환율은 반환
        });
    });
});