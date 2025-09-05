import {
  AddressService,
  validateAddress,
  formatAddress,
  parseAddress,
  validateZipCode,
  getRegionFromAddress,
  calculateShippingZone
} from '../address.service';

describe('Address Service', () => {
  let addressService: AddressService;

  beforeEach(() => {
    addressService = new AddressService();
  });

  describe('validateZipCode', () => {
    it('should validate correct Korean zip codes', () => {
      expect(validateZipCode('12345')).toBe(true);
      expect(validateZipCode('06234')).toBe(true);
      expect(validateZipCode('13494')).toBe(true);
    });

    it('should reject invalid zip codes', () => {
      expect(validateZipCode('1234')).toBe(false); // Too short
      expect(validateZipCode('123456')).toBe(false); // Too long
      expect(validateZipCode('ABCDE')).toBe(false); // Letters
      expect(validateZipCode('')).toBe(false);
      expect(validateZipCode(null as any)).toBe(false);
    });
  });

  describe('parseAddress', () => {
    it('should parse standard Korean address', () => {
      const address = '서울특별시 강남구 테헤란로 123';
      const parsed = parseAddress(address);
      
      expect(parsed.city).toBe('서울특별시');
      expect(parsed.district).toBe('강남구');
      expect(parsed.street).toBe('테헤란로');
      expect(parsed.building).toBe('123');
      expect(parsed.region).toBe('서울');
    });

    it('should parse address with building name', () => {
      const address = '경기도 성남시 분당구 판교역로 235 에이치스퀘어 N동';
      const parsed = parseAddress(address);
      
      expect(parsed.city).toBe('경기도');
      expect(parsed.district).toBe('성남시 분당구');
      expect(parsed.street).toBe('판교역로');
      expect(parsed.building).toBe('235');
      expect(parsed.buildingName).toBe('에이치스퀘어 N동');
      expect(parsed.region).toBe('경기');
    });

    it('should handle English addresses', () => {
      const address = 'Seoul Gangnam-gu Teheran-ro 123';
      const parsed = parseAddress(address);
      
      expect(parsed.city).toBe('Seoul');
      expect(parsed.district).toBe('Gangnam-gu');
      expect(parsed.street).toBe('Teheran-ro');
      expect(parsed.building).toBe('123');
    });
  });

  describe('formatAddress', () => {
    it('should format address for display', () => {
      const addressData = {
        postcode: '06234',
        address: '서울특별시 강남구 테헤란로 123',
        addressDetail: '아파트 101동 1501호'
      };

      const formatted = formatAddress(addressData);
      expect(formatted.full).toBe('[06234] 서울특별시 강남구 테헤란로 123 아파트 101동 1501호');
      expect(formatted.short).toBe('서울 강남구 테헤란로');
      expect(formatted.postal).toBe('06234');
    });

    it('should format without detail address', () => {
      const addressData = {
        postcode: '06234',
        address: '서울특별시 강남구 테헤란로 123',
        addressDetail: ''
      };

      const formatted = formatAddress(addressData);
      expect(formatted.full).toBe('[06234] 서울특별시 강남구 테헤란로 123');
    });
  });

  describe('getRegionFromAddress', () => {
    it('should extract region from address', () => {
      expect(getRegionFromAddress('서울특별시 강남구')).toBe('서울');
      expect(getRegionFromAddress('경기도 성남시')).toBe('경기');
      expect(getRegionFromAddress('인천광역시 중구')).toBe('인천');
      expect(getRegionFromAddress('부산광역시 해운대구')).toBe('부산');
      expect(getRegionFromAddress('제주특별자치도 제주시')).toBe('제주');
    });
  });

  describe('calculateShippingZone', () => {
    it('should calculate shipping zone for Seoul', () => {
      const zone = calculateShippingZone('06234'); // Seoul zipcode
      expect(zone.zone).toBe('수도권');
      expect(zone.estimatedDays).toBe(1);
      expect(zone.baseShippingFee).toBe(3000);
    });

    it('should calculate shipping zone for Jeju', () => {
      const zone = calculateShippingZone('63000'); // Jeju zipcode
      expect(zone.zone).toBe('제주/도서');
      expect(zone.estimatedDays).toBe(3);
      expect(zone.baseShippingFee).toBe(5000);
      expect(zone.additionalFee).toBe(3000);
    });

    it('should handle mountain areas', () => {
      const zone = calculateShippingZone('25000'); // Mountain area
      expect(zone.zone).toBe('산간');
      expect(zone.estimatedDays).toBe(3);
      expect(zone.additionalFee).toBeGreaterThan(0);
    });
  });

  describe('AddressService', () => {
    it('should validate complete address', async () => {
      const addressData = {
        postcode: '06234',
        address: '서울특별시 강남구 테헤란로 123',
        addressDetail: '아파트 101동',
        customerName: '홍길동',
        phone: '010-1234-5678'
      };

      const validation = await addressService.validateCompleteAddress(addressData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const addressData = {
        postcode: '',
        address: '서울특별시 강남구 테헤란로 123',
        addressDetail: '',
        customerName: '홍길동',
        phone: '010-1234-5678'
      };

      const validation = await addressService.validateCompleteAddress(addressData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('우편번호는 필수입니다');
    });

    it('should validate phone number format', async () => {
      const addressData = {
        postcode: '06234',
        address: '서울특별시 강남구 테헤란로 123',
        addressDetail: '아파트 101동',
        customerName: '홍길동',
        phone: '123-456' // Invalid format
      };

      const validation = await addressService.validateCompleteAddress(addressData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('올바른 전화번호 형식이 아닙니다');
    });

    it('should standardize address format', () => {
      const input = '서울 강남구 테헤란로123번지';
      const standardized = addressService.standardizeAddress(input);
      
      expect(standardized).toBe('서울특별시 강남구 테헤란로 123');
    });

    it('should detect special delivery areas', () => {
      const jejuAddress = '제주특별자치도 제주시 첨단로 242';
      const isSpecial = addressService.isSpecialDeliveryArea(jejuAddress);
      
      expect(isSpecial).toBe(true);
      expect(addressService.getSpecialDeliveryInfo(jejuAddress)).toEqual({
        type: '도서지역',
        additionalDays: 2,
        additionalFee: 3000,
        notice: '도서지역은 추가 배송일이 소요됩니다'
      });
    });

    it('should geocode address for mapping', async () => {
      const coordinates = await addressService.geocodeAddress(
        '서울특별시 강남구 테헤란로 123'
      );
      
      expect(coordinates).toHaveProperty('lat');
      expect(coordinates).toHaveProperty('lng');
      expect(coordinates.lat).toBeGreaterThan(37);
      expect(coordinates.lat).toBeLessThan(38);
      expect(coordinates.lng).toBeGreaterThan(126);
      expect(coordinates.lng).toBeLessThan(128);
    });

    it('should calculate distance between addresses', () => {
      const addr1 = { lat: 37.5665, lng: 126.9780 }; // Seoul City Hall
      const addr2 = { lat: 37.5172, lng: 127.0473 }; // Gangnam Station
      
      const distance = addressService.calculateDistance(addr1, addr2);
      
      expect(distance).toBeGreaterThan(8); // km
      expect(distance).toBeLessThan(10);
    });
  });
});