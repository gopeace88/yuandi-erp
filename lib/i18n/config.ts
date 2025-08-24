export type Locale = 'ko' | 'zh-CN'

export const locales: Locale[] = ['ko', 'zh-CN']
export const defaultLocale: Locale = 'ko'

export const localeNames: Record<Locale, string> = {
  'ko': '한국어',
  'zh-CN': '中文'
}

// 브라우저 언어 감지 매핑
export const browserLocaleMapping: Record<string, Locale> = {
  'ko': 'ko',
  'ko-KR': 'ko',
  'zh': 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-Hans': 'zh-CN',
  'zh-Hans-CN': 'zh-CN'
}

// 날짜 포맷 설정
export const dateFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  'ko': {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  },
  'zh-CN': {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  }
}

// 통화 포맷 설정
export const currencyFormats: Record<string, { locale: string; currency: string }> = {
  'KRW': { locale: 'ko-KR', currency: 'KRW' },
  'CNY': { locale: 'zh-CN', currency: 'CNY' }
}

// 쿠키/로컬스토리지 키
export const LOCALE_COOKIE_NAME = 'yuandi-locale'
export const LOCALE_STORAGE_KEY = 'yuandi-preferred-locale'