'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, defaultLocale, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from '@/lib/i18n/config'
import { getMessages, Messages } from '@/lib/i18n/translations'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  messages: Messages
  t: (key: string, params?: Record<string, any>) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

interface LocaleProviderProps {
  children: ReactNode
  initialLocale?: Locale
}

export function LocaleProvider({ children, initialLocale = defaultLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<Messages>(getMessages(initialLocale))

  useEffect(() => {
    // 클라이언트 사이드에서 저장된 언어 설정 불러오기
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
    const cookieLocale = getCookieLocale()
    
    const savedLocale = storedLocale || cookieLocale || initialLocale
    
    if (savedLocale !== locale) {
      setLocaleState(savedLocale)
      setMessages(getMessages(savedLocale))
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setMessages(getMessages(newLocale))
    
    // 로컬 스토리지에 저장
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    
    // 쿠키에 저장
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`
  }

  const t = (key: string, params?: Record<string, any>): string => {
    // 점 표기법으로 중첩된 키 접근
    const keys = key.split('.')
    let value: any = messages
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }
    
    if (typeof value !== 'string') {
      return key
    }
    
    // 파라미터 치환
    if (params) {
      Object.entries(params).forEach(([param, val]) => {
        value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val))
      })
    }
    
    return value
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, messages, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

// 쿠키에서 언어 설정 가져오기
function getCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const localeCookie = cookies.find(c => c.trim().startsWith(`${LOCALE_COOKIE_NAME}=`))
  
  if (localeCookie) {
    const locale = localeCookie.split('=')[1] as Locale
    return locale
  }
  
  return null
}