'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { Locale, locales, localeNames, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from '@/lib/i18n/config'

interface LanguageSwitcherProps {
  currentLocale: Locale
  onLocaleChange?: (locale: Locale) => void
}

export function LanguageSwitcher({ currentLocale, onLocaleChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>(currentLocale)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setLocale(currentLocale)
  }, [currentLocale])

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === locale) {
      setIsOpen(false)
      return
    }

    // 로컬 스토리지에 저장
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    
    // 쿠키 설정
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}` // 1년
    
    // 사용자 프로필에 저장 (로그인된 경우)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferredLocale: newLocale }),
      })
      
      if (!response.ok) {
        console.warn('Failed to save language preference to profile')
      }
    } catch (error) {
      console.warn('Could not save language preference:', error)
    }

    // 콜백 실행
    if (onLocaleChange) {
      onLocaleChange(newLocale)
    }

    // 상태 업데이트
    setLocale(newLocale)
    setIsOpen(false)

    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('localeChange', {
        detail: { locale: newLocale }
      }))
    }

    // 페이지 새로고침 (Next.js i18n 라우팅)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="언어 선택"
      >
        <Globe className="w-4 h-4" />
        <span>{localeNames[locale]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="py-1">
              {locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLocaleChange(loc)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    locale === loc ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{localeNames[loc]}</span>
                    {locale === loc && (
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}