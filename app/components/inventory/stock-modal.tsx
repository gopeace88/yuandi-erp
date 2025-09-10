'use client'

import { useState } from 'react'
import { Locale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

interface StockModalProps {
  locale: Locale
  type: 'inbound' | 'adjustment'
  product: {
    id: string
    name: string
    sku: string
    stock: number
  }
  onClose: () => void
  onSuccess: (quantity: number, note: string) => void
}

export function StockModal({ locale, type, product, onClose, onSuccess }: StockModalProps) {
  const [quantity, setQuantity] = useState(0)
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const t = (key: string) => translate(locale, key)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quantity === 0) return
    
    setIsLoading(true)
    try {
      // 실제 API 호출
      const response = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          type: type,
          quantity: quantity,
          notes: note
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '처리 중 오류가 발생했습니다')
      }

      const result = await response.json()
      console.log('Inventory movement created:', result)
      
      onSuccess(quantity, note)
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const newStock = type === 'inbound' 
    ? product.stock + Math.abs(quantity)
    : product.stock + quantity

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {type === 'inbound' ? t('inventory.inbound') : t('inventory.adjustment')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="text-sm text-gray-600">상품명: {product.name}</div>
            <div className="text-xs text-gray-500">SKU: {product.sku}</div>
            <div className="text-sm text-gray-600 mt-2">현재 재고: {product.stock}개</div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'inbound' ? '입고 수량' : '조정 수량'} *
            </label>
            <input
              type="number"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min={type === 'inbound' ? 1 : -product.stock}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={type === 'inbound' ? '입고할 수량을 입력하세요' : '증감할 수량을 입력하세요 (음수 가능)'}
            />
            {quantity !== 0 && (
              <div className={`mt-2 text-sm ${newStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
                변경 후 재고: {newStock}개
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('inventory.note')}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={type === 'inbound' ? '입고 사유를 입력하세요' : '조정 사유를 입력하세요'}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || quantity === 0 || newStock < 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}