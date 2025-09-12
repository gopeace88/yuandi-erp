'use client'

import { useState, useEffect } from 'react'
import { Locale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

interface CashbookType {
  id: number
  code: string
  name_ko: string
  name_zh: string
  type: string
  color?: string
  display_order: number
}

interface TransactionModalProps {
  locale: Locale
  onClose: () => void
  onSuccess: () => void
}

export function TransactionModal({ locale, onClose, onSuccess }: TransactionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cashbookTypes, setCashbookTypes] = useState<CashbookType[]>([])
  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0]
  })

  const t = (key: string) => translate(locale, key)

  // DB에서 cashbook_types 가져오기
  useEffect(() => {
    fetchCashbookTypes()
  }, [])

  const fetchCashbookTypes = async () => {
    try {
      const response = await fetch('/api/cashbook-types')
      const data = await response.json()
      console.log('Fetched cashbook types:', data)
      // API는 배열을 직접 반환함
      if (Array.isArray(data)) {
        setCashbookTypes(data)
        console.log('Set cashbook types:', data)
      }
    } catch (error) {
      console.error('Error fetching cashbook types:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Creating transaction:', formData)
      onSuccess()
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{t('cashbook.addTransaction')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 거래 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashbook.transactionType')} *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="income">{t('cashbook.income')}</option>
                <option value="expense">{t('cashbook.expense')}</option>
              </select>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashbook.category')} *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.selectOption')}</option>
                {(() => {
                  const filteredTypes = cashbookTypes.filter(type => type.type === formData.type)
                  console.log('Current type:', formData.type)
                  console.log('All types:', cashbookTypes)
                  console.log('Filtered types:', filteredTypes)
                  return filteredTypes.map(type => (
                    <option key={type.id} value={type.code}>
                      {locale === 'zh-CN' ? type.name_zh : type.name_ko}
                    </option>
                  ))
                })()}
              </select>
            </div>

            {/* 금액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashbook.amount')} *
              </label>
              <input
                type="number"
                required
                min="0"
                step="1000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashbook.description')} *
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={formData.type === 'income' ? '판매 내역을 입력하세요' : '지출 내역을 입력하세요'}
              />
            </div>

            {/* 거래일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashbook.transactionDate')} *
              </label>
              <input
                type="date"
                required
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.category || !formData.amount}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}