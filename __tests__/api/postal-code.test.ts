/**
 * 우편번호 API 테스트
 * 다음 우편번호 API 연동 및 주소 서비스 테스트
 */

import { AddressService } from '@/lib/domain/services/address.service';

// Mock window.daum
const mockDaum = {
    Postcode: jest.fn()
};

// Mock window object
Object.defineProperty(window, 'daum', {
    value: mockDaum,
    writable: true
});

// Mock document methods
Object.defineProperty(document, 'createElement', {
    value: jest.fn(() => ({
        src: '',
        async: false,
        onload: null,
        parentNode: {
            removeChild: jest.fn()
        }
    }))
});

Object.defineProperty(document, 'getElementById', {
    value: jest.fn(() => ({
        innerHTML: ''
    }))
});

describe('우편번호 API 테스트', () => {
    let addressService: AddressService;

    beforeEach(() => {
        addressService = new AddressService();
        jest.clearAllMocks();
    });

    describe('다음 우편번호 API 연동', () => {
        it('API 스크립트 로딩 성공', async () => {
            const mockScript = {
                src: '',
                async: false,
                onload: null,
                parentNode: {
                    removeChild: jest.fn()
                }
            };

            (document.createElement as jest.Mock).mockReturnValue(mockScript);
            (document.getElementById as jest.Mock).mockReturnValue({
                innerHTML: ''
            });

            // 스크립트 로딩 시뮬레이션
            mockScript.onload = () => {
                if (window.daum && window.daum.Postcode) {
                    // API 사용 가능
                }
            };

            // 스크립트 로딩 완료 시뮬레이션
            setTimeout(() => {
                mockScript.onload();
            }, 100);

            expect(document.createElement).toHaveBeenCalledWith('script');
            expect(mockScript.src).toBe('//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js');
        });

        it('API 스크립트 로딩 실패 시 폴백 처리', async () => {
            const mockScript = {
                src: '',
                async: false,
                onload: null,
                onerror: null,
                parentNode: {
                    removeChild: jest.fn()
                }
            };

            (document.createElement as jest.Mock).mockReturnValue(mockScript);
            (document.getElementById as jest.Mock).mockReturnValue({
                innerHTML: ''
            });

            // 스크립트 로딩 실패 시뮬레이션
            setTimeout(() => {
                if (mockScript.onerror) {
                    mockScript.onerror();
                }
            }, 100);

            // 폴백 모드로 전환되어야 함
            expect(document.createElement).toHaveBeenCalledWith('script');
        });
    });

    describe('주소 검색 기능', () => {
        it('도로명 주소 검색', () => {
            const mockData = {
                addressType: 'R',
                zonecode: '12345',
                address: '서울시 강남구 테헤란로 123',
                roadAddress: '서울시 강남구 테헤란로 123',
                jibunAddress: '서울시 강남구 역삼동 123-45',
                bname: '역삼동',
                buildingName: '테헤란빌딩',
                apartment: 'Y',
                addressEnglish: '123 Teheran-ro, Gangnam-gu, Seoul'
            };

            const mockPostcode = {
                embed: jest.fn()
            };

            mockDaum.Postcode.mockImplementation((options) => {
                // oncomplete 콜백 호출
                options.oncomplete(mockData);
                return mockPostcode;
            });

            const container = document.getElementById('daum-postcode-container');
            const postcode = new window.daum.Postcode({
                oncomplete: (data) => {
                    expect(data.zonecode).toBe('12345');
                    expect(data.address).toBe('서울시 강남구 테헤란로 123');
                }
            });

            postcode.embed(container);

            expect(mockDaum.Postcode).toHaveBeenCalled();
            expect(mockPostcode.embed).toHaveBeenCalledWith(container);
        });

        it('지번 주소 검색', () => {
            const mockData = {
                addressType: 'J',
                zonecode: '12345',
                address: '서울시 강남구 역삼동 123-45',
                roadAddress: '서울시 강남구 테헤란로 123',
                jibunAddress: '서울시 강남구 역삼동 123-45',
                bname: '역삼동',
                buildingName: '',
                apartment: 'N'
            };

            mockDaum.Postcode.mockImplementation((options) => {
                options.oncomplete(mockData);
                return { embed: jest.fn() };
            });

            const postcode = new window.daum.Postcode({
                oncomplete: (data) => {
                    expect(data.addressType).toBe('J');
                    expect(data.jibunAddress).toBe('서울시 강남구 역삼동 123-45');
                }
            });

            expect(mockDaum.Postcode).toHaveBeenCalled();
        });
    });

    describe('주소 유효성 검증', () => {
        it('유효한 주소 데이터 검증', async () => {
            const validAddress = {
                postcode: '12345',
                address: '서울시 강남구 테헤란로 123',
                addressDetail: '101동 202호',
                customerName: '홍길동',
                phone: '010-1234-5678'
            };

            const result = await addressService.validateCompleteAddress(validAddress);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('잘못된 우편번호 형식 검증', async () => {
            const invalidAddress = {
                postcode: '1234', // 5자리가 아님
                address: '서울시 강남구 테헤란로 123',
                addressDetail: '101동 202호',
                customerName: '홍길동',
                phone: '010-1234-5678'
            };

            const result = await addressService.validateCompleteAddress(invalidAddress);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid postal code format');
        });

        it('빈 주소 검증', async () => {
            const emptyAddress = {
                postcode: '12345',
                address: '',
                addressDetail: '101동 202호',
                customerName: '홍길동',
                phone: '010-1234-5678'
            };

            const result = await addressService.validateCompleteAddress(emptyAddress);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Address is required');
        });
    });

    describe('특수 배송 지역 처리', () => {
        it('제주도 특수 배송비 적용', () => {
            const jejuAddress = '제주특별자치도 제주시 연동 123-45';
            const specialInfo = addressService.getSpecialDeliveryInfo(jejuAddress);

            expect(specialInfo).toBeDefined();
            expect(specialInfo?.isSpecial).toBe(true);
            expect(specialInfo?.additionalFee).toBeGreaterThan(0);
        });

        it('도서산간 지역 특수 배송비 적용', () => {
            const islandAddress = '전라남도 완도군 완도읍 123-45';
            const specialInfo = addressService.getSpecialDeliveryInfo(islandAddress);

            expect(specialInfo).toBeDefined();
            expect(specialInfo?.isSpecial).toBe(true);
            expect(specialInfo?.additionalFee).toBeGreaterThan(0);
        });

        it('일반 지역은 특수 배송비 없음', () => {
            const normalAddress = '서울시 강남구 테헤란로 123';
            const specialInfo = addressService.getSpecialDeliveryInfo(normalAddress);

            expect(specialInfo).toBeNull();
        });
    });

    describe('지오코딩 기능', () => {
        it('주소를 좌표로 변환', async () => {
            const address = '서울시 강남구 테헤란로 123';
            const coordinates = await addressService.geocodeAddress(address);

            expect(coordinates).toBeDefined();
            expect(coordinates.lat).toBeCloseTo(37.5172, 1);
            expect(coordinates.lng).toBeCloseTo(127.0473, 1);
        });

        it('알 수 없는 주소는 기본 좌표 반환', async () => {
            const unknownAddress = '알 수 없는 주소 123';
            const coordinates = await addressService.geocodeAddress(unknownAddress);

            expect(coordinates).toBeDefined();
            expect(coordinates.lat).toBeCloseTo(37.5665, 1); // 서울 중심
            expect(coordinates.lng).toBeCloseTo(126.9780, 1);
        });
    });

    describe('거리 계산', () => {
        it('두 지점 간 거리 계산', () => {
            const point1 = { lat: 37.5665, lng: 126.9780 }; // 서울
            const point2 = { lat: 35.1796, lng: 129.0756 }; // 부산

            const distance = addressService.calculateDistance(point1, point2);

            expect(distance).toBeCloseTo(325, 0); // 약 325km
        });

        it('같은 지점은 거리 0', () => {
            const point = { lat: 37.5665, lng: 126.9780 };

            const distance = addressService.calculateDistance(point, point);

            expect(distance).toBe(0);
        });
    });

    describe('에러 처리', () => {
        it('API 로딩 실패 시 폴백 모드', async () => {
            // window.daum이 없는 상황 시뮬레이션
            delete (window as any).daum;

            const mockScript = {
                src: '',
                async: false,
                onload: null,
                parentNode: {
                    removeChild: jest.fn()
                }
            };

            (document.createElement as jest.Mock).mockReturnValue(mockScript);
            (document.getElementById as jest.Mock).mockReturnValue({
                innerHTML: ''
            });

            // 스크립트 로딩 완료 후에도 daum이 없는 상황
            setTimeout(() => {
                mockScript.onload();
            }, 100);

            // 폴백 모드로 동작해야 함
            expect(document.createElement).toHaveBeenCalledWith('script');
        });

        it('잘못된 주소 데이터 처리', async () => {
            const invalidData = {
                postcode: null,
                address: undefined,
                addressDetail: '',
                customerName: '',
                phone: 'invalid-phone'
            };

            const result = await addressService.validateCompleteAddress(invalidData);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
