'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderFiltersProps {
  filters: {
    status: string
    search: string
    startDate: string
    endDate: string
  }
  onFilterChange: (filters: any) => void
}

export function OrderFilters({ filters, onFilterChange }: OrderFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const statusOptions = [
    { value: '', label: '전체 상태' },
    { value: 'PAID', label: '결제완료' },
    { value: 'SHIPPED', label: '배송중' },
    { value: 'DONE', label: '완료' },
    { value: 'REFUNDED', label: '환불' }
  ]

  const handleApply = () => {
    onFilterChange(localFilters)
  }

  const handleReset = () => {
    const resetFilters = { status: '', search: '', startDate: '', endDate: '' }
    setLocalFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  const getQuickDateRange = (days: number) => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const handleQuickDate = (days: number) => {
    const dateRange = getQuickDateRange(days)
    setLocalFilters(prev => ({ ...prev, ...dateRange }))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">필터</h3>
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
        {/* 주문 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            주문 상태
          </label>
          <select
            value={localFilters.status}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 시작 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            시작 날짜
          </label>
          <input
            type="date"
            value={localFilters.startDate}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 종료 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            종료 날짜
          </label>
          <input
            type="date"
            value={localFilters.endDate}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 빠른 날짜 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            빠른 선택
          </label>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDate(7)}
            >
              7일
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDate(30)}
            >
              30일
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDate(90)}
            >
              90일
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <Button variant="outline" onClick={handleReset}>
          초기화
        </Button>
        <Button onClick={handleApply}>
          적용
        </Button>
      </div>
    </div>
  )
}