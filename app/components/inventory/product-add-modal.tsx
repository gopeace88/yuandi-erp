'use client'

import { useState } from 'react'
import { Locale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { ProductImageUpload } from '@/components/products/product-image-upload'

interface ProductAddModalProps {
  locale: Locale
  onClose: () => void
  onSuccess: () => void
}

export function ProductAddModal({ locale, onClose, onSuccess }: ProductAddModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [productImage, setProductImage] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    model: '',
    color: '',
    brand: '',
    costCny: '',
    salePriceKrw: '',
    initialStock: '',
    lowStockThreshold: '5'
  })

  const t = (key: string) => translate(locale, key)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 이미지를 base64로 변환
      let imageUrl = null
      if (productImage) {
        const reader = new FileReader()
        imageUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(productImage)
        })
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: formData.category,
          name: formData.name,
          model: formData.model,
          color: formData.color,
          brand: formData.brand,
          cost_cny: parseFloat(formData.costCny),
          sale_price_krw: parseFloat(formData.salePriceKrw),
          on_hand: parseInt(formData.initialStock),
          low_stock_threshold: parseInt(formData.lowStockThreshold),
          image_url: imageUrl,
          active: true
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create product')
      }

      onSuccess()
    } catch (error) {
      console.error('Error creating product:', error)
      alert(t('products.createError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{t('products.add')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* 상품 이미지 */}
          <div className="mb-6">
            <ProductImageUpload
              onImageUpload={(file) => setProductImage(file)}
              locale={locale}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('products.category')} *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.select')}</option>
                <option value="electronics">{t('products.categories.electronics')}</option>
                <option value="fashion">{t('products.categories.fashion')}</option>
                <option value="home">{t('products.categories.home')}</option>
                <option value="beauty">{t('products.categories.beauty')}</option>
                <option value="sports">{t('products.categories.sports')}</option>
                <option value="food">{t('products.categories.food')}</option>
                <option value="other">{t('products.categories.other')}</option>
              </select>
            </div>

            {/* 상품명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('products.productName')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 모델 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('products.model')}
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 색상 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('products.color')}
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 브랜드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('products.brand')}
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 원가 (CNY) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('products.costCny')} *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.costCny}
                onChange={(e) => setFormData({ ...formData, costCny: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 판매가 (KRW) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('products.salePriceKrw')} *
              </label>
              <input
                type="number"
                required
                step="100"
                value={formData.salePriceKrw}
                onChange={(e) => setFormData({ ...formData, salePriceKrw: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 초기 재고 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('inventory.initialStock')} *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.initialStock}
                onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 안전 재고 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('inventory.safetyStock')}
              </label>
              <input
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
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
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}