'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { TransactionModal } from '@/app/components/cashbook/transaction-modal'

export default function CashbookPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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
        <h1 className="text-2xl font-bold text-gray-900">{t('cashbook.title')}</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('cashbook.addTransaction')}
        </button>
      </div>

      {/* 잔액 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              💰
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('cashbook.totalBalance')}</p>
              <p className="text-2xl font-bold text-gray-900">₩15,250,000</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              📈
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('cashbook.income')}</p>
              <p className="text-2xl font-bold text-gray-900">₩20,500,000</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              📉
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('cashbook.expense')}</p>
              <p className="text-2xl font-bold text-gray-900">₩5,250,000</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              📊
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('cashbook.monthlyProfit')}</p>
              <p className="text-2xl font-bold text-gray-900">₩2,150,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* 거래 내역 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">{t('cashbook.transactionHistory')}</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('cashbook.transactionDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('cashbook.transactionType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('cashbook.category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('cashbook.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('cashbook.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('cashbook.balance')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  2024-08-23
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {t('cashbook.income')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {t('cashbook.salesCategory')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  iPhone 15 Pro {t('cashbook.salesDescription')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                  +₩1,250,000
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ₩15,250,000
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 거래 추가 모달 */}
      {isAddModalOpen && (
        <TransactionModal
          locale={locale}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false)
            // TODO: 거래 목록 새로고침
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}