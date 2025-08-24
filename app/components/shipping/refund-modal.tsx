'use client'

import { useState } from 'react'
import { X, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  order_number: string
  customer_name: string
  status: string
  final_amount: number
}

interface RefundModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RefundModal({ order, isOpen, onClose, onSuccess }: RefundModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    refund_reason: '',
    refund_note: '',
    refund_amount: order.final_amount
  })

  const refundReasonOptions = [
    '고객 요청',
    '상품 불량',
    '배송 지연',
    '재고 부족',
    '주문 취소',
    '시스템 오류',
    '기타'
  ]

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.refund_reason) {
      alert('환불 사유를 선택해주세요')
      return
    }

    if (!confirm('환불 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${order.id}/refund`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('환불 처리가 완료되었습니다')
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '환불 처리 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      refund_reason: '',
      refund_note: '',
      refund_amount: order.final_amount
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-red-600" />
            환불 처리
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 주문 정보 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">주문번호</span>
              <span className="font-medium">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">고객명</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">주문금액</span>
              <span className="font-medium">
                {new Intl.NumberFormat('ko-KR', {
                  style: 'currency',
                  currency: 'KRW'
                }).format(order.final_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">현재상태</span>
              <span className="font-medium">{order.status}</span>
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        <div className="p-6 border-b">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">환불 처리 주의사항</h3>
                <p className="text-sm text-red-600 mt-1">
                  환불 처리 후에는 상태를 되돌릴 수 없으며, 재고는 자동으로 복원됩니다.
                  실제 환불 처리는 별도로 진행해야 합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 환불 사유 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                환불 사유 *
              </label>
              <select
                value={formData.refund_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, refund_reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">환불 사유를 선택하세요</option>
                {refundReasonOptions.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {/* 환불 금액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                환불 금액 (원)
              </label>
              <input
                type="number"
                value={formData.refund_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, refund_amount: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max={order.final_amount}
              />
              <p className="text-xs text-gray-500 mt-1">
                기본값은 주문 금액과 동일합니다
              </p>
            </div>

            {/* 환불 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                환불 메모
              </label>
              <textarea
                value={formData.refund_note}
                onChange={(e) => setFormData(prev => ({ ...prev, refund_note: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="환불 처리에 대한 상세 메모를 입력하세요"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              초기화
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.refund_reason}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? '처리 중...' : '환불 처리'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}