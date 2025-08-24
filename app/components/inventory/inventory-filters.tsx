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
}

export function InventoryFilters({ filters, onFilterChange }: InventoryFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const categoryOptions = [
    { value: '', label: '전체 카테고리' },
    { value: 'ELECTRONICS', label: '전자제품' },
    { value: 'FASHION', label: '패션' },
    { value: 'COSMETICS', label: '화장품' },
    { value: 'SUPPLEMENTS', label: '건강보조식품' },
    { value: 'TOYS', label: '완구' },
    { value: 'BOOKS', label: '도서' },
    { value: 'SPORTS', label: '스포츠' },
    { value: 'HOME', label: '생활용품' },
    { value: 'FOOD', label: '식품' },
    { value: 'OTHER', label: '기타' }
  ]

  const statusOptions = [
    { value: '', label: '전체 상품' },
    { value: 'true', label: '활성 상품만' },
    { value: 'false', label: '비활성 상품만' }
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
        <h3 className="font-semibold text-gray-900">상세 필터</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-gray-500"
        >
          <X className="w-4 h-4 mr-1" />
          초기화
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카테고리
          </label>
          <select
            value={localFilters.category}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 상품 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상품 상태
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
            재고 상태
          </label>
          <div className="flex items-center h-10">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.lowStock}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">재고 부족만 표시</span>
            </label>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            빠른 필터
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
              재고 부족 상품
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <Button variant="outline" onClick={handleReset}>
          초기화
        </Button>
        <Button onClick={handleApply}>
          필터 적용
        </Button>
      </div>
    </div>
  )
}