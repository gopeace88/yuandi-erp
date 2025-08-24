'use client'

import { useState } from 'react'
import { Eye, Edit, Trash2, Plus, Minus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InventoryAdjustModal } from './inventory-adjust-modal'
import { ProductDetailModal } from './product-detail-modal'

interface Product {
  id: string
  sku: string
  name: string
  category: string
  model: string | null
  color: string | null
  brand: string | null
  cost_cny: number
  sale_price_krw: number | null
  on_hand: number
  low_stock_threshold: number
  active: boolean
  created_at: string
}

interface ProductListTableProps {
  products: Product[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  onPageChange: (page: number) => void
  onProductUpdate: () => void
}

export function ProductListTable({ 
  products, 
  loading, 
  pagination, 
  onPageChange, 
  onProductUpdate 
}: ProductListTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)

  const formatCurrency = (value: number, currency: 'CNY' | 'KRW' = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(dateStr))
  }

  const getStockStatus = (product: Product) => {
    if (product.on_hand === 0) {
      return { 
        label: '품절', 
        className: 'bg-red-100 text-red-800',
        icon: <AlertTriangle className="w-3 h-3" />
      }
    }
    if (product.on_hand <= product.low_stock_threshold) {
      return { 
        label: '부족', 
        className: 'bg-orange-100 text-orange-800',
        icon: <AlertTriangle className="w-3 h-3" />
      }
    }
    return { 
      label: '정상', 
      className: 'bg-green-100 text-green-800',
      icon: null
    }
  }

  const handleViewDetail = (product: Product) => {
    setSelectedProduct(product)
    setShowDetailModal(true)
  }

  const handleAdjustInventory = (product: Product) => {
    setSelectedProduct(product)
    setShowAdjustModal(true)
  }

  const handleQuickAdjust = async (product: Product, type: 'increase' | 'decrease') => {
    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          adjustment_type: type,
          quantity: 1,
          reason: '빠른 조정',
          note: `${type === 'increase' ? '+1' : '-1'} 빠른 조정`
        })
      })

      if (response.ok) {
        onProductUpdate()
      } else {
        const error = await response.json()
        alert(error.error || '조정 중 오류가 발생했습니다')
      }
    } catch (error) {
      alert('조정 중 오류가 발생했습니다')
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('상품을 비활성화하시겠습니까?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('상품이 비활성화되었습니다')
        onProductUpdate()
      } else {
        const error = await response.json()
        alert(error.error || '삭제 중 오류가 발생했습니다')
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">재고를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  원가/판매가
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  재고 현황
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  빠른 조정
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등록일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const stockStatus = getStockStatus(product)
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.sku}
                          {product.model && ` | ${product.model}`}
                          {product.color && ` | ${product.color}`}
                        </div>
                        {product.brand && (
                          <div className="text-xs text-gray-400">{product.brand}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>원가: {formatCurrency(product.cost_cny, 'CNY')}</div>
                        {product.sale_price_krw && (
                          <div className="text-gray-600">
                            판매: {formatCurrency(product.sale_price_krw)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-semibold">{product.on_hand}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${stockStatus.className}`}>
                          {stockStatus.icon}
                          {stockStatus.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          기준: {product.low_stock_threshold}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAdjust(product, 'decrease')}
                          disabled={product.on_hand <= 0}
                          className="w-8 h-8 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAdjust(product, 'increase')}
                          className="w-8 h-8 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(product.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(product)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAdjustInventory(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => onPageChange(pagination.page - 1)}
                >
                  이전
                </Button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = pagination.page - 2 + i
                  if (pageNum < 1 || pageNum > pagination.totalPages) return null
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => onPageChange(pagination.page + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 재고 조정 모달 */}
      {selectedProduct && (
        <InventoryAdjustModal
          product={selectedProduct}
          isOpen={showAdjustModal}
          onClose={() => {
            setShowAdjustModal(false)
            setSelectedProduct(null)
          }}
          onSuccess={() => {
            onProductUpdate()
            setShowAdjustModal(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedProduct(null)
          }}
        />
      )}
    </>
  )
}