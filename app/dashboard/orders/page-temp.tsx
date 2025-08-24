'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { OrderListTable } from '@/components/orders/order-list-table'
import { OrderFilters } from '@/components/orders/order-filters'
import { Button } from '@/components/ui/button'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchOrders()
  }, [pagination.page, filters])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const response = await fetch(`/api/orders?${params}`)
      const data = await response.json()

      setOrders(data.orders)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const response = await fetch(`/api/export/orders?${params}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
    } catch (error) {
      console.error('Failed to export orders:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
          <p className="text-gray-600">주문을 조회하고 관리합니다</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/orders/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          새 주문 생성
        </Button>
      </div>

      {/* 검색 바 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="주문번호, 고객명, 전화번호로 검색..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          필터
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          엑셀 다운로드
        </Button>
      </div>

      {/* 필터 */}
      {showFilters && (
        <OrderFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      )}

      {/* 주문 목록 */}
      <OrderListTable
        orders={orders}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  )
}