'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

export default function OrdersPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          {t('orders.addOrder')}
        </button>
      </div>

      {/* 주문 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              📋
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.total')}</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              ⏳
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.processing')}</p>
              <p className="text-2xl font-bold text-gray-900">23</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.delivered')}</p>
              <p className="text-2xl font-bold text-gray-900">128</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              ↩️
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.refunded')}</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">{t('orders.list.title')}</h2>
            <div className="flex space-x-2">
              <input
                type="search"
                placeholder={t('orders.list.searchPlaceholder')}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('orders.status.all')}</option>
                <option value="PAID">{t('orders.status.paid')}</option>
                <option value="SHIPPED">{t('orders.status.shipped')}</option>
                <option value="DONE">{t('orders.status.done')}</option>
                <option value="REFUNDED">{t('orders.status.refunded')}</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.orderNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.customerName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.productName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.quantity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.totalAmount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.orderDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                  <a href="/dashboard/orders/ORD-240823-001" className="hover:underline">
                    ORD-240823-001
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  홍길동
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  iPhone 15 Pro
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  1
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₩1,250,000
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {t('orders.status.delivered')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  2024-08-23
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">{t('orders.actions.detail')}</button>
                  <button className="text-green-600 hover:text-green-900">{t('orders.actions.ship')}</button>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                  <a href="/dashboard/orders/ORD-240822-015" className="hover:underline">
                    ORD-240822-015
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  김영희
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  스마트워치 Ultra
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  2
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₩800,000
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {t('orders.status.shipping')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  2024-08-22
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">{t('orders.actions.detail')}</button>
                  <button className="text-green-600 hover:text-green-900">{t('orders.actions.track')}</button>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                  <a href="/dashboard/orders/ORD-240821-032" className="hover:underline">
                    ORD-240821-032
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  박민수
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  무선 이어폰
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  3
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₩450,000
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {t('orders.status.paid')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  2024-08-21
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">{t('orders.actions.detail')}</button>
                  <button className="text-orange-600 hover:text-orange-900">{t('orders.actions.process')}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}