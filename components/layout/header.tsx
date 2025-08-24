'use client'

import { useState, useEffect } from 'react'
import { User } from '@/lib/auth/types'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { translate } from '@/lib/i18n/translations'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  // Load current locale from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }
  }, [])

  // Listen for locale changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      // Also listen to custom events from LanguageSwitcher
      const handleLocaleChange = (e: CustomEvent) => {
        setLocale(e.detail.locale)
      }
      window.addEventListener('localeChange' as any, handleLocaleChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localeChange' as any, handleLocaleChange)
      }
    }
  }, [])

  const t = (key: string) => translate(locale, key)

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Mobile menu button */}
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            aria-expanded="false"
          >
            <span className="sr-only">메뉴 열기</span>
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Page title area */}
          <div className="ml-4 md:ml-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('common.systemTitle')}
            </h1>
          </div>
        </div>

        {/* Right side - Language switcher and user menu */}
        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <LanguageSwitcher currentLocale={locale} />
          
          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              {/* User avatar */}
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              {/* User info */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(`roles.${user.role}`) || user.role}
                </p>
              </div>
              
              {/* Dropdown icon */}
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  프로필 설정
                </a>
                
                <a
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  시스템 설정
                </a>
                
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <form action="/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      로그아웃
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}