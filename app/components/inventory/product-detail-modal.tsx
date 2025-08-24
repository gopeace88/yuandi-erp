'use client'

import { useState, useEffect } from 'react'
import { X, Package, TrendingUp, TrendingDown, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  barcode: string | null
  description: string | null
  notes: string | null
  active: boolean
  created_at: string
}

interface ProductDetailModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [productDetail, setProductDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && product.id) {
      fetchProductDetail()
    }
  }, [isOpen, product.id])

  const fetchProductDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${product.id}`)
      const data = await response.json()
      setProductDetail(data)
    } catch (error) {
      console.error('Failed to fetch product detail:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr))
  }

  const getMovementIcon = (type: string) => {
    const iconMap = {
      inbound: <TrendingUp className="w-4 h-4 text-green-600" />,
      sale: <TrendingDown className="w-4 h-4 text-red-600" />,
      adjustment: <Package className="w-4 h-4 text-blue-600" />,
      disposal: <TrendingDown className="w-4 h-4 text-orange-600" />
    }
    return iconMap[type as keyof typeof iconMap] || <Package className="w-4 h-4" />
  }

  const getMovementTypeLabel = (type: string) => {
    const labelMap = {
      inbound: '입고',
      sale: '판매',
      adjustment: '조정',
      disposal: '폐기'
    }
    return labelMap[type as keyof typeof labelMap] || type
  }

  const inventoryValue = product.cost_cny * product.on_hand

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-gray-600">SKU: {product.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">상세 정보를 불러오는 중...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  상품 정보
                </h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">카테고리</span>
                      <div className="font-medium">{product.category}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">브랜드</span>
                      <div className="font-medium">{product.brand || '-'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">모델</span>
                      <div className="font-medium">{product.model || '-'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">색상</span>
                      <div className="font-medium">{product.color || '-'}</div>
                    </div>
                  </div>
                  {product.barcode && (
                    <div>
                      <span className="text-sm text-gray-500">바코드</span>
                      <div className="font-mono">{product.barcode}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-500">등록일</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(product.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 가격 및 재고 정보 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">가격 및 재고</h3>
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">원가 (CNY)</span>
                      <div className="text-lg font-semibold">{formatCurrency(product.cost_cny, 'CNY')}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">판매가 (KRW)</span>
                      <div className="text-lg font-semibold">
                        {product.sale_price_krw ? formatCurrency(product.sale_price_krw) : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-500">현재 재고</div>
                        <div className="text-2xl font-bold text-blue-600">{product.on_hand}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">재고 기준</div>
                        <div className="text-lg font-semibold">{product.low_stock_threshold}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">재고 가치</div>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(inventoryValue, 'CNY')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 설명 및 메모 */}
            {(product.description || product.notes) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {product.description && (
                  <div>
                    <h4 className="font-semibold mb-2">상품 설명</h4>
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                      {product.description}
                    </div>
                  </div>
                )}
                {product.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">내부 메모</h4>
                    <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                      {product.notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 재고 이동 이력 */}
            {productDetail?.inventory_movements && productDetail.inventory_movements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">최근 재고 이동</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left">일시</th>
                        <th className="px-4 py-3 text-left">유형</th>
                        <th className="px-4 py-3 text-center">수량</th>
                        <th className="px-4 py-3 text-center">변경 전</th>
                        <th className="px-4 py-3 text-center">변경 후</th>
                        <th className="px-4 py-3 text-left">참조</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productDetail.inventory_movements.slice(0, 10).map((movement: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            {formatDate(movement.movement_date)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(movement.movement_type)}
                              {getMovementTypeLabel(movement.movement_type)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">
                            {movement.movement_type === 'sale' || movement.movement_type === 'disposal' ? '-' : '+'}{movement.quantity}
                          </td>
                          <td className="px-4 py-3 text-center">{movement.balance_before}</td>
                          <td className="px-4 py-3 text-center font-semibold">{movement.balance_after}</td>
                          <td className="px-4 py-3">
                            {movement.ref_no && (
                              <div className="text-xs">
                                <div>{movement.ref_no}</div>
                                {movement.note && <div className="text-gray-500">{movement.note}</div>}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 푸터 */}
        <div className="flex justify-end p-6 border-t">
          <Button onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}