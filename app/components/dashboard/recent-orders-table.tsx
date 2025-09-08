'use client'

import { useState } from 'react'
import { ShippingModal } from '@/app/components/shipping/shipping-modal'

interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  total_amount: number
  status: string
  created_at: string
  order_items: Array<{
    id: string
    product_name: string
    quantity: number
    unit_price: number
  }>
}

interface RecentOrdersTableProps {
  orders: Order[]
  onRefresh?: () => void
}

export function RecentOrdersTable({ orders, onRefresh }: RecentOrdersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false)
  
  console.log('RecentOrdersTable rendered with orders:', orders.length)
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: '결제완료', className: 'bg-blue-100 text-blue-800' },
      shipped: { label: '배송중', className: 'bg-green-100 text-green-800' },
      delivered: { label: '완료', className: 'bg-gray-100 text-gray-800' },
      done: { label: '완료', className: 'bg-gray-100 text-gray-800' },
      refunded: { label: '환불', className: 'bg-red-100 text-red-800' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value)
  }
  
  const handleRowClick = (order: Order) => {
    console.log('Order clicked:', order)
    console.log('Order status:', order.status)
    
    // 결제완료 상태일 때만 송장 입력 모달 열기
    if (order.status === 'paid') {
      console.log('Opening shipping modal for order:', order.id)
      setSelectedOrder(order)
      setIsShippingModalOpen(true)
    } else {
      console.log('Order status is not paid, not opening modal')
    }
  }
  
  const handleShippingSuccess = () => {
    setIsShippingModalOpen(false)
    setSelectedOrder(null)
    // 부모 컴포넌트의 refresh 함수 호출
    if (onRefresh) {
      onRefresh()
    }
  }
  
  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">최근 주문</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  className={`
                    transition-colors duration-150 ease-in-out
                    ${order.status === 'paid' 
                      ? 'hover:bg-blue-50 cursor-pointer' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                  onClick={() => {
                    console.log('Row clicked!', order.id, order.status);
                    handleRowClick(order);
                  }}
                  title={order.status === 'paid' ? '클릭하여 송장 입력' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_no}
                    {order.status === 'paid' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Button clicked for order:', order.id);
                          setSelectedOrder(order);
                          setIsShippingModalOpen(true);
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
                      >
                        송장입력
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.customer_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.order_items && order.order_items.length > 0 && (
                      <div>
                        {order.order_items[0].product_name}
                        {order.order_items.length > 1 && (
                          <span className="text-gray-500">
                            {' '}외 {order.order_items.length - 1}건
                          </span>
                        )}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 송장 입력 모달 */}
      {selectedOrder && isShippingModalOpen && (
        <ShippingModal
          order={{
            id: selectedOrder.id,
            order_number: selectedOrder.order_no,
            customer_name: selectedOrder.customer_name,
            status: selectedOrder.status,
            final_amount: selectedOrder.total_amount
          }}
          isOpen={true}
          onClose={() => {
            console.log('Closing shipping modal')
            setIsShippingModalOpen(false)
            setSelectedOrder(null)
          }}
          onSuccess={handleShippingSuccess}
        />
      )}
    </>
  )
}