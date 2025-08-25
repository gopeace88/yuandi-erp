'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { ProductAddModal } from '@/app/components/inventory/product-add-modal'
import { StockModal } from '@/app/components/inventory/stock-modal'

export default function InventoryPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [stockModal, setStockModal] = useState<{
    isOpen: boolean
    type: 'inbound' | 'adjustment'
    product: any
  }>({ isOpen: false, type: 'inbound', product: null })
  
  // 샘플 재고 데이터 (이미지 추가)
  const inventoryData = [
    { 
      id: '1', 
      name: 'iPhone 15 Pro', 
      model: 'iPhone15Pro', 
      color: 'Blue', 
      manufacturer: 'Apple', 
      category: 'electronics', 
      stock: 25, 
      safetyStock: 10, 
      status: 'normal',
      imageUrl: '/api/placeholder/60/60' // 실제로는 Supabase Storage URL
    },
    { 
      id: '2', 
      name: '스마트워치 Ultra', 
      model: 'WatchUltra', 
      color: 'Black', 
      manufacturer: 'Apple', 
      category: 'electronics', 
      stock: 3, 
      safetyStock: 5, 
      status: 'low',
      imageUrl: '/api/placeholder/60/60'
    },
    { 
      id: '3', 
      name: '무선 이어폰 Pro', 
      model: 'AirPodsPro', 
      color: 'White', 
      manufacturer: 'Apple', 
      category: 'electronics', 
      stock: 0, 
      safetyStock: 10, 
      status: 'out',
      imageUrl: '/api/placeholder/60/60'
    },
    { 
      id: '4', 
      name: 'iPad Pro 12.9', 
      model: 'iPadPro12', 
      color: 'Silver', 
      manufacturer: 'Apple', 
      category: 'electronics', 
      stock: 8, 
      safetyStock: 5, 
      status: 'normal',
      imageUrl: '/api/placeholder/60/60'
    },
    { 
      id: '5', 
      name: 'MacBook Air M2', 
      model: 'MacBookAirM2', 
      color: 'Gray', 
      manufacturer: 'Apple', 
      category: 'electronics', 
      stock: 2, 
      safetyStock: 3, 
      status: 'low',
      imageUrl: '/api/placeholder/60/60'
    },
  ]
  
  // 통계 계산
  const stats = {
    totalProducts: inventoryData.length,
    totalStock: inventoryData.reduce((sum, item) => sum + item.stock, 0),
    lowStock: inventoryData.filter(item => item.status === 'low').length,
    outOfStock: inventoryData.filter(item => item.status === 'out').length
  }

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
        <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('products.add')}
        </button>
      </div>

      {/* 재고 통계 */}
      <div className="bg-white px-4 py-2 rounded-lg shadow">
        <div className="flex items-center gap-6 text-sm text-gray-700">
          <span>
            <span className="text-gray-500">{t('inventory.stats.totalProducts')}:</span>
            <span className="ml-2 font-medium">{stats.totalProducts}개</span>
          </span>
          <span>
            <span className="text-gray-500">{t('inventory.stats.totalStock')}:</span>
            <span className="ml-2 font-medium">{stats.totalStock}개</span>
          </span>
          <span>
            <span className="text-gray-500">{t('inventory.stats.lowStock')}:</span>
            <span className="ml-2 font-medium text-yellow-600">{stats.lowStock}개</span>
          </span>
          <span>
            <span className="text-gray-500">{t('inventory.stats.outOfStock')}:</span>
            <span className="ml-2 font-medium text-red-600">{stats.outOfStock}개</span>
          </span>
        </div>
      </div>

      {/* 재고 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">{t('inventory.currentStock')}</h2>
            <div className="flex space-x-2">
              <input
                type="search"
                placeholder={t('inventory.searchPlaceholder')}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('products.categories.all')}</option>
                <option value="electronics">{t('products.categories.electronics')}</option>
                <option value="fashion">{t('products.categories.fashion')}</option>
                <option value="home">{t('products.categories.home')}</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.productName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.model')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.color')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.manufacturer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('products.category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('inventory.currentStock')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('inventory.safetyStock')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('inventory.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('inventory.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryData.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {item.imageUrl ? (
                          <img 
                            className="h-10 w-10 rounded-lg object-cover" 
                            src={item.imageUrl} 
                            alt={item.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {item.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.color}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.manufacturer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t(`products.categories.${item.category}`)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.safetyStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === 'normal' ? 'bg-green-100 text-green-800' :
                      item.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status === 'normal' ? t('inventory.statusNormal') :
                       item.status === 'low' ? t('inventory.statusLow') :
                       t('inventory.statusOut')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => setStockModal({ isOpen: true, type: 'inbound', product: item })}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      {t('inventory.inbound')}
                    </button>
                    <button 
                      onClick={() => setStockModal({ isOpen: true, type: 'adjustment', product: item })}
                      className="text-orange-600 hover:text-orange-900"
                    >
                      {t('inventory.adjustment')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 상품 추가 모달 */}
      {isAddModalOpen && (
        <ProductAddModal 
          locale={locale}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false)
            // TODO: 목록 새로고침
          }}
        />
      )}
      
      {/* 재고 입고/조정 모달 */}
      {stockModal.isOpen && stockModal.product && (
        <StockModal
          locale={locale}
          type={stockModal.type}
          product={stockModal.product}
          onClose={() => setStockModal({ isOpen: false, type: 'inbound', product: null })}
          onSuccess={(quantity, note) => {
            console.log(`${stockModal.type} - Product: ${stockModal.product.name}, Quantity: ${quantity}, Note: ${note}`)
            setStockModal({ isOpen: false, type: 'inbound', product: null })
            // TODO: 재고 업데이트 및 새로고침
          }}
        />
      )}
    </div>
  )
}