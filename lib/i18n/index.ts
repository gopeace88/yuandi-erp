/**
 * 다국어 지원 시스템
 * 한국어, 중국어 지원
 */

export type Locale = 'ko' | 'zh-CN';

export const locales: Locale[] = ['ko', 'zh-CN'];

export const defaultLocale: Locale = 'ko';

export const localeNames = {
  ko: '한국어',
  'zh-CN': '中文'
} as const;

export interface LocaleInfo {
  code: Locale;
  name: string;
  flag: string;
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
}

export const localeConfig: Record<Locale, LocaleInfo> = {
  ko: {
    code: 'ko',
    name: '한국어',
    flag: '🇰🇷',
    dateFormat: 'YYYY년 MM월 DD일',
    numberFormat: 'ko-KR',
    currencyFormat: 'KRW'
  },
  'zh-CN': {
    code: 'zh-CN',
    name: '中文',
    flag: '🇨🇳',
    dateFormat: 'YYYY年MM月DD日',
    numberFormat: 'zh-CN',
    currencyFormat: 'CNY'
  }
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocale(): Locale {
  // 서버 사이드에서 쿠키에서 locale 읽기
  const cookieStore = cookies();
  const locale = cookieStore.get('locale')?.value;
  
  if (locale && isValidLocale(locale)) {
    return locale;
  }
  
  return defaultLocale;
}

export function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return defaultLocale;
  }
  
  const browserLang = navigator.language || navigator.languages?.[0];
  
  if (browserLang?.startsWith('zh')) return 'zh-CN';
  if (browserLang?.startsWith('ko')) return 'ko';
  
  return defaultLocale; // Default to Korean
}

export async function getDictionary(locale: Locale) {
  try {
    const dict = await import(`./dictionaries/${locale}.json`);
    return dict.default;
  } catch (error) {
    console.warn(`Failed to load dictionary for locale: ${locale}, falling back to default`);
    const fallbackDict = await import(`./dictionaries/${defaultLocale}.json`);
    return fallbackDict.default;
  }
}

// 날짜 포맷팅
export function formatDate(date: Date, locale: Locale = defaultLocale): string {
  const config = localeConfig[locale];
  return new Intl.DateTimeFormat(config.numberFormat).format(date);
}

// 숫자 포맷팅
export function formatNumber(number: number, locale: Locale = defaultLocale): string {
  const config = localeConfig[locale];
  return new Intl.NumberFormat(config.numberFormat).format(number);
}

// 통화 포맷팅
export function formatCurrency(
  amount: number, 
  currency: string = 'KRW', 
  locale: Locale = defaultLocale
): string {
  const config = localeConfig[locale];
  return new Intl.NumberFormat(config.numberFormat, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// 상대 시간 포맷팅
export function formatRelativeTime(
  date: Date, 
  locale: Locale = defaultLocale
): string {
  const config = localeConfig[locale];
  const rtf = new Intl.RelativeTimeFormat(config.numberFormat, { numeric: 'auto' });
  
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return rtf.format(-days, 'day');
  if (hours > 0) return rtf.format(-hours, 'hour');
  if (minutes > 0) return rtf.format(-minutes, 'minute');
  return rtf.format(-seconds, 'second');
}

// 텍스트 방향 (LTR/RTL)
export function getTextDirection(locale: Locale): 'ltr' | 'rtl' {
  return 'ltr'; // 현재 지원하는 모든 언어가 LTR
}

// Locale 감지 미들웨어용 유틸리티
export function detectLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  
  const languages = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim())
    .map(lang => lang.toLowerCase());
  
  for (const lang of languages) {
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('zh')) return 'zh-CN';
  }
  
  return defaultLocale; // Default to Korean
}

// 메시지 템플릿 처리
export function interpolateMessage(
  template: string, 
  values: Record<string, string | number>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : match;
  });
}

// Pluralization 지원
export function pluralize(
  count: number,
  messages: { zero?: string; one: string; other: string },
  locale: Locale = defaultLocale
): string {
  const config = localeConfig[locale];
  const pr = new Intl.PluralRules(config.numberFormat);
  const rule = pr.select(count);
  
  if (count === 0 && messages.zero) return messages.zero;
  if (rule === 'one') return messages.one;
  return messages.other;
}