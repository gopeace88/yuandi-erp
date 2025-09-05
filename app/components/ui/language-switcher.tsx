'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { type Locale } from '@/lib/i18n/config'

const LANGUAGE_OPTIONS = [
  { code: 'ko' as Locale, name: '한국어', flag: '🇰🇷' },
  { code: 'zh-CN' as Locale, name: '中文(简体)', flag: '🇨🇳' }
] as const

interface LanguageSwitcherProps {
  currentLocale?: Locale
}

export function LanguageSwitcher({ currentLocale = 'ko' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === currentLocale)

  const handleLanguageChange = (newLocale: Locale) => {
    // 현재 경로에서 locale을 변경
    const segments = pathname.split('/')
    segments[1] = newLocale
    const newPath = segments.join('/')
    
    router.push(newPath)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
        aria-label="언어 선택"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">
          {currentLanguage?.flag} {currentLanguage?.name}
        </span>
        <span className="sm:hidden">
          {currentLanguage?.flag}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* 오버레이 */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 언어 메뉴 */}
          <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20">
            <div className="py-1">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors
                    ${currentLocale === language.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{language.flag}</span>
                    <span>{language.name}</span>
                  </div>
                  {currentLocale === language.code && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// 미니 버전 (모바일용)
export function LanguageSwitcherMini({ currentLocale = 'ko' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === currentLocale)

  const handleLanguageChange = (newLocale: Locale) => {
    // 현재 경로에서 locale을 변경
    const segments = pathname.split('/')
    segments[1] = newLocale
    const newPath = segments.join('/')
    
    router.push(newPath)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors"
        aria-label="언어 선택"
        title={currentLanguage?.name}
      >
        {currentLanguage?.flag}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-20">
            <div className="py-1">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50
                    ${currentLocale === language.code ? 'bg-blue-50 text-blue-600' : ''}
                  `}
                >
                  <span>{language.flag}</span>
                  <span className="text-xs">{language.code.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}