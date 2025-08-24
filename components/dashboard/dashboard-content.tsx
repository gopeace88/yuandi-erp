'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

export function DashboardContent() {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }
  }, [])

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
      window.addEventListener('localeChange' as any, handleLocaleChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localeChange' as any, handleLocaleChange)
      }
    }
  }, [])

  const t = (key: string) => translate(locale, key)

  return (
    <div className="dashboard-container">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('dashboard.title')}</h1>
      
      {/* 통계 카드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat-card bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">{t('dashboard.totalProducts')}</p>
          <p className="text-2xl font-bold">150</p>
        </div>
        <div className="stat-card bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">{t('dashboard.inventoryValue')}</p>
          <p className="text-2xl font-bold">₩5,000,000</p>
        </div>
        <div className="stat-card bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">{t('dashboard.lowStock')}</p>
          <p className="text-2xl font-bold">5</p>
        </div>
        <div className="stat-card bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">{t('dashboard.outOfStock')}</p>
          <p className="text-2xl font-bold">2</p>
        </div>
      </div>
      
      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="chart bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.salesTrend')}</h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <p className="text-gray-500">{t('dashboard.chartArea')}</p>
          </div>
        </div>
        <div className="chart bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.orderStatus')}</h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <p className="text-gray-500">{t('dashboard.chartArea')}</p>
          </div>
        </div>
      </div>
      
      {/* 테이블 영역 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t('dashboard.recentOrders')}</h2>
        <table className="table w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">{t('orders.orderNo')}</th>
              <th className="text-left py-2">{t('orders.customerName')}</th>
              <th className="text-left py-2">{t('orders.totalAmount')}</th>
              <th className="text-left py-2">{t('orders.table.status')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">ORD-240101-001</td>
              <td className="py-2">홍길동</td>
              <td className="py-2">₩100,000</td>
              <td className="py-2">{t('orders.status.paid')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}