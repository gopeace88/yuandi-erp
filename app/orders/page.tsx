'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Truck, Eye, FileText, DollarSign } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { OrderModal } from '@/components/orders/order-modal'
import { OrderDetailModal } from '@/components/orders/order-detail-modal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Order {
  id: string
  order_no: string
  order_date: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  shipping_address: string
  zip_code: string
  pccc_code: string
  status: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
  total_amount: number
  currency: string
  customer_memo?: string
  internal_memo?: string
  created_at: string
  updated_at?: string
  order_items?: any[]
  shipments?: any[]
}

const statusColors = {
  PAID: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-yellow-100 text-yellow-800',
  DONE: 'bg-green-100 text-green-800',
  REFUNDED: 'bg-red-100 text-red-800',
}

const statusLabels = {
  PAID: '결제완료',
  SHIPPED: '배송중',
  DONE: '배송완료',
  REFUNDED: '환불',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = () => {
    setSelectedOrder(null)
    setIsModalOpen(true)
  }

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
  }

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) throw new Error('Failed to update order status')
      
      await fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('주문 상태 변경에 실패했습니다.')
    }
  }

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    try {
      const url = selectedOrder 
        ? `/api/orders/${selectedOrder.id}`
        : '/api/orders'
      
      const method = selectedOrder ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })
      
      if (!response.ok) throw new Error('Failed to save order')
      
      setIsModalOpen(false)
      await fetchOrders()
    } catch (error) {
      console.error('Error saving order:', error)
      alert('주문 저장에 실패했습니다.')
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
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
        <h1 className="text-3xl font-bold text-gray-900">주문 관리</h1>
        <Button onClick={handleCreateOrder} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          새 주문 등록
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="주문번호, 고객명, 전화번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="PAID">결제완료</SelectItem>
              <SelectItem value="SHIPPED">배송중</SelectItem>
              <SelectItem value="DONE">배송완료</SelectItem>
              <SelectItem value="REFUNDED">환불</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span>총 {filteredOrders.length}건</span>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                고객정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                배송지
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
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
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{order.order_no}</div>
                  <div className="text-xs text-gray-500">PCCC: {order.pccc_code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(order.order_date), 'yyyy-MM-dd', { locale: ko })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                  <div className="text-xs text-gray-500">{order.customer_phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {order.shipping_address}
                  </div>
                  <div className="text-xs text-gray-500">우편번호: {order.zip_code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    ₩{order.total_amount.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditOrder(order)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {order.status === 'PAID' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                        title="배송 시작"
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === 'SHIPPED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateStatus(order.id, 'DONE')}
                        title="배송 완료"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}

      {/* Order Create/Edit Modal */}
      {isModalOpen && (
        <OrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveOrder}
          order={selectedOrder}
        />
      )}

      {/* Order Detail Modal */}
      {isDetailModalOpen && selectedOrder && (
        <OrderDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          order={selectedOrder}
        />
      )}
    </div>
  )
}