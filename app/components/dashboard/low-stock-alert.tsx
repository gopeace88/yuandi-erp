'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Package } from 'lucide-react'

interface LowStockProduct {
  id: string
  name: string
  model: string
  color: string
  category: string
  onHand: number
  lowStockThreshold: number
  lastSoldAt?: string
}

export function LowStockAlert() {
  const [products, setProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLowStockProducts()
  }, [])

  const loadLowStockProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/low-stock')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('재고 부족 알림 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyLevel = (onHand: number, threshold: number) => {
    if (onHand === 0) {
      return {
        level: 'critical',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: '🚨',
        message: '품절'
      }
    }
    if (onHand <= threshold / 2) {
      return {
        level: 'urgent',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: '⚠️',
        message: '긴급'
      }
    }
    return {
      level: 'warning',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      icon: '⏰',
      message: '주의'
    }
  }

  const formatLastSold = (dateStr?: string) => {
    if (!dateStr) return '판매 기록 없음'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
    return `${Math.floor(diffDays / 30)}개월 전`
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-1">
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
              </div>
              <div className="w-12 h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <div className="text-sm">재고 부족 상품이 없습니다</div>
        <div className="text-xs mt-1">모든 상품이 충분한 재고를 보유하고 있습니다</div>
      </div>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <div className="space-y-2 p-4">
        {products.map((product) => {
          const urgency = getUrgencyLevel(product.onHand, product.lowStockThreshold)
          
          return (
            <div 
              key={product.id} 
              className={`p-3 border rounded-lg ${urgency.color}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-lg">{urgency.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {product.name} - {product.model}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {product.category} • {product.color} • {formatLastSold(product.lastSoldAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-bold text-lg">
                    {product.onHand}
                  </div>
                  <div className="text-xs opacity-75">
                    임계값: {product.lowStockThreshold}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-current border-opacity-20">
                <div className="text-xs font-medium">
                  {urgency.message}
                </div>
                <div className="text-xs">
                  {product.onHand === 0 
                    ? '즉시 입고 필요' 
                    : `${Math.max(0, product.lowStockThreshold - product.onHand)}개 부족`
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {products.length > 5 && (
        <div className="px-4 pb-4">
          <div className="text-xs text-center text-gray-500 p-2 bg-gray-50 rounded">
            총 {products.length}개 상품이 재고 부족 상태입니다
          </div>
        </div>
      )}
    </div>
  )
}