'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InventoryFiltersProps {
  filters: {
    category: string
    search: string
    active: string
    lowStock: boolean
  }
  onFilterChange: (filters: any) => void
  locale?: string
  categories?: Array<{
    id: string
    code: string
    name_ko: string
    name_zh: string
  }>
}

export function InventoryFilters({ filters, onFilterChange, locale = 'ko', categories = [] }: InventoryFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  // 번역 텍스트
  const t = {
    ko: {
      detailFilter: '상세 필터',
      reset: '초기화',
      category: '카테고리',
      allCategories: '전체 카테고리',
      productStatus: '상품 상태',
      allProducts: '전체 상품',
      activeProductsOnly: '활성 상품만',
      inactiveProductsOnly: '비활성 상품만',
      stockStatus: '재고 상태',
      showLowStockOnly: '재고 부족만 표시',
      quickFilter: '빠른 필터',
      lowStockProducts: '재고 부족 상품',
      applyFilter: '필터 적용'
    },
    'zh-CN': {
      detailFilter: '详细筛选',
      reset: '重置',
      category: '类别',
      allCategories: '所有类别',
      productStatus: '产品状态',
      allProducts: '所有产品',
      activeProductsOnly: '仅活动产品',
      inactiveProductsOnly: '仅非活动产品',
      stockStatus: '库存状态',
      showLowStockOnly: '仅显示库存不足',
      quickFilter: '快速筛选',
      lowStockProducts: '库存不足产品',
      applyFilter: '应用筛选'
    }
  }

  const texts = t[locale as keyof typeof t] || t.ko

  const statusOptions = [
    { value: '', label: texts.allProducts },
    { value: 'true', label: texts.activeProductsOnly },
    { value: 'false', label: texts.inactiveProductsOnly }
  ]

  const handleApply = () => {
    onFilterChange(localFilters)
  }

  const handleReset = () => {
    const resetFilters = { category: '', search: '', active: 'true', lowStock: false }
    setLocalFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">{texts.detailFilter}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-gray-500"
        >
          <X className="w-4 h-4 mr-1" />
          {texts.reset}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {texts.category}
          </label>
          <select
            value={localFilters.category}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{texts.allCategories}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.code}>
                {locale === 'ko' ? cat.name_ko : cat.name_zh}
              </option>
            ))}
          </select>
        </div>

        {/* 상품 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {texts.productStatus}
          </label>
          <select
            value={localFilters.active}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, active: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 재고 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {texts.stockStatus}
          </label>
          <div className="flex items-center h-10">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.lowStock}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{texts.showLowStockOnly}</span>
            </label>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {texts.quickFilter}
          </label>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocalFilters(prev => ({ 
                ...prev, 
                lowStock: true, 
                active: 'true' 
              }))}
              className="text-xs"
            >
              {texts.lowStockProducts}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <Button variant="outline" onClick={handleReset}>
          {texts.reset}
        </Button>
        <Button onClick={handleApply}>
          {texts.applyFilter}
        </Button>
      </div>
    </div>
  )
}