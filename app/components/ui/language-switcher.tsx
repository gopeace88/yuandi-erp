'use client'

import { useState } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/context'
import { i18nConfig, type Locale } from '@/lib/i18n/config'

const LANGUAGE_OPTIONS = [
  { code: 'ko', name: '\m´', flag: '<ð<÷' },
  { code: 'zh-CN', name: '-‡(€S)', flag: '<è<ó' },
  { code: 'en', name: 'English', flag: '<ú<ø' }
] as const

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === locale)

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
        aria-label="¸´  Ý"
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
          {/* 0½ t­ À */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Ümä´ Tt */}
          <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20">
            <div className="py-1">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code as Locale)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors
                    ${locale === language.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{language.flag}</span>
                    <span>{language.name}</span>
                  </div>
                  {locale === language.code && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            {/* l„  */}
            <div className="border-t">
              <div className="px-3 py-2 text-xs text-gray-500">
                {t('nav.settings')} " {t('common.language')}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// è\ „ (DtXÌ)
export function LanguageSwitcherMini() {
  const { locale, setLocale } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === locale)

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors"
        aria-label="¸´  Ý"
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
                  onClick={() => handleLanguageChange(language.code as Locale)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50
                    ${locale === language.code ? 'bg-blue-50 text-blue-600' : ''}
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