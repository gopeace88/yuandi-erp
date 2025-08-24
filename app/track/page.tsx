'use client'

import { useState, useEffect } from 'react'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { translate } from '@/lib/i18n/translations'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'

export default function TrackPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
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
    
    // 간단한 유효성 검증
    if (!name || !phone) {
      return
    }
    
    // 실제로는 API 호출을 하겠지만, 지금은 모의 데이터 사용
    setSearched(true)
    
    // 검색 결과 설정 (테스트용)
    if (name === '홍길동' && phone === '010-1234-5678') {
      setOrders([
        {
          id: '1',
          order_number: 'ORD-240101-001',
          status: 'SHIPPED',
          total_amount: 100000,
          created_at: '2024-01-01T00:00:00Z',
        }
      ])
    } else if (name === '없는사람' && phone === '010-0000-0000') {
      setOrders([])
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher currentLocale={locale} />
      </div>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('track.title')}</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('track.nameLabel')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder={t('track.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              {t('track.phoneLabel')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder={t('track.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('track.searchButton')}
          </button>
        </form>
        
        {searched && (
          <div className="bg-white rounded-lg shadow p-6">
            {orders.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">{t('track.orderHistory')}</h2>
                {orders.map((order) => (
                  <div key={order.id} className="border-b pb-4 mb-4">
                    <p className="font-medium">{t('track.orderNumber')}: {order.order_number}</p>
                    <p>{t('track.status')}: {order.status === 'SHIPPED' ? t('status.SHIPPED') : order.status}</p>
                    <p>{t('track.amount')}: {locale === 'ko' ? '₩' : '¥'}{order.total_amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      {t('track.orderDate')}: {new Date(order.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">{t('track.noOrders')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}