'use client'

import { useState } from 'react'
import { X, Truck, Package, AlertCircle } from 'lucide-react'
import { Locale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'

interface OrderEditModalProps {
  order: any
  locale: Locale
  onClose: () => void
  onSuccess: () => void
}

export function OrderEditModal({ order, locale, onClose, onSuccess }: OrderEditModalProps) {
  const t = (key: string) => translate(locale, key)
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [courier, setCourier] = useState('CJ대한통운')
  const [refundReason, setRefundReason] = useState('')
  
  // 현재 상태에 따라 가능한 액션 결정
  const getAvailableActions = () => {
    switch (order.status) {
      case 'PAID':
        return [
          { value: 'ship', label: t('orders.actions.registerShipping'), icon: Truck },
          { value: 'cancel', label: t('orders.actions.cancelOrder'), icon: AlertCircle }
        ]
      case 'SHIPPED':
        return [
          { value: 'complete', label: t('orders.actions.markComplete'), icon: Package }
        ]
      case 'DONE':
        return [
          { value: 'refund', label: t('orders.actions.processRefund'), icon: AlertCircle }
        ]
      default:
        return []
    }
  }
  
  const availableActions = getAvailableActions()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!action) return
    
    setIsLoading(true)
    
    try {
      let endpoint = ''
      let body: any = {}
      
      switch (action) {
        case 'ship':
          if (!trackingNumber) {
            alert(t('orders.errors.trackingRequired'))
            setIsLoading(false)
            return
          }
          endpoint = `/api/orders/${order.id}/ship`
          body = { tracking_number: trackingNumber, courier }
          break
          
        case 'cancel':
          if (!confirm(t('orders.confirm.cancel'))) {
            setIsLoading(false)
            return
          }
          endpoint = `/api/orders/${order.id}/cancel`
          break
          
        case 'complete':
          endpoint = `/api/orders/${order.id}/complete`
          break
          
        case 'refund':
          if (!refundReason) {
            alert(t('orders.errors.refundReasonRequired'))
            setIsLoading(false)
            return
          }
          if (!confirm(t('orders.confirm.refund'))) {
            setIsLoading(false)
            return
          }
          endpoint = `/api/orders/${order.id}/refund`
          body = { reason: refundReason }
          break
      }
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update order')
      }
      
      alert(t('orders.updateSuccess'))
      onSuccess()
    } catch (error) {
      console.error('Error updating order:', error)
      alert(t('orders.updateError'))
    } finally {
      setIsLoading(false)
    }
  }
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }
  
  const getStatusLabel = (status: string) => {
    return t(`orders.status.${status.toLowerCase()}`)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('orders.editOrder')} - {order.order_number}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* 내용 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 현재 주문 정보 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">{t('orders.customerName')}:</span>
                <span className="ml-2 font-medium">{order.customer_name}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('orders.totalAmount')}:</span>
                <span className="ml-2 font-medium">{formatAmount(order.total_amount || 0)}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('orders.currentStatus')}:</span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
                  order.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'SHIPPED' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'DONE' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{t('orders.orderDate')}:</span>
                <span className="ml-2 font-medium">
                  {new Date(order.order_date || order.created_at).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
          </div>
          
          {/* 액션 선택 */}
          {availableActions.length > 0 ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('orders.selectAction')}
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {availableActions.map((act) => {
                    const Icon = act.icon
                    return (
                      <option key={act.value} value={act.value}>
                        {act.label}
                      </option>
                    )
                  })}
                </select>
              </div>
              
              {/* 송장 등록 필드 */}
              {action === 'ship' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('orders.courier')}
                    </label>
                    <select
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CJ대한통운">CJ대한통운</option>
                      <option value="한진택배">한진택배</option>
                      <option value="롯데택배">롯데택배</option>
                      <option value="우체국택배">우체국택배</option>
                      <option value="로젠택배">로젠택배</option>
                      <option value="쿠팡">쿠팡</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('orders.trackingNumber')} *
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="운송장 번호를 입력하세요"
                      required={action === 'ship'}
                    />
                  </div>
                </>
              )}
              
              {/* 환불 사유 필드 */}
              {action === 'refund' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('orders.refundReason')} *
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="환불 사유를 입력하세요"
                    required={action === 'refund'}
                  />
                </div>
              )}
              
              {/* 경고 메시지 */}
              {action === 'cancel' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {t('orders.warnings.cancelOrder')}
                  </p>
                </div>
              )}
              
              {action === 'refund' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {t('orders.warnings.refundOrder')}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              {t('orders.noActionsAvailable')}
            </div>
          )}
          
          {/* 버튼 */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            {availableActions.length > 0 && (
              <button
                type="submit"
                disabled={isLoading || !action}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('common.processing') : t('common.save')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}