'use client'

import { useEffect, useState } from 'react'
import { Locale, defaultLocale, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    // 1. 로컬 스토리지에서 확인
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
    if (storedLocale) {
      setLocale(storedLocale)
      return
    }

    // 2. 쿠키에서 확인
    const cookies = document.cookie.split(';')
    const localeCookie = cookies.find(c => c.trim().startsWith(`${LOCALE_COOKIE_NAME}=`))
    if (localeCookie) {
      const cookieLocale = localeCookie.split('=')[1] as Locale
      setLocale(cookieLocale)
      return
    }

    // 3. 브라우저 언어 확인 (fallback)
    const browserLang = navigator.language || navigator.languages[0]
    if (browserLang.startsWith('zh')) {
      setLocale('zh-CN')
    } else if (browserLang.startsWith('ko')) {
      setLocale('ko')
    }
  }, [])

  const t = (key: string, params?: Record<string, any>) => {
    return translate(locale, key, params)
  }

  return {
    t,
    locale,
    setLocale
  }
}