'use client'

import { useState, useEffect } from 'react'
import { X, Package, Truck, MapPin, Phone, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  pccc_code: string
  shipping_address: string
  shipping_address_detail?: string
  zip_code: string
  status: string
  total_amount: number
  customer_memo?: string
  internal_memo?: string
  created_at: string
  order_items: any[]
  shipments: any[]
}

interface OrderDetailModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  const [orderDetail, setOrderDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && order.id) {
      fetchOrderDetail()
    }
  }, [isOpen, order.id])

  const fetchOrderDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${order.id}`)
      const data = await response.json()
      setOrderDetail(data)
    } catch (error) {
      console.error('Failed to fetch order detail:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PAID: { label: '결제완료', className: 'bg-blue-100 text-blue-800' },
      SHIPPED: { label: '배송중', className: 'bg-green-100 text-green-800' },
      DONE: { label: '완료', className: 'bg-gray-100 text-gray-800' },
      REFUNDED: { label: '환불', className: 'bg-red-100 text-red-800' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">주문 상세</h2>
            <p className="text-gray-600">{order.order_no}</p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(order.status)}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">상세 정보를 불러오는 중...</p>
          </div>
        ) : orderDetail ? (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 고객 정보 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  고객 정보
                </h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{order.customer_phone}</span>
                  </div>
                  {order.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{order.customer_email}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-gray-500">개인통관고유부호:</span>
                    <span className="ml-2 font-mono">{order.pccc_code}</span>
                  </div>
                </div>
              </div>

              {/* 배송 정보 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  배송 정보
                </h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-500">우편번호:</span>
                    <span className="ml-2">{order.zip_code}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">주소:</span>
                    <div className="mt-1">
                      <div>{order.shipping_address}</div>
                      {order.shipping_address_detail && (
                        <div className="text-gray-600">{order.shipping_address_detail}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 주문 상품 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                주문 상품
              </h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상품명</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">수량</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">단가</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">소계</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orderDetail.order_items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            {item.product_model && (
                              <div className="text-sm text-gray-500">
                                {item.product_brand} {item.product_model} {item.product_color}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {item.sku}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                        총 금액:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg">
                        {formatCurrency(order.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 배송 정보 */}
            {orderDetail.shipments && orderDetail.shipments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  배송 정보
                </h3>
                <div className="space-y-4">
                  {orderDetail.shipments.map((shipment: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">택배사:</span>
                          <div className="font-medium">{shipment.courier}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">송장번호:</span>
                          <div className="font-mono">{shipment.tracking_no}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">발송일:</span>
                          <div>{formatDate(shipment.shipped_at)}</div>
                        </div>
                      </div>
                      {shipment.tracking_url && (
                        <div className="mt-3">
                          <a
                            href={shipment.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            배송 추적하기 →
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 메모 */}
            {(order.customer_memo || order.internal_memo) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {order.customer_memo && (
                  <div>
                    <h4 className="font-semibold mb-2">고객 요청사항</h4>
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                      {order.customer_memo}
                    </div>
                  </div>
                )}
                {order.internal_memo && (
                  <div>
                    <h4 className="font-semibold mb-2">내부 메모</h4>
                    <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                      {order.internal_memo}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 주문 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">주문일시:</span>
                  <span className="ml-2">{formatDate(order.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">주문번호:</span>
                  <span className="ml-2 font-mono">{order.order_no}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

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