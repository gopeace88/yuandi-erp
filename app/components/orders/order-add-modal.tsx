'use client'

import { useState, useEffect } from 'react'
import { Locale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { Search, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  model: string
  color: string
  brand: string
  sku: string
  sale_price_krw: number
  on_hand: number
  image_url?: string
  category: string
}

interface OrderAddModalProps {
  locale: Locale
  onClose: () => void
  onSuccess: () => void
}

export function OrderAddModal({ locale, onClose, onSuccess }: OrderAddModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
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

  // 상품 데이터 불러오기
  useEffect(() => {
    fetchProducts()
  }, [])

  // 상품 검색 필터링
  useEffect(() => {
    if (productSearch.trim() === '') {
      setAvailableProducts(allProducts.filter(p => p.on_hand > 0))
    } else {
      const searchLower = productSearch.toLowerCase()
      setAvailableProducts(
        allProducts.filter(p => 
          p.on_hand > 0 && (
            p.name.toLowerCase().includes(searchLower) ||
            p.model?.toLowerCase().includes(searchLower) ||
            p.brand?.toLowerCase().includes(searchLower) ||
            p.color?.toLowerCase().includes(searchLower)
          )
        )
      )
    }
  }, [productSearch, allProducts])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch('/api/products?active=true&limit=100')
      if (!response.ok) throw new Error('Failed to fetch products')
      
      const data = await response.json()
      setAllProducts(data.products || [])
      setAvailableProducts((data.products || []).filter((p: Product) => p.on_hand > 0))
    } catch (error) {
      console.error('Error fetching products:', error)
      // 샘플 데이터 폴백
      const sampleProducts: Product[] = [
        { 
          id: '1', 
          name: 'iPhone 15 Pro', 
          model: 'iPhone15Pro',
          color: 'Blue',
          brand: 'Apple',
          sku: 'ELEC-IP15-BLU-APPLE-12345', 
          sale_price_krw: 1250000, 
          on_hand: 25,
          category: 'electronics'
        },
        { 
          id: '2', 
          name: '스마트워치 Ultra', 
          model: 'Watch Ultra',
          color: 'Black',
          brand: 'Apple',
          sku: 'ELEC-WATCH-BLK-APPLE-67890', 
          sale_price_krw: 400000, 
          on_hand: 3,
          category: 'electronics'
        },
      ]
      setAllProducts(sampleProducts)
      setAvailableProducts(sampleProducts)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const selectedProduct = allProducts.find(p => p.id === formData.productId)
      if (!selectedProduct) {
        alert('상품을 선택해주세요')
        setIsLoading(false)
        return
      }

      const orderData = {
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail || null,
        pccc_code: formData.pcccCode,
        shipping_address: formData.shippingAddress,
        shipping_address_detail: formData.shippingAddressDetail || null,
        zip_code: formData.zipCode,
        product_id: formData.productId,
        quantity: formData.quantity,
        total_amount: selectedProduct.sale_price_krw * formData.quantity,
        customer_memo: formData.customerMemo || null,
        internal_memo: formData.internalMemo || null,
        status: 'paid'
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        throw new Error('Failed to create order')
      }
      
      onSuccess()
    } catch (error) {
      console.error('Error creating order:', error)
      alert(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const selectedProduct = allProducts.find(p => p.id === formData.productId)
  const totalAmount = selectedProduct ? selectedProduct.sale_price_krw * formData.quantity : 0

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
            
            {/* 상품 검색 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상품 검색
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="상품명, 모델명, 색상, 브랜드로 검색..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품 선택 *
                </label>
                {loadingProducts ? (
                  <div className="w-full px-3 py-8 border border-gray-300 rounded-md text-center text-gray-500">
                    상품 목록을 불러오는 중...
                  </div>
                ) : (
                  <select
                    required
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    size={5}
                  >
                    <option value="">상품을 선택하세요</option>
                    {availableProducts.length === 0 ? (
                      <option disabled>검색 결과가 없습니다</option>
                    ) : (
                      availableProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} | {product.model} | {product.color} | {product.brand} (재고: {product.on_hand}개)
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* 선택된 상품 정보 및 이미지 */}
              {selectedProduct && (
                <div className="col-span-2">
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex gap-4">
                      {/* 상품 이미지 */}
                      <div className="flex-shrink-0">
                        {selectedProduct.image_url ? (
                          <img
                            src={selectedProduct.image_url}
                            alt={selectedProduct.name}
                            className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* 상품 상세 정보 */}
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900">{selectedProduct.name}</h5>
                        <div className="mt-1 text-sm text-gray-600 space-y-1">
                          <div>모델: {selectedProduct.model} | 색상: {selectedProduct.color}</div>
                          <div>브랜드: {selectedProduct.brand}</div>
                          <div>재고: {selectedProduct.on_hand}개</div>
                          <div className="font-medium text-gray-900">
                            단가: ₩{selectedProduct.sale_price_krw.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.table.quantity')} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedProduct?.on_hand || 999}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedProduct}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  총 금액
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md font-bold text-lg text-gray-900">
                  ₩{totalAmount.toLocaleString()}
                </div>
              </div>
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