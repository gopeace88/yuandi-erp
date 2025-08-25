'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { SalesChartWrapper } from '@/app/components/dashboard/sales-chart-wrapper'
import { OrderStatusChartWrapper } from '@/app/components/dashboard/order-status-chart-wrapper'

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
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">{t('dashboard.title')}</h1>
      
      {/* 통계 카드 영역 - 모바일에서 2x2, 태블릿 이상에서 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="stat-card bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{t('dashboard.totalProducts')}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold">150</p>
        </div>
        <div className="stat-card bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{t('dashboard.inventoryValue')}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold">₩5M</p>
        </div>
        <div className="stat-card bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{t('dashboard.lowStock')}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold">5</p>
        </div>
        <div className="stat-card bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{t('dashboard.outOfStock')}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold">2</p>
        </div>
      </div>
      
      {/* 차트 영역 - 모바일에서 세로 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="chart bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('dashboard.salesTrend')}</h2>
          <SalesChartWrapper data={[
            { date: '2024-01-01', amount: 1500000 },
            { date: '2024-01-02', amount: 2300000 },
            { date: '2024-01-03', amount: 1800000 },
            { date: '2024-01-04', amount: 2100000 },
            { date: '2024-01-05', amount: 2800000 },
            { date: '2024-01-06', amount: 2500000 },
            { date: '2024-01-07', amount: 3200000 },
          ]} />
        </div>
        <div className="chart bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('dashboard.orderStatus')}</h2>
          <OrderStatusChartWrapper data={[
            { status: 'PAID', label: t('orders.status.paid'), count: 15 },
            { status: 'SHIPPED', label: t('orders.status.shipped'), count: 8 },
            { status: 'DONE', label: t('orders.status.done'), count: 25 },
            { status: 'REFUNDED', label: t('orders.status.refunded'), count: 2 },
          ]} />
        </div>
      </div>
      
      {/* 테이블 영역 - 모바일 최적화 */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 overflow-x-auto">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('dashboard.recentOrders')}</h2>
        <div className="overflow-x-auto">
        <table className="table w-full min-w-[400px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-xs sm:text-sm">{t('orders.orderNo')}</th>
              <th className="text-left py-2 text-xs sm:text-sm">{t('orders.customerName')}</th>
              <th className="text-left py-2 text-xs sm:text-sm">{t('orders.totalAmount')}</th>
              <th className="text-left py-2 text-xs sm:text-sm">{t('orders.table.status')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 text-xs sm:text-sm">ORD-240101-001</td>
              <td className="py-2 text-xs sm:text-sm">홍길동</td>
              <td className="py-2 text-xs sm:text-sm">₩100,000</td>
              <td className="py-2 text-xs sm:text-sm">{t('orders.status.paid')}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}