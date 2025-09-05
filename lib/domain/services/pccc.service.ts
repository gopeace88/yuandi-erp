/**
 * 개인통관고유부호(PCCC - Personal Customs Clearance Code) 서비스
 * 해외직구 시 세관 통관을 위한 필수 코드 검증
 */

/**
 * PCCC 형식 검증
 * 형식: P로 시작하는 13자리 (P + 12자리 숫자)
 * 예: P123456789012
 * 
 * @param pccc - 검증할 PCCC 코드
 * @returns 유효한 형식인지 여부
 */
export function isValidPCCCFormat(pccc: string): boolean {
  if (!pccc || typeof pccc !== 'string') {
    return false;
  }

  // 공백 제거
  const cleaned = pccc.trim().toUpperCase();

  // 정규식: P로 시작하고 12자리 숫자
  const pcccPattern = /^P\d{12}$/;
  
  return pcccPattern.test(cleaned);
}

/**
 * PCCC 정규화
 * 입력된 PCCC를 표준 형식으로 변환
 * 
 * @param pccc - 정규화할 PCCC 코드
 * @returns 정규화된 PCCC 또는 null
 */
export function normalizePCCC(pccc: string): string | null {
  if (!pccc) return null;

  // 공백 및 특수문자 제거
  let cleaned = pccc.replace(/[\s\-\_]/g, '').toUpperCase();

  // P가 없으면 추가
  if (!cleaned.startsWith('P')) {
    // 12자리 숫자인 경우 P를 앞에 추가
    if (/^\d{12}$/.test(cleaned)) {
      cleaned = 'P' + cleaned;
    }
  }

  // 유효성 검증
  if (isValidPCCCFormat(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * PCCC 마스킹
 * 개인정보 보호를 위해 일부 숫자를 마스킹
 * 
 * @param pccc - 마스킹할 PCCC 코드
 * @param showLast - 마지막에 보여줄 자리수 (기본 4자리)
 * @returns 마스킹된 PCCC
 */
export function maskPCCC(pccc: string, showLast: number = 4): string {
  const normalized = normalizePCCC(pccc);
  if (!normalized) return '';

  const totalDigits = 12; // P 제외한 숫자 부분
  const maskLength = totalDigits - showLast;
  
  if (maskLength <= 0) return normalized;

  const masked = 'P' + '*'.repeat(maskLength) + normalized.slice(-showLast);
  
  // 읽기 쉽게 하이픈 추가 (P-****-****-1234)
  return masked.replace(/^(P)(\*{4})(\*{4})(\d{4})$/, '$1-$2-$3-$4');
}

/**
 * 주민등록번호로부터 PCCC 생성 (모의 함수)
 * 주의: 실제 서비스에서는 관세청 API를 통해 발급받아야 함
 * 이 함수는 개발/테스트 목적으로만 사용
 * 
 * @param residentNumber - 주민등록번호 (하이픈 제외)
 * @returns 생성된 PCCC (테스트용)
 */
export function generatePCCCFromRRN(residentNumber: string): string {
  // 실제로는 관세청 API를 호출해야 함
  console.warn('This is a mock function for development. Use official API in production.');
  
  // 주민번호 앞 6자리 + 뒤 첫자리 + 랜덤 5자리
  const cleaned = residentNumber.replace(/\D/g, '');
  if (cleaned.length < 7) {
    throw new Error('Invalid resident number format');
  }

  const base = cleaned.substring(0, 7);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  return `P${base}${random}`;
}

/**
 * PCCC 유효성 검증 (통합)
 * 형식 검증 + 추가 비즈니스 규칙
 * 
 * @param pccc - 검증할 PCCC
 * @returns 검증 결과
 */
export interface PCCCValidationResult {
  isValid: boolean;
  normalized: string | null;
  errors: string[];
}

export function validatePCCC(pccc: string): PCCCValidationResult {
  const errors: string[] = [];

  // 필수 입력 체크
  if (!pccc || pccc.trim() === '') {
    errors.push('개인통관고유부호는 필수 입력 항목입니다');
    return { isValid: false, normalized: null, errors };
  }

  // 정규화 시도
  const normalized = normalizePCCC(pccc);
  if (!normalized) {
    errors.push('올바른 개인통관고유부호 형식이 아닙니다 (P + 12자리 숫자)');
    return { isValid: false, normalized: null, errors };
  }

  // 추가 비즈니스 규칙 검증
  // 예: 특정 패턴 차단
  const blockedPatterns = [
    'P000000000000',
    'P111111111111',
    'P123456789012'
  ];

  if (blockedPatterns.includes(normalized)) {
    errors.push('사용할 수 없는 개인통관고유부호입니다');
    return { isValid: false, normalized, errors };
  }

  return { 
    isValid: true, 
    normalized, 
    errors 
  };
}

/**
 * PCCC 정보 조회 (모의 함수)
 * 실제로는 관세청 API를 호출해야 함
 */
export interface PCCCInfo {
  pccc: string;
  name: string;
  isValid: boolean;
  registeredDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export async function getPCCCInfo(pccc: string): Promise<PCCCInfo | null> {
  // 실제로는 관세청 API를 호출해야 함
  console.warn('This is a mock function for development. Use official API in production.');

  const normalized = normalizePCCC(pccc);
  if (!normalized) return null;

  // 모의 데이터 반환
  await new Promise(resolve => setTimeout(resolve, 500)); // 네트워크 지연 시뮬레이션

  return {
    pccc: normalized,
    name: '홍길동',
    isValid: true,
    registeredDate: '2024-01-01',
    status: 'ACTIVE'
  };
}

/**
 * PCCC 일괄 검증
 * 여러 PCCC를 한 번에 검증
 */
export function validatePCCCBatch(pcccs: string[]): Map<string, PCCCValidationResult> {
  const results = new Map<string, PCCCValidationResult>();

  for (const pccc of pcccs) {
    results.set(pccc, validatePCCC(pccc));
  }

  return results;
}

/**
 * PCCC 입력 포맷터
 * 사용자가 입력하는 동안 실시간으로 포맷팅
 */
export function formatPCCCInput(input: string): string {
  // 숫자와 P만 남기기
  let cleaned = input.toUpperCase().replace(/[^P0-9]/g, '');

  // P로 시작하지 않으면 추가
  if (!cleaned.startsWith('P')) {
    cleaned = 'P' + cleaned.replace(/P/g, '');
  }

  // 최대 13자리로 제한 (P + 12자리)
  if (cleaned.length > 13) {
    cleaned = cleaned.substring(0, 13);
  }

  // 읽기 쉽게 하이픈 추가 (P-1234-5678-9012 형식)
  if (cleaned.length > 1) {
    const numbers = cleaned.substring(1);
    const parts = [];
    
    if (numbers.length > 0) parts.push(numbers.substring(0, 4));
    if (numbers.length > 4) parts.push(numbers.substring(4, 8));
    if (numbers.length > 8) parts.push(numbers.substring(8, 12));
    
    return 'P-' + parts.join('-');
  }

  return cleaned;
}