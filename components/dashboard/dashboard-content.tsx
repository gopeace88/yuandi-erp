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
      
      {/* 통계 정보 */}
      <div className="bg-white px-4 py-2 rounded-lg shadow mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-700">
          <span>
            <span className="text-gray-500">{t('dashboard.totalProducts')}:</span>
            <span className="ml-2 font-medium">150개</span>
          </span>
          <span>
            <span className="text-gray-500">{t('dashboard.inventoryValue')}:</span>
            <span className="ml-2 font-medium">₩5M</span>
          </span>
          <span>
            <span className="text-gray-500">{t('dashboard.lowStock')}:</span>
            <span className="ml-2 font-medium text-yellow-600">5개</span>
          </span>
          <span>
            <span className="text-gray-500">{t('dashboard.outOfStock')}:</span>
            <span className="ml-2 font-medium text-red-600">2개</span>
          </span>
        </div>
      </div>
      
      {/* 차트 영역 - 모바일에서 세로 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="chart bg-white rounded-lg shadow p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold mb-2">{t('dashboard.salesTrend')}</h2>
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
        <div className="chart bg-white rounded-lg shadow p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold mb-2">{t('dashboard.orderStatus')}</h2>
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
            {/* 최근 주문 5개 표시 */}
            <tr className="border-b">
              <td className="py-2 text-xs sm:text-sm">ORD-240101-001</td>
              <td className="py-2 text-xs sm:text-sm">홍길동</td>
              <td className="py-2 text-xs sm:text-sm">₩100,000</td>
              <td className="py-2 text-xs sm:text-sm">{t('orders.status.paid')}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 text-xs sm:text-sm">ORD-240101-002</td>
              <td className="py-2 text-xs sm:text-sm">김철수</td>
              <td className="py-2 text-xs sm:text-sm">₩150,000</td>
              <td className="py-2 text-xs sm:text-sm">{t('orders.status.shipped')}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 text-xs sm:text-sm">ORD-240101-003</td>
              <td className="py-2 text-xs sm:text-sm">이영희</td>
              <td className="py-2 text-xs sm:text-sm">₩80,000</td>
              <td className="py-2 text-xs sm:text-sm">{t('orders.status.done')}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 text-xs sm:text-sm">ORD-240101-004</td>
              <td className="py-2 text-xs sm:text-sm">박민수</td>
              <td className="py-2 text-xs sm:text-sm">₩200,000</td>
              <td className="py-2 text-xs sm:text-sm">{t('orders.status.paid')}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 text-xs sm:text-sm">ORD-240101-005</td>
              <td className="py-2 text-xs sm:text-sm">최지연</td>
              <td className="py-2 text-xs sm:text-sm">₩120,000</td>
              <td className="py-2 text-xs sm:text-sm">{t('orders.status.shipped')}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}