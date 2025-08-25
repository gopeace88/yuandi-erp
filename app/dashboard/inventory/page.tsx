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
  
  // 샘플 재고 데이터
  const inventoryData = [
    { id: '1', name: 'iPhone 15 Pro', sku: 'ELEC-IPHONE15-BLU-APPLE-A1B2C', category: 'electronics', stock: 25, safetyStock: 10, status: 'normal' },
    { id: '2', name: '스마트워치 Ultra', sku: 'ELEC-WATCH-BLK-APPLE-B2C3D', category: 'electronics', stock: 3, safetyStock: 5, status: 'low' },
    { id: '3', name: '무선 이어폰 Pro', sku: 'ELEC-AIRPOD-WHT-APPLE-C3D4E', category: 'electronics', stock: 0, safetyStock: 10, status: 'out' },
    { id: '4', name: 'iPad Pro 12.9', sku: 'ELEC-IPAD-SLV-APPLE-D4E5F', category: 'electronics', stock: 8, safetyStock: 5, status: 'normal' },
    { id: '5', name: 'MacBook Air M2', sku: 'ELEC-MAC-GRY-APPLE-E5F6G', category: 'electronics', stock: 2, safetyStock: 3, status: 'low' },
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              📦
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('inventory.stats.totalProducts')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('inventory.stats.totalStock')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStock}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              ⚠️
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('inventory.stats.lowStock')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              ❌
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('inventory.stats.outOfStock')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.outOfStock}</p>
            </div>
          </div>
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
                  {t('products.sku')}
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
                        <div className="h-10 w-10 rounded bg-gray-300 flex items-center justify-center">
                          {item.name.includes('iPhone') ? '📱' :
                           item.name.includes('워치') ? '⌚' :
                           item.name.includes('이어폰') ? '🎧' :
                           item.name.includes('iPad') ? '📱' :
                           item.name.includes('Mac') ? '💻' : '📦'}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.sku}
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