'use client'

import { AlertTriangle } from 'lucide-react'

interface Product {
  id: string
  name: string
  on_hand: number
  low_stock_threshold: number
}

interface LowStockAlertProps {
  products: Product[]
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          재고 현황
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          모든 상품의 재고가 충분합니다.
        </p>
      </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
            재고 부족 경고
          </h3>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {product.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  재고: {product.on_hand}개
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  기준: {product.low_stock_threshold}개
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}