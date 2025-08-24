'use client'

import { useState } from 'react'
import { X, Package, Truck, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  order_number: string
  customer_name: string
  status: string
  final_amount: number
}

interface ShippingModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ShippingModal({ order, isOpen, onClose, onSuccess }: ShippingModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tracking_number: '',
    courier: '',
    shipment_note: '',
    shipment_photo_url: ''
  })

  const courierOptions = [
    { value: 'cj', label: 'CJ대한통운' },
    { value: 'hanjin', label: '한진택배' },
    { value: 'lotte', label: '롯데택배' },
    { value: 'kunyoung', label: '건영택배' },
    { value: 'post', label: '우체국택배' },
    { value: 'ems', label: 'EMS' },
    { value: 'other', label: '기타' }
  ]

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.tracking_number || !formData.courier) {
      alert('운송장 번호와 택배사는 필수입니다')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${order.id}/ship`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        alert('배송 정보가 등록되었습니다')
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '배송 등록 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      tracking_number: '',
      courier: '',
      shipment_note: '',
      shipment_photo_url: ''
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="w-5 h-5" />
            배송 등록
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
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 택배사 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                택배사 *
              </label>
              <select
                value={formData.courier}
                onChange={(e) => setFormData(prev => ({ ...prev, courier: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">택배사를 선택하세요</option>
                {courierOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 운송장 번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                운송장 번호 *
              </label>
              <input
                type="text"
                value={formData.tracking_number}
                onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="운송장 번호를 입력하세요"
                required
              />
            </div>

            {/* 배송 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                배송 메모
              </label>
              <textarea
                value={formData.shipment_note}
                onChange={(e) => setFormData(prev => ({ ...prev, shipment_note: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="배송에 대한 메모를 입력하세요"
              />
            </div>

            {/* 배송 사진 URL (향후 확장) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                배송 사진 URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.shipment_photo_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, shipment_photo_url: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="outline"
                  className="px-3"
                  disabled
                  title="사진 업로드 기능은 향후 추가 예정"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                사진 업로드 기능은 향후 추가 예정입니다
              </p>
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
              disabled={loading || !formData.tracking_number || !formData.courier}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? '등록 중...' : '배송 등록'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}