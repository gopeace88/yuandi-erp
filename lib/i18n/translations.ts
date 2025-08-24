import { Locale } from './config'
import { koMessages } from '@/messages/ko'
import { zhCNMessages } from '@/messages/zh-CN'

export type Messages = typeof koMessages

const messages: Record<Locale, Messages> = {
  'ko': koMessages,
  'zh-CN': zhCNMessages
}

export function getMessages(locale: Locale): Messages {
  return messages[locale] || messages['ko']
}

// 중첩된 키를 지원하는 번역 함수
export function translate(locale: Locale, key: string, params?: Record<string, any>): string {
  const messages = getMessages(locale)

  // 점 표기법으로 중첩된 키 접근 (예: 'common.loading')
  const keys = key.split('.')
  let value: any = messages

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // 키를 찾을 수 없으면 키 자체를 반환
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Translation key not found: ${key} for locale: ${locale}`)
      }
      return key
    }
  }

  // 문자열이 아니면 키를 반환
  if (typeof value !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Translation value is not a string: ${key} for locale: ${locale}`)
      console.warn(`Value type: ${typeof value}, Value:`, value)
      console.trace('Translation call stack')
    }
    return key
  }

  // 파라미터 치환 (예: {min}, {max})
  if (params) {
    Object.entries(params).forEach(([param, val]) => {
      value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val))
    })
  }

  return value
}