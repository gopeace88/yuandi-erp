'use client'

import { useState } from 'react'
import { X, CheckCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  order_number: string
  customer_name: string
  pccc?: string
  status: string
  final_amount: number
  tracking_number?: string
  courier?: string
}

interface OrderCompleteModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function OrderCompleteModal({ order, isOpen, onClose, onSuccess }: OrderCompleteModalProps) {
  const [loading, setLoading] = useState(false)
  const [completionNote, setCompletionNote] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${order.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completion_note: completionNote
        })
      })

      if (response.ok) {
        alert('주문이 완료 처리되었습니다')
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '주문 완료 처리 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            주문 완료
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
            {order.pccc && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">PCCC</span>
                <span className="font-medium">{order.pccc}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">주문금액</span>
              <span className="font-medium">
                {new Intl.NumberFormat('ko-KR', {
                  style: 'currency',
                  currency: 'KRW'
                }).format(order.final_amount)}
              </span>
            </div>
            {order.tracking_number && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">운송장번호</span>
                <span className="font-medium">{order.tracking_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="p-6 border-b">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-800">배송 완료 확인</h3>
                <p className="text-sm text-green-600 mt-1">
                  고객이 상품을 정상적으로 받았는지 확인 후 완료 처리해주세요.
                  완료 처리 후에는 상태를 변경할 수 없습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 완료 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                완료 메모
              </label>
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="완료 처리에 대한 메모를 입력하세요 (선택사항)"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? '처리 중...' : '완료 처리'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}