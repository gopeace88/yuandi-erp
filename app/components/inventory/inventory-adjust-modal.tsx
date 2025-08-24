'use client'

import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Product {
  id: string
  name: string
  sku: string
  on_hand: number
}

interface InventoryAdjustModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function InventoryAdjustModal({ product, isOpen, onClose, onSuccess }: InventoryAdjustModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase')
  const [quantity, setQuantity] = useState<number>(1)
  const [reason, setReason] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const reasonOptions = {
    increase: [
      '입고',
      '반품 처리',
      '재고 확인 조정',
      '시스템 오류 수정',
      '기타'
    ],
    decrease: [
      '손실',
      '파손',
      '만료',
      '샘플 사용',
      '재고 확인 조정',
      '기타'
    ]
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason) {
      alert('조정 사유를 선택해주세요')
      return
    }

    if (adjustmentType === 'decrease' && quantity > product.on_hand) {
      alert('현재 재고보다 많은 수량을 차감할 수 없습니다')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          adjustment_type: adjustmentType,
          quantity,
          reason,
          note
        })
      })

      if (response.ok) {
        alert('재고가 성공적으로 조정되었습니다')
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '조정 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setAdjustmentType('increase')
    setQuantity(1)
    setReason('')
    setNote('')
  }

  const newStock = adjustmentType === 'increase' 
    ? product.on_hand + quantity 
    : product.on_hand - quantity

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">재고 조정</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 상품 정보 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="text-sm text-gray-600 mb-1">상품명</div>
          <div className="font-semibold">{product.name}</div>
          <div className="text-sm text-gray-500 mt-1">SKU: {product.sku}</div>
          <div className="text-sm font-medium mt-2">
            현재 재고: <span className="text-blue-600">{product.on_hand}개</span>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 조정 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                조정 유형
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="increase"
                    checked={adjustmentType === 'increase'}
                    onChange={(e) => setAdjustmentType(e.target.value as 'increase')}
                    className="mr-2"
                  />
                  <Plus className="w-4 h-4 text-green-600 mr-1" />
                  재고 증가
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="decrease"
                    checked={adjustmentType === 'decrease'}
                    onChange={(e) => setAdjustmentType(e.target.value as 'decrease')}
                    className="mr-2"
                  />
                  <Minus className="w-4 h-4 text-red-600 mr-1" />
                  재고 감소
                </label>
              </div>
            </div>

            {/* 수량 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                조정 수량
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={adjustmentType === 'decrease' ? product.on_hand : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* 조정 후 예상 재고 */}
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="text-sm text-blue-800">
                조정 후 재고: <span className="font-semibold">{newStock}개</span>
                <span className="ml-2 text-blue-600">
                  ({adjustmentType === 'increase' ? '+' : '-'}{quantity}개)
                </span>
              </div>
            </div>

            {/* 조정 사유 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                조정 사유 *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">사유를 선택하세요</option>
                {reasonOptions[adjustmentType].map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* 상세 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상세 메모
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="조정에 대한 추가 설명을 입력하세요"
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
              disabled={loading || !reason}
              className={adjustmentType === 'increase' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading ? '처리 중...' : '조정 처리'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}