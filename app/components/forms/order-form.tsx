'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Product {
  id: string
  sku: string
  name: string
  model: string | null
  color: string | null
  brand: string | null
  sale_price_krw: number | null
  on_hand: number
}

interface OrderFormProps {
  products?: Product[]
}

export function OrderForm({ products = [] }: OrderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    pccc_code: '',
    shipping_address: '',
    shipping_address_detail: '',
    zip_code: '',
    customer_memo: '',
    internal_memo: ''
  })

  // 상품 검색
  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.products || [])
    } catch (error) {
      console.error('Product search error:', error)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchProducts(searchQuery)
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery])

  // 상품 추가
  const addProduct = (product: Product) => {
    const existingItem = selectedItems.find(item => item.product_id === product.id)
    
    if (existingItem) {
      setSelectedItems(items => 
        items.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setSelectedItems(items => [...items, {
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sale_price_krw || 0,
        max_quantity: product.on_hand
      }])
    }
    
    setSearchQuery('')
    setSearchResults([])
  }

  // 상품 제거
  const removeProduct = (productId: string) => {
    setSelectedItems(items => items.filter(item => item.product_id !== productId))
  }

  // 수량 변경
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId)
      return
    }

    setSelectedItems(items =>
      items.map(item => {
        if (item.product_id === productId) {
          const newQuantity = Math.min(quantity, item.max_quantity)
          return { 
            ...item, 
            quantity: newQuantity,
            subtotal: newQuantity * item.unit_price
          }
        }
        return item
      })
    )
  }

  // Daum 우편번호 API
  const openAddressSearch = () => {
    // @ts-ignore
    new window.daum.Postcode({
      oncomplete: function(data: any) {
        setFormData(prev => ({
          ...prev,
          zip_code: data.zonecode,
          shipping_address: data.address
        }))
      }
    }).open()
  }

  // 총 금액 계산
  const totalAmount = selectedItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)

  // 주문 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedItems.length === 0) {
      alert('상품을 선택해주세요')
      return
    }

    if (!formData.customer_name || !formData.customer_phone || !formData.pccc_code || 
        !formData.shipping_address || !formData.zip_code) {
      alert('필수 정보를 모두 입력해주세요')
      return
    }

    try {
      setLoading(true)
      
      const orderData = {
        ...formData,
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price
        }))
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const order = await response.json()
      alert('주문이 성공적으로 생성되었습니다')
      router.push(`/dashboard/orders`)
    } catch (error) {
      console.error('Order submission error:', error)
      alert(error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 고객 정보 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">고객 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">고객명 *</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData(prev => ({...prev, customer_name: e.target.value}))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">전화번호 *</label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData(prev => ({...prev, customer_phone: e.target.value}))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData(prev => ({...prev, customer_email: e.target.value}))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">개인통관고유부호(PCCC) *</label>
            <input
              type="text"
              value={formData.pccc_code}
              onChange={(e) => setFormData(prev => ({...prev, pccc_code: e.target.value}))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="P로 시작하는 13자리"
              required
            />
          </div>
        </div>
      </div>

      {/* 배송 정보 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">배송 정보</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">우편번호 *</label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({...prev, zip_code: e.target.value}))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">주소 *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.shipping_address}
                  onChange={(e) => setFormData(prev => ({...prev, shipping_address: e.target.value}))}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly
                  required
                />
                <Button
                  type="button"
                  onClick={openAddressSearch}
                  className="flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  주소 검색
                </Button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">상세 주소</label>
            <input
              type="text"
              value={formData.shipping_address_detail}
              onChange={(e) => setFormData(prev => ({...prev, shipping_address_detail: e.target.value}))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="동/호수 등 상세 주소"
            />
          </div>
        </div>
      </div>

      {/* 상품 선택 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">상품 선택</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상품명, SKU, 브랜드로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">
                    {product.sku} | 재고: {product.on_hand}개 | 
                    {product.sale_price_krw?.toLocaleString()}원
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 선택된 상품 목록 */}
        {selectedItems.length > 0 && (
          <div className="border rounded-md">
            <div className="bg-gray-50 px-4 py-2 font-medium">선택된 상품</div>
            <div className="divide-y">
              {selectedItems.map(item => (
                <div key={item.product_id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">수량:</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value))}
                        min="1"
                        max={item.max_quantity}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                      <span className="text-sm text-gray-500">/{item.max_quantity}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {(item.quantity * item.unit_price).toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.unit_price.toLocaleString()}원 x {item.quantity}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(item.product_id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 px-4 py-2 flex justify-between font-semibold">
              <span>총 금액:</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
          </div>
        )}
      </div>

      {/* 메모 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">고객 요청사항</label>
          <textarea
            value={formData.customer_memo}
            onChange={(e) => setFormData(prev => ({...prev, customer_memo: e.target.value}))}
            rows={3}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="고객의 요청사항을 입력하세요"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">내부 메모</label>
          <textarea
            value={formData.internal_memo}
            onChange={(e) => setFormData(prev => ({...prev, internal_memo: e.target.value}))}
            rows={3}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="내부용 메모를 입력하세요"
          />
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={loading || selectedItems.length === 0}
        >
          {loading ? '처리 중...' : '주문 생성'}
        </Button>
      </div>

      {/* Daum 우편번호 API 스크립트 */}
      <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" async />
    </form>
  )
}