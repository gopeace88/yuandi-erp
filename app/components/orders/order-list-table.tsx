'use client'

import { useState } from 'react'
import { Eye, Edit, Trash2, Truck, CheckCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrderDetailModal } from './order-detail-modal'
import { ShippingModal } from '../shipping/shipping-modal'
import { OrderCompleteModal } from '../shipping/order-complete-modal'
import { RefundModal } from '../shipping/refund-modal'

interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  total_amount: number
  final_amount: number
  status: string
  created_at: string
  tracking_number?: string
  courier?: string
  tracking_url?: string
  order_items: any[]
  shipments: any[]
}

interface OrderListTableProps {
  orders: Order[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  onPageChange: (page: number) => void
  onOrderUpdate: () => void
}

export function OrderListTable({ orders, loading, pagination, onPageChange, onOrderUpdate }: OrderListTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PAID: { label: '결제완료', className: 'bg-blue-100 text-blue-800' },
      SHIPPED: { label: '배송중', className: 'bg-green-100 text-green-800' },
      DONE: { label: '완료', className: 'bg-gray-100 text-gray-800' },
      REFUNDED: { label: '환불', className: 'bg-red-100 text-red-800' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
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
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value)
  }

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
  }

  const handleShipping = (order: Order) => {
    setSelectedOrder(order)
    setShowShippingModal(true)
  }

  const handleComplete = (order: Order) => {
    setSelectedOrder(order)
    setShowCompleteModal(true)
  }

  const handleRefund = (order: Order) => {
    setSelectedOrder(order)
    setShowRefundModal(true)
  }

  const closeAllModals = () => {
    setSelectedOrder(null)
    setShowDetailModal(false)
    setShowShippingModal(false)
    setShowCompleteModal(false)
    setShowRefundModal(false)
  }

  const handleModalSuccess = () => {
    closeAllModals()
    onOrderUpdate()
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('주문이 삭제되었습니다')
        window.location.reload()
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
          <p className="mt-2 text-gray-500">주문을 불러오는 중...</p>
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
                  주문번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-gray-500">{order.customer_phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.order_items.length > 0 && (
                      <div>
                        {order.order_items[0].product_name}
                        {order.order_items.length > 1 && (
                          <span className="text-gray-500">
                            {' '}외 {order.order_items.length - 1}건
                          </span>
                        )}
                      </div>
                    )}
                    {order.tracking_number && (
                      <div className="text-xs text-gray-500 mt-1">
                        운송장: {order.tracking_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(order)}
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {order.status === 'PAID' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShipping(order)}
                            className="text-blue-600 hover:text-blue-700"
                            title="배송등록"
                          >
                            <Truck className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefund(order)}
                            className="text-red-600 hover:text-red-700"
                            title="환불처리"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(order.id)}
                            className="text-gray-600 hover:text-gray-700"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {order.status === 'SHIPPED' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleComplete(order)}
                            className="text-green-600 hover:text-green-700"
                            title="완료처리"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefund(order)}
                            className="text-red-600 hover:text-red-700"
                            title="환불처리"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          {order.tracking_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(order.tracking_url, '_blank')}
                              className="text-blue-600 hover:text-blue-700"
                              title="배송조회"
                            >
                              <Truck className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* 모달들 */}
      {selectedOrder && (
        <>
          {/* 주문 상세 모달 */}
          <OrderDetailModal
            order={selectedOrder}
            isOpen={showDetailModal}
            onClose={closeAllModals}
          />

          {/* 배송 등록 모달 */}
          <ShippingModal
            order={selectedOrder}
            isOpen={showShippingModal}
            onClose={closeAllModals}
            onSuccess={handleModalSuccess}
          />

          {/* 주문 완료 모달 */}
          <OrderCompleteModal
            order={selectedOrder}
            isOpen={showCompleteModal}
            onClose={closeAllModals}
            onSuccess={handleModalSuccess}
          />

          {/* 환불 처리 모달 */}
          <RefundModal
            order={selectedOrder}
            isOpen={showRefundModal}
            onClose={closeAllModals}
            onSuccess={handleModalSuccess}
          />
        </>
      )}
    </>
  )
}