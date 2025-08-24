'use client'

import { useState, useEffect } from 'react'
import { Locale } from '@/lib/i18n/config'

export function useLocale() {
  const [locale, setLocale] = useState<Locale>('ko')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // First check localStorage
      const stored = localStorage.getItem('locale') as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
        // Also set cookie for server-side
        document.cookie = `locale=${stored}; path=/; max-age=${60 * 60 * 24 * 365}`
      } else {
        // Check cookie
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith('locale='))
          ?.split('=')[1] as Locale
        
        if (cookieValue && ['ko', 'zh-CN'].includes(cookieValue)) {
          setLocale(cookieValue)
          localStorage.setItem('locale', cookieValue)
        } else {
          // Detect browser language
          const browserLang = navigator.language.toLowerCase()
          const detectedLocale = browserLang.includes('zh') ? 'zh-CN' : 'ko'
          setLocale(detectedLocale)
          localStorage.setItem('locale', detectedLocale)
          document.cookie = `locale=${detectedLocale}; path=/; max-age=${60 * 60 * 24 * 365}`
        }
      }
    }
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem('locale', newLocale)
    document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('localeChange', { detail: { locale: newLocale } }))
  }

  // Listen for locale changes from other components
  useEffect(() => {
    const handleLocaleChange = (e: CustomEvent) => {
      setLocale(e.detail.locale)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('localeChange' as any, handleLocaleChange)
      return () => {
        window.removeEventListener('localeChange' as any, handleLocaleChange)
      }
    }
  }, [])

  return { locale, changeLocale }
}