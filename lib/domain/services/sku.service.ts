import crypto from 'crypto';

/**
 * SKU 생성을 위한 입력 인터페이스
 */
export interface SKUInput {
  category: string;
  model: string;
  color?: string;
  brand?: string;
}

/**
 * 문자열을 SKU 형식에 맞게 정리
 * - 특수문자 제거
 * - 공백 제거
 * - 최대 길이 제한
 */
function sanitizeForSKU(text: string, maxLength: number = 20): string {
  if (!text) return '';
  
  // 특수문자 및 공백 제거 (영문, 숫자, 한글만 남김)
  const sanitized = text.replace(/[^a-zA-Z0-9가-힣]/g, '');
  
  // 최대 길이로 자르기
  return sanitized.substring(0, maxLength);
}

/**
 * 5자리 고유 해시 생성
 * @param baseString - 해시 생성의 기반이 되는 문자열
 * @returns 5자리 대문자 영숫자 해시
 */
function generateHash5(baseString: string): string {
  // 현재 시간과 랜덤 값을 추가하여 유니크한 해시 생성
  const uniqueString = `${baseString}-${Date.now()}-${Math.random()}`;
  const hash = crypto.createHash('sha256').update(uniqueString).digest('hex');
  
  // 해시에서 영숫자만 추출하여 5자리로 변환
  const alphaNumeric = hash.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  
  // 5자리로 자르고, 부족하면 0으로 채우기
  return alphaNumeric.substring(0, 5).padEnd(5, '0');
}

/**
 * SKU 자동 생성 함수
 * 패턴: [카테고리]-[모델]-[색상]-[브랜드]-[HASH5]
 * 
 * @param input - SKU 생성에 필요한 정보
 * @returns 생성된 SKU 문자열
 * 
 * @example
 * generateSKU({
 *   category: 'ELEC',
 *   model: 'iPhone15',
 *   color: 'Black',
 *   brand: 'Apple'
 * })
 * // Returns: "ELEC-iPhone15-Black-Apple-A1B2C"
 */
export function generateSKU(input: SKUInput): string {
  // 각 필드 정리 (길이 제한 적용)
  const category = sanitizeForSKU(input.category, 20);
  const model = sanitizeForSKU(input.model, 30);
  const color = sanitizeForSKU(input.color || '', 20);
  const brand = sanitizeForSKU(input.brand || '', 20);
  
  // 해시 생성을 위한 기본 문자열
  const baseString = `${category}${model}${color}${brand}`;
  const hash = generateHash5(baseString);
  
  // SKU 조합
  const skuParts = [category, model, color, brand, hash];
  return skuParts.join('-');
}

/**
 * SKU 유효성 검증
 * @param sku - 검증할 SKU 문자열
 * @returns SKU가 올바른 형식인지 여부
 */
export function isValidSKU(sku: string): boolean {
  if (!sku || typeof sku !== 'string') return false;
  
  const parts = sku.split('-');
  
  // 5개 부분으로 구성되어야 함
  if (parts.length !== 5) return false;
  
  // 카테고리와 모델은 필수
  if (!parts[0] || !parts[1]) return false;
  
  // 해시는 5자리 영숫자여야 함
  const hash = parts[4];
  if (!hash || !/^[A-Z0-9]{5}$/.test(hash)) return false;
  
  return true;
}

/**
 * SKU에서 정보 추출
 * @param sku - 파싱할 SKU 문자열
 * @returns SKU 구성 요소 객체
 */
export function parseSKU(sku: string): SKUInput & { hash: string } | null {
  if (!isValidSKU(sku)) return null;
  
  const parts = sku.split('-');
  
  return {
    category: parts[0],
    model: parts[1],
    color: parts[2] || undefined,
    brand: parts[3] || undefined,
    hash: parts[4]
  };
}