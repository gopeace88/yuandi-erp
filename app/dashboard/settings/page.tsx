'use client'

import { useState, useEffect } from 'react'
import { translate } from '@/lib/i18n/translations'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'

export default function SettingsPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    systemName: '',
    businessName: '',
    representativeName: '',
    businessNumber: '',
    contactNumber: '',
    email: '',
    lowStockThreshold: 5,
    autoStockAlert: true,
    defaultLanguage: 'ko',
    timezone: 'Asia/Seoul',
    defaultCurrency: 'KRW'
  })
  
  const [categories, setCategories] = useState([
    { id: 'electronics', name: '전자제품', active: true },
    { id: 'fashion', name: '패션', active: true },
    { id: 'home', name: '홈&리빙', active: true },
    { id: 'beauty', name: '뷰티', active: true },
    { id: 'sports', name: '스포츠', active: true },
    { id: 'food', name: '식품', active: true },
    { id: 'other', name: '기타', active: true }
  ])
  const [newCategory, setNewCategory] = useState('')
  
  const t = (key: string, params?: Record<string, any>) => translate(locale, key, params)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }
    
    // 설정 불러오기
    loadSettings()
  }, [])
  
  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        alert(t('settings.saveSuccess'))
      } else {
        alert(t('settings.saveFailed'))
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert(t('settings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }
  
  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      const handleLocaleChange = (e: CustomEvent) => {
        setLocale(e.detail.locale)
      }
      window.addEventListener('localeChange', handleLocaleChange as EventListener)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localeChange', handleLocaleChange as EventListener)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <button 
          onClick={saveSettings}
          disabled={saving || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>

      <div className="space-y-6">
        {/* 카테고리 관리 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">카테고리 관리</h3>
            <p className="mt-1 text-sm text-gray-500">
              상품 카테고리를 관리합니다.
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="새 카테고리 이름"
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                onClick={() => {
                  if (newCategory.trim()) {
                    setCategories([...categories, {
                      id: newCategory.toLowerCase().replace(/\s+/g, '_'),
                      name: newCategory,
                      active: true
                    }])
                    setNewCategory('')
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                추가
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={category.active}
                        onChange={(e) => {
                          setCategories(categories.map(c => 
                            c.id === category.id ? { ...c, active: e.target.checked } : c
                          ))
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">활성</span>
                    </label>
                    {!['electronics', 'fashion', 'home', 'beauty', 'sports', 'food', 'other'].includes(category.id) && (
                      <button
                        onClick={() => {
                          setCategories(categories.filter(c => c.id !== category.id))
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 재고 관리 설정 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('settings.inventoryManagement')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('settings.inventoryManagementDescription')}
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.lowStockThreshold')}</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={(e) => handleInputChange('lowStockThreshold', parseInt(e.target.value))}
                  placeholder="5"
                  className="block w-full pr-12 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-500 sm:text-sm">{t('settings.units.pieces')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <input
                id="auto-stock-alert"
                type="checkbox"
                checked={settings.autoStockAlert}
                onChange={(e) => handleInputChange('autoStockAlert', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-stock-alert" className="ml-2 block text-sm text-gray-900">
                {t('settings.autoStockAlert')}
              </label>
            </div>
          </div>
        </div>
        
        {/* 사업 정보 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('settings.businessInfo')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('settings.businessInfoDescription')}
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.businessName')}</label>
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                placeholder={t('settings.businessNamePlaceholder')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.representativeName')}</label>
              <input
                type="text"
                value={settings.representativeName}
                onChange={(e) => handleInputChange('representativeName', e.target.value)}
                placeholder={t('settings.representativeNamePlaceholder')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.businessNumber')}</label>
              <input
                type="text"
                value={settings.businessNumber}
                onChange={(e) => handleInputChange('businessNumber', e.target.value)}
                placeholder="123-45-67890"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.contactNumber')}</label>
              <input
                type="tel"
                value={settings.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                placeholder="02-1234-5678"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.email')}</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@yuandi.com"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* 일반 설정 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('settings.general')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('settings.generalDescription')}
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.systemName')}</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => handleInputChange('systemName', e.target.value)}
                placeholder="YUANDI Collection Management"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.defaultLanguage')}</label>
              <select
                value={locale}
                onChange={(e) => {
                  const newLocale = e.target.value as Locale
                  setLocale(newLocale)
                  localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
                  window.dispatchEvent(new CustomEvent('localeChange', {
                    detail: { locale: newLocale }
                  }))
                  // 언어 변경 후 페이지 새로고침
                  setTimeout(() => {
                    window.location.reload()
                  }, 100)
                }}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="ko">{t('settings.languages.korean')}</option>
                <option value="zh-CN">{t('settings.languages.chineseSimplified')}</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.timezone')}</label>
              <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('settings.defaultCurrency')}</label>
              <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="KRW">{t('settings.currencies.krw')}</option>
                <option value="CNY">{t('settings.currencies.cny')}</option>
                <option value="USD">{t('settings.currencies.usd')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}