'use client'

import { useState, useEffect } from 'react'
import { Locale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

interface OrderAddModalProps {
  locale: Locale
  onClose: () => void
  onSuccess: () => void
}

export function OrderAddModal({ locale, onClose, onSuccess }: OrderAddModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    pcccCode: '',
    shippingAddress: '',
    shippingAddressDetail: '',
    zipCode: '',
    productId: '',
    quantity: 1,
    customerMemo: '',
    internalMemo: ''
  })

  const t = (key: string) => translate(locale, key)

  // 샘플 상품 데이터
  useEffect(() => {
    setAvailableProducts([
      { id: '1', name: 'iPhone 15 Pro', sku: 'ELEC-IP15-BLU-APPLE-12345', price: 1250000, stock: 25 },
      { id: '2', name: '스마트워치 Ultra', sku: 'ELEC-WATCH-BLK-APPLE-67890', price: 400000, stock: 3 },
      { id: '3', name: '무선 이어폰', sku: 'ELEC-AIRPOD-WHT-APPLE-11111', price: 150000, stock: 15 },
      { id: '4', name: 'iPad Pro', sku: 'ELEC-IPAD-SLV-APPLE-22222', price: 1100000, stock: 8 },
      { id: '5', name: 'MacBook Air', sku: 'ELEC-MAC-GRY-APPLE-33333', price: 1600000, stock: 5 },
    ])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Creating order:', formData)
      onSuccess()
    } catch (error) {
      console.error('Error creating order:', error)
      alert(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const selectedProduct = availableProducts.find(p => p.id === formData.productId)
  const totalAmount = selectedProduct ? selectedProduct.price * formData.quantity : 0

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{t('orders.addOrder')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* 고객 정보 */}
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">고객 정보</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.customerName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.customerPhone')} *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="010-1234-5678"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.customerEmail')}
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.pcccCode')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="P123456789012"
                  value={formData.pcccCode}
                  onChange={(e) => setFormData({ ...formData, pcccCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 배송 정보 */}
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">배송 정보</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.shippingAddress')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.shippingAddressDetail')}
                </label>
                <input
                  type="text"
                  value={formData.shippingAddressDetail}
                  onChange={(e) => setFormData({ ...formData, shippingAddressDetail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.zipCode')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="12345"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">상품 정보</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품 선택 *
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">상품을 선택하세요</option>
                  {availableProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (재고: {product.stock}개)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.table.quantity')} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedProduct?.stock || 999}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {selectedProduct && (
                <div className="col-span-2 bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">단가: ₩{selectedProduct.price.toLocaleString()}</span>
                    <span className="text-lg font-bold text-gray-900">
                      총액: ₩{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 메모 */}
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">메모</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.customerMemo')}
                </label>
                <textarea
                  rows={3}
                  value={formData.customerMemo}
                  onChange={(e) => setFormData({ ...formData, customerMemo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.internalMemo')}
                </label>
                <textarea
                  rows={3}
                  value={formData.internalMemo}
                  onChange={(e) => setFormData({ ...formData, internalMemo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
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
              disabled={isLoading || !formData.productId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : t('orders.addOrder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}