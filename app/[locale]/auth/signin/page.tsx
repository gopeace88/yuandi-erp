'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { translate } from '@/lib/i18n/translations'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'

export default function SignInPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  // Load current locale from localStorage or detect browser language
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // First check localStorage
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      } else {
        // If no stored preference, detect browser language
        const browserLang = navigator.language.toLowerCase()
        if (browserLang.includes('zh')) {
          setLocale('zh-CN')
          localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN')
        } else {
          setLocale('ko')
          localStorage.setItem(LOCALE_STORAGE_KEY, 'ko')
        }
      }
    }
  }, [])

  // Listen for locale changes
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

  const t = (key: string) => translate(locale, key)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!formData.email || !formData.password) {
        setError(t('auth.emailPasswordRequired'))
        return
      }

      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || t('auth.loginFailed'))
        return
      }

      // Store user data and session
      if (typeof window !== 'undefined') {
        // localStorage에 저장 (클라이언트 컴포넌트 호환성)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('session', JSON.stringify(data.session))
        
        // 서버에서 이미 쿠키를 설정했으므로 클라이언트에서는 확인만 함
        console.log('Login successful, cookies should be set by server')
        console.log('Current cookies:', document.cookie)
      }

      // 대시보드로 리디렉션 (locale 포함)
      router.push(`/${locale}/dashboard`)
      
    } catch (error) {
      console.error('로그인 오류:', error)
      setError(t('auth.loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Language Switcher */}
        <div className="flex justify-end">
          <LanguageSwitcher currentLocale={locale} />
        </div>
        
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Y</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('auth.signInTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.systemDescription')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.emailLabel')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.emailPlaceholder')}
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('auth.passwordLabel')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.passwordPlaceholder')}
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('auth.signingIn')}
                </div>
              ) : (
                t('auth.signInButton')
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              {t('auth.adminCredentials')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('auth.initialSetup')} <a href="/api/auth/setup" className="text-blue-600 hover:underline" target="_blank">{t('auth.clickHere')}</a>{t('auth.setupPrompt')}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}