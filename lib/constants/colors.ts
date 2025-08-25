/**
 * 표준 색상 코드 정의
 * 모든 제품의 색상은 이 표준 코드를 사용
 */

export interface ColorDefinition {
  code: string;
  ko: string;
  zh: string;
  en: string;
}

export const COLOR_CODES: Record<string, ColorDefinition> = {
  'BLK': { code: 'BLK', ko: '블랙', zh: '黑色', en: 'Black' },
  'WHT': { code: 'WHT', ko: '화이트', zh: '白色', en: 'White' },
  'GRY': { code: 'GRY', ko: '그레이', zh: '灰色', en: 'Gray' },
  'SLV': { code: 'SLV', ko: '실버', zh: '银色', en: 'Silver' },
  'GLD': { code: 'GLD', ko: '골드', zh: '金色', en: 'Gold' },
  'BLU': { code: 'BLU', ko: '블루', zh: '蓝色', en: 'Blue' },
  'NBL': { code: 'NBL', ko: '네이비', zh: '藏青色', en: 'Navy Blue' },
  'SKY': { code: 'SKY', ko: '스카이블루', zh: '天蓝色', en: 'Sky Blue' },
  'RED': { code: 'RED', ko: '레드', zh: '红色', en: 'Red' },
  'PNK': { code: 'PNK', ko: '핑크', zh: '粉色', en: 'Pink' },
  'GRN': { code: 'GRN', ko: '그린', zh: '绿色', en: 'Green' },
  'MGR': { code: 'MGR', ko: '민트그린', zh: '薄荷绿', en: 'Mint Green' },
  'PRP': { code: 'PRP', ko: '퍼플', zh: '紫色', en: 'Purple' },
  'VLT': { code: 'VLT', ko: '바이올렛', zh: '紫罗兰', en: 'Violet' },
  'YLW': { code: 'YLW', ko: '옐로우', zh: '黄色', en: 'Yellow' },
  'ORG': { code: 'ORG', ko: '오렌지', zh: '橙色', en: 'Orange' },
  'BRN': { code: 'BRN', ko: '브라운', zh: '棕色', en: 'Brown' },
  'BEG': { code: 'BEG', ko: '베이지', zh: '米色', en: 'Beige' },
  'IVR': { code: 'IVR', ko: '아이보리', zh: '象牙色', en: 'Ivory' },
  'CRM': { code: 'CRM', ko: '크림', zh: '奶油色', en: 'Cream' },
  'WNR': { code: 'WNR', ko: '와인', zh: '酒红色', en: 'Wine Red' },
  'CRL': { code: 'CRL', ko: '코랄', zh: '珊瑚色', en: 'Coral' },
  'TRQ': { code: 'TRQ', ko: '터콰이즈', zh: '绿松石色', en: 'Turquoise' },
  'MUL': { code: 'MUL', ko: '멀티/혼합', zh: '多色/混合', en: 'Multi/Mixed' },
  'OTH': { code: 'OTH', ko: '기타', zh: '其他', en: 'Other' }
};

/**
 * 색상 목록 가져오기 (드롭다운용)
 */
export function getColorOptions(locale: 'ko' | 'zh' | 'en' = 'ko'): Array<{ value: string; label: string }> {
  return Object.entries(COLOR_CODES).map(([code, definition]) => ({
    value: code,
    label: definition[locale] || definition.en
  }));
}

/**
 * 색상 코드로 현지화된 이름 가져오기
 */
export function getColorName(code: string, locale: 'ko' | 'zh' | 'en' = 'ko'): string {
  const color = COLOR_CODES[code];
  if (!color) return code; // 정의되지 않은 코드는 그대로 반환
  return color[locale] || color.en;
}

/**
 * 색상 이름으로 코드 찾기 (어느 언어든 가능)
 */
export function findColorCode(name: string): string | null {
  const normalizedName = name.trim().toLowerCase();
  
  for (const [code, definition] of Object.entries(COLOR_CODES)) {
    if (definition.ko.toLowerCase() === normalizedName ||
        definition.zh.toLowerCase() === normalizedName ||
        definition.en.toLowerCase() === normalizedName) {
      return code;
    }
  }
  
  return null;
}

/**
 * SKU에서 사용할 색상 코드 정규화
 */
export function normalizeColorForSKU(color: string): string {
  // 먼저 표준 코드인지 확인
  if (COLOR_CODES[color]) {
    return color;
  }
  
  // 색상 이름으로 코드 찾기
  const code = findColorCode(color);
  if (code) {
    return code;
  }
  
  // 찾을 수 없으면 OTH (기타) 반환
  return 'OTH';
}