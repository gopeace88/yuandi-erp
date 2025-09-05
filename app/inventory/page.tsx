'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Package, ArrowUp, ArrowDown, Edit2, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Product {
  id: string
  sku: string
  name: string
  category: string
  model?: string
  color?: string
  manufacturer: string
  brand: string
  cost_cny: number
  price_krw: number
  on_hand: number
  low_stock_threshold: number
  image_url?: string
  active: boolean
  created_at: string
  updated_at?: string
}

interface InventoryMovement {
  id: string
  product_id: string
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT'
  quantity: number
  reason?: string
  reference_no?: string
  created_by: string
  created_at: string
}

const categoryOptions = [
  { value: 'electronics', label: '전자제품' },
  { value: 'fashion', label: '패션/의류' },
  { value: 'beauty', label: '뷰티/화장품' },
  { value: 'food', label: '식품' },
  { value: 'home', label: '홈/리빙' },
  { value: 'sports', label: '스포츠' },
  { value: 'toys', label: '완구' },
  { value: 'books', label: '도서' },
  { value: 'other', label: '기타' },
]

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [movementQuantity, setMovementQuantity] = useState(0)
  const [movementReason, setMovementReason] = useState('')
  const [referenceNo, setReferenceNo] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Failed to fetch products')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInbound = (product: Product) => {
    setSelectedProduct(product)
    setMovementQuantity(0)
    setReferenceNo('')
    setIsInboundModalOpen(true)
  }

  const handleAdjustment = (product: Product) => {
    setSelectedProduct(product)
    setMovementQuantity(product.on_hand)
    setMovementReason('')
    setIsAdjustModalOpen(true)
  }

  const handleSaveInbound = async () => {
    if (!selectedProduct || movementQuantity <= 0) return

    try {
      const response = await fetch('/api/inventory/inbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: movementQuantity,
          reference_no: referenceNo,
        }),
      })

      if (!response.ok) throw new Error('Failed to register inbound')

      setIsInboundModalOpen(false)
      await fetchProducts()
    } catch (error) {
      console.error('Error registering inbound:', error)
      alert('입고 등록에 실패했습니다.')
    }
  }

  const handleSaveAdjustment = async () => {
    if (!selectedProduct || !movementReason) return

    const adjustmentQty = movementQuantity - selectedProduct.on_hand

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: adjustmentQty,
          reason: movementReason,
        }),
      })

      if (!response.ok) throw new Error('Failed to adjust inventory')

      setIsAdjustModalOpen(false)
      await fetchProducts()
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      alert('재고 조정에 실패했습니다.')
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.on_hand === 0) {
      return { label: '품절', color: 'bg-red-100 text-red-800' }
    } else if (product.on_hand <= product.low_stock_threshold) {
      return { label: '부족', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { label: '정상', color: 'bg-green-100 text-green-800' }
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    
    let matchesStock = true
    if (stockFilter === 'out') {
      matchesStock = product.on_hand === 0
    } else if (stockFilter === 'low') {
      matchesStock = product.on_hand > 0 && product.on_hand <= product.low_stock_threshold
    } else if (stockFilter === 'normal') {
      matchesStock = product.on_hand > product.low_stock_threshold
    }
    
    return matchesSearch && matchesCategory && matchesStock && product.active
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">재고 관리</h1>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          상품 등록
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="SKU, 상품명, 제조사, 브랜드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {categoryOptions.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="재고 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="normal">정상</SelectItem>
              <SelectItem value="low">부족</SelectItem>
              <SelectItem value="out">품절</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="h-4 w-4" />
            <span>총 {filteredProducts.length}개</span>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                원가/판매가
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                재고
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product)
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                        <div className="text-xs text-gray-400">
                          {product.manufacturer} / {product.brand}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {categoryOptions.find(c => c.value === product.category)?.label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">¥{product.cost_cny}</div>
                    <div className="text-xs text-gray-500">₩{product.price_krw.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{product.on_hand}</span>
                      {product.on_hand <= product.low_stock_threshold && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 ml-2" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">임계: {product.low_stock_threshold}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={stockStatus.color}>
                      {stockStatus.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleInbound(product)}
                        title="입고"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAdjustment(product)}
                        title="재고조정"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}

      {/* Inbound Modal */}
      {isInboundModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">입고 등록</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500">현재 재고: {selectedProduct.on_hand}개</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  입고 수량
                </label>
                <Input
                  type="number"
                  value={movementQuantity}
                  onChange={(e) => setMovementQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  참조 번호 (선택)
                </label>
                <Input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="구매 주문번호 등"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsInboundModalOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSaveInbound}
                disabled={movementQuantity <= 0}
                className="flex-1"
              >
                입고 처리
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Adjustment Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">재고 조정</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500">현재 재고: {selectedProduct.on_hand}개</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  조정 후 재고
                </label>
                <Input
                  type="number"
                  value={movementQuantity}
                  onChange={(e) => setMovementQuantity(parseInt(e.target.value) || 0)}
                  min="0"
                />
                {movementQuantity !== selectedProduct.on_hand && (
                  <p className="text-xs mt-1 text-gray-500">
                    변동: {movementQuantity - selectedProduct.on_hand > 0 ? '+' : ''}{movementQuantity - selectedProduct.on_hand}개
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  조정 사유
                </label>
                <Input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="예: 실물 재고 확인, 손실, 파손 등"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsAdjustModalOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSaveAdjustment}
                disabled={!movementReason || movementQuantity === selectedProduct.on_hand}
                className="flex-1"
              >
                조정 처리
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}