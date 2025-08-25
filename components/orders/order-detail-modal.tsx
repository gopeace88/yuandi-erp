'use client'

import { useState, useEffect } from 'react'
import { X, Package, Truck, CheckCircle, AlertCircle, Clock, CreditCard } from 'lucide-react'
import { Locale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

interface OrderDetailModalProps {
  order: any
  locale: Locale
  onClose: () => void
}

export function OrderDetailModal({ order, locale, onClose }: OrderDetailModalProps) {
  const t = (key: string) => translate(locale, key)
  
  // 주문 상태 히스토리 (실제로는 API에서 가져와야 함)
  const statusHistory = [
    {
      status: 'PAID',
      date: order.order_date || order.created_at,
      note: '결제 완료',
      icon: CreditCard,
      color: 'text-blue-600 bg-blue-100'
    },
    ...(order.status === 'SHIPPED' || order.status === 'DONE' ? [{
      status: 'SHIPPED',
      date: order.shipped_at || new Date().toISOString(),
      note: `운송장: ${order.tracking_number || '등록중'}`,
      icon: Truck,
      color: 'text-yellow-600 bg-yellow-100'
    }] : []),
    ...(order.status === 'DONE' ? [{
      status: 'DONE',
      date: order.delivered_at || new Date().toISOString(),
      note: '배송 완료',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100'
    }] : []),
    ...(order.status === 'REFUNDED' ? [{
      status: 'REFUNDED',
      date: order.refunded_at || new Date().toISOString(),
      note: order.refund_reason || '고객 요청',
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100'
    }] : [])
  ]
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }
  
  const getStatusLabel = (status: string) => {
    const statusMap: any = {
      'PAID': t('orders.status.paid'),
      'SHIPPED': t('orders.status.shipped'),
      'DONE': t('orders.status.done'),
      'REFUNDED': t('orders.status.refunded'),
      'CANCELLED': t('orders.status.cancelled')
    }
    return statusMap[status] || status
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('orders.orderDetail')} - {order.order_number}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* 내용 */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6 space-y-6">
            {/* 기본 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {t('orders.basicInfo')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('orders.orderNo')}:</span>
                  <span className="ml-2 font-medium">{order.order_number}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('orders.orderDate')}:</span>
                  <span className="ml-2 font-medium">{formatDate(order.order_date || order.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('orders.totalAmount')}:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {formatAmount(order.total_amount || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">{t('orders.currentStatus')}:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
                    order.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'SHIPPED' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'DONE' ? 'bg-green-100 text-green-800' :
                    order.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 고객 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {t('orders.customerInfo')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('orders.customerName')}:</span>
                  <span className="ml-2 font-medium">{order.customer_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('orders.customerPhone')}:</span>
                  <span className="ml-2 font-medium">{order.customer_phone}</span>
                </div>
                {order.customer_email && (
                  <div className="col-span-2">
                    <span className="text-gray-500">{t('orders.customerEmail')}:</span>
                    <span className="ml-2 font-medium">{order.customer_email}</span>
                  </div>
                )}
                {order.pccc_code && (
                  <div>
                    <span className="text-gray-500">{t('orders.pcccCode')}:</span>
                    <span className="ml-2 font-medium">{order.pccc_code}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-gray-500">{t('orders.shippingAddress')}:</span>
                  <span className="ml-2 font-medium">
                    {order.shipping_address} {order.shipping_address_detail}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 상품 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {t('orders.productInfo')}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{order.product_name || '상품명'}</span>
                    <span className="ml-2 text-gray-500">x {order.quantity || 1}</span>
                  </div>
                  <span className="font-medium">{formatAmount(order.total_amount || 0)}</span>
                </div>
              </div>
            </div>
            
            {/* 상태 변경 히스토리 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {t('orders.statusHistory')}
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-4">
                  {statusHistory.map((history, index) => {
                    const Icon = history.icon
                    return (
                      <div key={index} className="relative flex items-start">
                        <div className={`absolute left-0 p-2 rounded-full ${history.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="ml-12">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {getStatusLabel(history.status)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(history.date)}
                            </span>
                          </div>
                          {history.note && (
                            <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* 배송 정보 (있을 경우) */}
            {order.tracking_number && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {t('orders.shippingInfo')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">{t('orders.courier')}:</span>
                    <span className="ml-2 font-medium">{order.courier || 'CJ대한통운'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('orders.trackingNumber')}:</span>
                    <span className="ml-2 font-medium text-blue-600">{order.tracking_number}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 메모 (있을 경우) */}
            {order.customer_memo && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {t('orders.customerMemo')}
                </h3>
                <p className="text-sm text-gray-600">{order.customer_memo}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}