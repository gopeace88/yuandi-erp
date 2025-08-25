/**
 * 개선된 색상 관리 시스템
 * - 기본 색상 + 커스텀 색상 지원
 * - 영문을 기본으로 사용하여 국제화 문제 해결
 */

// 자주 사용하는 기본 색상만 정의
export const BASIC_COLORS = {
  'BLACK': { ko: '블랙', zh: '黑色' },
  'WHITE': { ko: '화이트', zh: '白色' },
  'GRAY': { ko: '그레이', zh: '灰色' },
  'SILVER': { ko: '실버', zh: '银色' },
  'GOLD': { ko: '골드', zh: '金色' },
  'BLUE': { ko: '블루', zh: '蓝色' },
  'RED': { ko: '레드', zh: '红色' },
  'GREEN': { ko: '그린', zh: '绿色' },
  'PINK': { ko: '핑크', zh: '粉色' },
  'PURPLE': { ko: '퍼플', zh: '紫色' },
  'YELLOW': { ko: '옐로우', zh: '黄色' },
  'ORANGE': { ko: '오렌지', zh: '橙色' },
  'BROWN': { ko: '브라운', zh: '棕色' },
  'BEIGE': { ko: '베이지', zh: '米色' },
  'NAVY': { ko: '네이비', zh: '藏青色' }
};

/**
 * 색상 데이터 구조
 */
export interface ProductColor {
  colorCode: string;      // 시스템 생성 코드 (예: "RGLD")
  colorEn: string;        // 영문 색상명 (필수, 예: "Rose Gold")
  colorLocal?: string;    // 현지어 색상명 (선택, 예: "로즈골드")
}

/**
 * 영문 색상명을 코드로 변환
 * 예: "Rose Gold" → "RGLD"
 */
export function generateColorCode(englishName: string): string {
  // 공백과 특수문자 제거
  const cleaned = englishName.toUpperCase().replace(/[^A-Z]/g, '');
  
  if (cleaned.length <= 4) {
    return cleaned.padEnd(4, 'X');
  }
  
  // 단어별 첫 글자 추출
  const words = englishName.toUpperCase().split(/\s+/);
  if (words.length >= 2) {
    // 각 단어의 첫 2글자씩
    return words.map(w => w.substring(0, 2)).join('').substring(0, 4);
  }
  
  // 첫 4글자
  return cleaned.substring(0, 4);
}

/**
 * 색상 표시 (로케일에 따라)
 */
export function getColorDisplay(
  color: ProductColor, 
  locale: 'ko' | 'zh' | 'en' = 'en'
): string {
  // 기본 색상인지 확인
  const basicColor = BASIC_COLORS[color.colorEn.toUpperCase()];
  
  if (basicColor) {
    // 기본 색상은 번역 제공
    switch (locale) {
      case 'ko': return basicColor.ko;
      case 'zh': return basicColor.zh;
      default: return color.colorEn;
    }
  }
  
  // 커스텀 색상
  if (locale === 'en') {
    return color.colorEn;
  }
  
  // 현지어가 있으면 현지어, 없으면 영문
  return color.colorLocal || color.colorEn;
}

/**
 * SKU 생성 시 색상 부분
 */
export function getColorForSKU(color: ProductColor): string {
  return color.colorCode || generateColorCode(color.colorEn);
}

/**
 * 색상 입력 검증
 */
export function validateColorInput(englishName: string): boolean {
  // 영문, 숫자, 공백만 허용
  const pattern = /^[A-Za-z0-9\s-]+$/;
  return pattern.test(englishName) && englishName.trim().length > 0;
}

/**
 * 색상 옵션 목록 (드롭다운용)
 */
export function getBasicColorOptions(locale: 'ko' | 'zh' | 'en' = 'en') {
  const options = [
    { value: '', label: locale === 'ko' ? '직접 입력...' : locale === 'zh' ? '自定义输入...' : 'Custom...' }
  ];
  
  for (const [en, translations] of Object.entries(BASIC_COLORS)) {
    let label = en;
    if (locale === 'ko') {
      label = `${translations.ko} (${en})`;
    } else if (locale === 'zh') {
      label = `${translations.zh} (${en})`;
    }
    
    options.push({
      value: en,
      label: label
    });
  }
  
  return options;
}