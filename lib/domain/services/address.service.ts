/**
 * 주소 관련 고급 서비스
 * Daum 우편번호 API와 연동하여 주소 검증, 포맷팅, 배송 구역 계산 등을 처리
 */

export interface AddressData {
  postcode: string;
  address: string;
  addressDetail?: string;
  addressEnglish?: string;
  roadAddress?: string;
  jibunAddress?: string;
  buildingName?: string;
}

export interface ParsedAddress {
  city: string;
  district: string;
  street: string;
  building: string;
  buildingName?: string;
  region?: string;
  dong?: string;
}

export interface FormattedAddress {
  full: string;
  short: string;
  postal: string;
}

export interface ShippingZone {
  zone: string;
  estimatedDays: number;
  baseShippingFee: number;
  additionalFee?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SpecialDeliveryInfo {
  type: string;
  additionalDays: number;
  additionalFee: number;
  notice: string;
}

/**
 * 우편번호 유효성 검증
 */
export function validateZipCode(zipCode: string): boolean {
  if (!zipCode || typeof zipCode !== 'string') {
    return false;
  }
  
  // 한국 우편번호: 5자리 숫자
  const pattern = /^[0-9]{5}$/;
  return pattern.test(zipCode);
}

/**
 * 주소 파싱
 */
export function parseAddress(address: string): ParsedAddress {
  if (!address) {
    return {
      city: '',
      district: '',
      street: '',
      building: ''
    };
  }

  const result: ParsedAddress = {
    city: '',
    district: '',
    street: '',
    building: ''
  };

  // 한국 주소 패턴
  const koreanPattern = /^(.*?[시도])\s+(.*?[시구군])\s+(.*?[로길])\s+(\d+[-\d]*)\s*(.*)?$/;
  const koreanMatch = address.match(koreanPattern);

  if (koreanMatch) {
    result.city = koreanMatch[1];
    result.district = koreanMatch[2];
    result.street = koreanMatch[3];
    result.building = koreanMatch[4];
    if (koreanMatch[5]) {
      result.buildingName = koreanMatch[5].trim();
    }

    // 지역 추출
    if (result.city.includes('서울')) result.region = '서울';
    else if (result.city.includes('경기')) result.region = '경기';
    else if (result.city.includes('인천')) result.region = '인천';
    else if (result.city.includes('부산')) result.region = '부산';
    else if (result.city.includes('대구')) result.region = '대구';
    else if (result.city.includes('광주')) result.region = '광주';
    else if (result.city.includes('대전')) result.region = '대전';
    else if (result.city.includes('울산')) result.region = '울산';
    else if (result.city.includes('제주')) result.region = '제주';
    else if (result.city.includes('강원')) result.region = '강원';
    else if (result.city.includes('충북') || result.city.includes('충청북')) result.region = '충북';
    else if (result.city.includes('충남') || result.city.includes('충청남')) result.region = '충남';
    else if (result.city.includes('전북') || result.city.includes('전라북')) result.region = '전북';
    else if (result.city.includes('전남') || result.city.includes('전라남')) result.region = '전남';
    else if (result.city.includes('경북') || result.city.includes('경상북')) result.region = '경북';
    else if (result.city.includes('경남') || result.city.includes('경상남')) result.region = '경남';
  } else {
    // 영문 주소 또는 다른 형식
    const parts = address.split(' ');
    if (parts.length >= 4) {
      result.city = parts[0];
      result.district = parts[1];
      result.street = parts[2];
      result.building = parts[3];
      if (parts.length > 4) {
        result.buildingName = parts.slice(4).join(' ');
      }
    }
  }

  return result;
}

/**
 * 주소 포맷팅
 */
export function formatAddress(addressData: AddressData): FormattedAddress {
  const full = addressData.addressDetail 
    ? `[${addressData.postcode}] ${addressData.address} ${addressData.addressDetail}`
    : `[${addressData.postcode}] ${addressData.address}`;

  const parsed = parseAddress(addressData.address);
  const short = `${parsed.region || parsed.city.replace(/특별시|광역시|특별자치도|도/, '')} ${parsed.district} ${parsed.street}`;

  return {
    full: full.trim(),
    short: short.trim(),
    postal: addressData.postcode
  };
}

/**
 * 주소에서 지역 추출
 */
export function getRegionFromAddress(address: string): string {
  const regionMap: { [key: string]: string } = {
    '서울': '서울',
    '경기': '경기',
    '인천': '인천',
    '부산': '부산',
    '대구': '대구',
    '광주': '광주',
    '대전': '대전',
    '울산': '울산',
    '세종': '세종',
    '제주': '제주',
    '강원': '강원',
    '충북': '충북',
    '충남': '충남',
    '충청북': '충북',
    '충청남': '충남',
    '전북': '전북',
    '전남': '전남',
    '전라북': '전북',
    '전라남': '전남',
    '경북': '경북',
    '경남': '경남',
    '경상북': '경북',
    '경상남': '경남'
  };

  for (const [key, value] of Object.entries(regionMap)) {
    if (address.includes(key)) {
      return value;
    }
  }

  return '기타';
}

/**
 * 배송 구역 계산
 */
export function calculateShippingZone(zipCode: string): ShippingZone {
  const code = parseInt(zipCode);
  
  // 제주도 (63000-63644)
  if (code >= 63000 && code <= 63644) {
    return {
      zone: '제주/도서',
      estimatedDays: 3,
      baseShippingFee: 5000,
      additionalFee: 3000
    };
  }
  
  // 서울 (01000-08999)
  if (code >= 1000 && code <= 8999) {
    return {
      zone: '수도권',
      estimatedDays: 1,
      baseShippingFee: 3000
    };
  }
  
  // 경기도 (10000-18999)
  if (code >= 10000 && code <= 18999) {
    return {
      zone: '수도권',
      estimatedDays: 1,
      baseShippingFee: 3000
    };
  }
  
  // 인천 (21000-23999)
  if (code >= 21000 && code <= 23999) {
    return {
      zone: '수도권',
      estimatedDays: 1,
      baseShippingFee: 3000
    };
  }
  
  // 강원도 산간지역 (24000-26999)
  if (code >= 24000 && code <= 26999) {
    return {
      zone: '산간',
      estimatedDays: 3,
      baseShippingFee: 4000,
      additionalFee: 2000
    };
  }
  
  // 기타 지역
  return {
    zone: '지방',
    estimatedDays: 2,
    baseShippingFee: 3500
  };
}

/**
 * 주소 관리 서비스 클래스
 */
export class AddressService {
  /**
   * 완전한 주소 검증
   */
  async validateCompleteAddress(data: {
    postcode: string;
    address: string;
    addressDetail: string;
    customerName: string;
    phone: string;
  }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 필수 필드 검증
    if (!data.postcode) {
      errors.push('우편번호는 필수입니다');
    } else if (!validateZipCode(data.postcode)) {
      errors.push('올바른 우편번호 형식이 아닙니다');
    }

    if (!data.address) {
      errors.push('주소는 필수입니다');
    }

    if (!data.customerName) {
      errors.push('수취인 이름은 필수입니다');
    }

    if (!data.phone) {
      errors.push('전화번호는 필수입니다');
    } else if (!this.validatePhoneNumber(data.phone)) {
      errors.push('올바른 전화번호 형식이 아닙니다');
    }

    // 경고 사항
    if (!data.addressDetail) {
      warnings.push('상세주소를 입력하면 배송이 더 정확합니다');
    }

    if (this.isSpecialDeliveryArea(data.address)) {
      warnings.push('도서/산간 지역은 추가 배송일이 소요될 수 있습니다');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 전화번호 유효성 검증
   */
  private validatePhoneNumber(phone: string): boolean {
    // 한국 전화번호 형식: 010-1234-5678, 01012345678, 02-123-4567 등
    const patterns = [
      /^01[0-9]-[0-9]{3,4}-[0-9]{4}$/,
      /^01[0-9]{8,9}$/,
      /^0[2-9][0-9]?-[0-9]{3,4}-[0-9]{4}$/,
      /^0[2-9][0-9]{7,8}$/
    ];

    return patterns.some(pattern => pattern.test(phone));
  }

  /**
   * 주소 표준화
   */
  standardizeAddress(address: string): string {
    let standardized = address;

    // 시/도 표준화
    standardized = standardized.replace(/서울(?!특별시)/g, '서울특별시');
    standardized = standardized.replace(/부산(?!광역시)/g, '부산광역시');
    standardized = standardized.replace(/대구(?!광역시)/g, '대구광역시');
    standardized = standardized.replace(/인천(?!광역시)/g, '인천광역시');
    standardized = standardized.replace(/광주(?!광역시)/g, '광주광역시');
    standardized = standardized.replace(/대전(?!광역시)/g, '대전광역시');
    standardized = standardized.replace(/울산(?!광역시)/g, '울산광역시');
    standardized = standardized.replace(/세종(?!특별자치시)/g, '세종특별자치시');

    // 번지 표준화
    standardized = standardized.replace(/(\d+)번지/g, '$1');
    
    // 공백 정리
    standardized = standardized.replace(/\s+/g, ' ').trim();

    return standardized;
  }

  /**
   * 특수 배송 지역 확인
   */
  isSpecialDeliveryArea(address: string): boolean {
    const specialAreas = [
      '제주',
      '울릉',
      '독도',
      '백령',
      '대청',
      '소청',
      '연평',
      '덕적',
      '자월',
      '영흥',
      '거제',
      '통영',
      '남해',
      '거문',
      '추자'
    ];

    return specialAreas.some(area => address.includes(area));
  }

  /**
   * 특수 배송 정보 가져오기
   */
  getSpecialDeliveryInfo(address: string): SpecialDeliveryInfo | null {
    if (address.includes('제주')) {
      return {
        type: '도서지역',
        additionalDays: 2,
        additionalFee: 3000,
        notice: '도서지역은 추가 배송일이 소요됩니다'
      };
    }

    if (address.includes('울릉') || address.includes('독도')) {
      return {
        type: '도서지역',
        additionalDays: 3,
        additionalFee: 5000,
        notice: '원거리 도서지역은 기상에 따라 배송이 지연될 수 있습니다'
      };
    }

    const islandAreas = ['백령', '대청', '소청', '연평', '덕적'];
    if (islandAreas.some(area => address.includes(area))) {
      return {
        type: '도서지역',
        additionalDays: 2,
        additionalFee: 4000,
        notice: '서해 도서지역은 추가 배송일이 소요됩니다'
      };
    }

    return null;
  }

  /**
   * 주소를 좌표로 변환 (Geocoding)
   * 실제로는 Kakao Map API 등을 사용해야 함
   */
  async geocodeAddress(address: string): Promise<Coordinates> {
    // 모의 구현 - 실제로는 외부 API 호출
    const mockCoordinates: { [key: string]: Coordinates } = {
      '서울': { lat: 37.5665, lng: 126.9780 },
      '강남': { lat: 37.5172, lng: 127.0473 },
      '부산': { lat: 35.1796, lng: 129.0756 },
      '제주': { lat: 33.4996, lng: 126.5312 }
    };

    for (const [key, coords] of Object.entries(mockCoordinates)) {
      if (address.includes(key)) {
        // 약간의 랜덤 오프셋 추가
        return {
          lat: coords.lat + (Math.random() - 0.5) * 0.01,
          lng: coords.lng + (Math.random() - 0.5) * 0.01
        };
      }
    }

    // 기본값: 서울 중심
    return { lat: 37.5665, lng: 126.9780 };
  }

  /**
   * 두 지점 간 거리 계산 (Haversine formula)
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // 지구 반경 (km)
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // 소수점 2자리
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

/**
 * 주소 검증 유틸리티 함수
 */
export function validateAddress(address: string): boolean {
  if (!address || address.length < 10) {
    return false;
  }

  // 최소한 시/도, 구/군, 도로명이 있어야 함
  const requiredParts = ['시', '구', '로'];
  return requiredParts.some(part => address.includes(part));
}