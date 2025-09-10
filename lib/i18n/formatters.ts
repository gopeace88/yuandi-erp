import { Locale, dateFormats, currencyFormats } from './config'

// 날짜 포맷팅
export function formatDate(date: Date | string, locale: Locale, format?: 'short' | 'long' | 'full'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const options: Intl.DateTimeFormatOptions = { ...dateFormats[locale] }
  
  switch (format) {
    case 'short':
      // 2024-03-15
      return d.toLocaleDateString(locale, options)
    case 'long':
      // 2024년 3월 15일 금요일
      return d.toLocaleDateString(locale, {
        ...options,
        weekday: 'long'
      })
    case 'full':
      // 2024년 3월 15일 금요일 오후 3시 30분
      return d.toLocaleString(locale, {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long'
      })
    default:
      return d.toLocaleDateString(locale, options)
  }
}

// 시간 포맷팅
export function formatTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// 날짜시간 포맷팅
export function formatDateTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return d.toLocaleString(locale, {
    ...dateFormats[locale],
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 상대 시간 포맷팅 (예: 3일 전, 2시간 전)
export function formatRelativeTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  
  if (days > 0) {
    return rtf.format(-days, 'day')
  } else if (hours > 0) {
    return rtf.format(-hours, 'hour')
  } else if (minutes > 0) {
    return rtf.format(-minutes, 'minute')
  } else {
    return rtf.format(-seconds, 'second')
  }
}

// 통화 포맷팅
export function formatCurrency(
  amount: number,
  currency: 'KRW' | 'CNY' = 'KRW',
  locale?: Locale
): string {
  const format = currencyFormats[currency]
  const targetLocale = locale || (format.locale as Locale)
  
  return new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: format.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// 숫자 포맷팅
export function formatNumber(number: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(number)
}

// 백분율 포맷팅
export function formatPercent(value: number, locale: Locale, decimals: number = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

// 전화번호 포맷팅
export function formatPhoneNumber(phone: string, locale: Locale): string {
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '')
  
  if (locale === 'ko') {
    // 한국 전화번호 형식: 010-1234-5678
    if (digits.length === 11 && digits.startsWith('01')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    } else if (digits.length === 10) {
      if (digits.startsWith('02')) {
        // 서울 지역번호
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
      } else {
        // 기타 지역번호
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      }
    }
  } else if (locale === 'zh-CN') {
    // 중국 전화번호 형식: 138 1234 5678
    if (digits.length === 11 && digits.startsWith('1')) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
    }
  }
  
  // 포맷팅할 수 없는 경우 원본 반환
  return phone
}

// 주문번호 포맷팅 (예: 240315-001)
export function formatOrderNumber(orderNo: string, locale: Locale): string {
  // 언어별로 동일한 포맷 사용
  return orderNo
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number, locale: Locale): string {
  const units = locale === 'ko' 
    ? ['바이트', 'KB', 'MB', 'GB', 'TB']
    : ['字节', 'KB', 'MB', 'GB', 'TB']
  
  if (bytes === 0) return `0 ${units[0]}`
  
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}