'use client'

import { useState } from 'react'
import { X, Truck, Package, AlertCircle, Upload, Image } from 'lucide-react'
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
  const [courierCode, setCourierCode] = useState('') // 택배사 코드
  const [trackingBarcode, setTrackingBarcode] = useState('') // 바코드 번호
  const [trackingNumberCn, setTrackingNumberCn] = useState('')
  const [courierCn, setCourierCn] = useState('')
  const [shippingFee, setShippingFee] = useState('') // 배송비
  const [actualWeight, setActualWeight] = useState('') // 실제 무게
  const [volumeWeight, setVolumeWeight] = useState('') // 부피 무게
  const [refundReason, setRefundReason] = useState('')
  const [shipmentPhoto, setShipmentPhoto] = useState<File | null>(null)
  const [shipmentPhotoPreview, setShipmentPhotoPreview] = useState<string | null>(null)
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null)
  const [receiptPhotoPreview, setReceiptPhotoPreview] = useState<string | null>(null)
  
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
          // 한국 또는 중국 택배사 중 하나는 필수
          if (!trackingNumber && !trackingNumberCn) {
            alert(t('orders.errors.trackingRequired'))
            setIsLoading(false)
            return
          }
          endpoint = `/api/orders/${order.id}/ship`
          body = { 
            tracking_number: trackingNumber || null,
            courier: courier || null,
            courier_code: courierCode || null,
            tracking_barcode: trackingBarcode || null,
            tracking_number_cn: trackingNumberCn || null,
            courier_cn: courierCn || null,
            shipping_fee: shippingFee ? parseFloat(shippingFee) : null,
            actual_weight: actualWeight ? parseFloat(actualWeight) : null,
            volume_weight: volumeWeight ? parseFloat(volumeWeight) : null,
            shipment_photo_url: shipmentPhotoPreview || null,
            receipt_photo_url: receiptPhotoPreview || null
          }
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
  
  const handlePhotoUpload = (file: File) => {
    setShipmentPhoto(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setShipmentPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
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
                  {/* 한국 택배사 */}
                  <div className="mb-4 p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">한국 택배사 정보</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          택배사
                        </label>
                        <select
                          value={courier}
                          onChange={(e) => setCourier(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">선택하세요</option>
                          <option value="CJ대한통운">CJ대한통운</option>
                          <option value="한진택배">한진택배</option>
                          <option value="롯데택배">롯데택배</option>
                          <option value="우체국택배">우체국택배</option>
                          <option value="로젠택배">로젠택배</option>
                          <option value="쿠팡">쿠팡</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          운송장 번호
                        </label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="운송장 번호 입력"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          바코드 번호
                        </label>
                        <input
                          type="text"
                          value={trackingBarcode}
                          onChange={(e) => setTrackingBarcode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="바코드 번호 입력 (선택)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          택배사 코드
                        </label>
                        <input
                          type="text"
                          value={courierCode}
                          onChange={(e) => setCourierCode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="택배사 코드 (선택)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 중국 택배사 */}
                  <div className="mb-4 p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">중국 택배사 정보 (선택)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          택배사
                        </label>
                        <select
                          value={courierCn}
                          onChange={(e) => setCourierCn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">선택하세요</option>
                          <option value="순펑">순펑 (SF Express)</option>
                          <option value="운달">운달 (YTO)</option>
                          <option value="중통">중통 (ZTO)</option>
                          <option value="신통">신통 (STO)</option>
                          <option value="경동">경동 (JD)</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          운송장 번호
                        </label>
                        <input
                          type="text"
                          value={trackingNumberCn}
                          onChange={(e) => setTrackingNumberCn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="운송장 번호 입력"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 배송 상세 정보 */}
                  <div className="mb-4 p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">배송 상세 정보 (선택)</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          배송비 (원)
                        </label>
                        <input
                          type="number"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="배송비"
                          step="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          실제 무게 (kg)
                        </label>
                        <input
                          type="number"
                          value={actualWeight}
                          onChange={(e) => setActualWeight(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="실제 무게"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          부피 무게 (kg)
                        </label>
                        <input
                          type="number"
                          value={volumeWeight}
                          onChange={(e) => setVolumeWeight(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="부피 무게"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 송장 사진 업로드 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      송장 사진 (선택)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {shipmentPhotoPreview ? (
                        <div className="relative">
                          <img 
                            src={shipmentPhotoPreview} 
                            alt="송장 사진" 
                            className="w-full max-h-48 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShipmentPhoto(null)
                              setShipmentPhotoPreview(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setShipmentPhoto(file)
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setShipmentPhotoPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">클릭하여 송장 사진을 업로드하세요</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 영수증 사진 업로드 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      영수증 사진 (선택)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {receiptPhotoPreview ? (
                        <div className="relative">
                          <img 
                            src={receiptPhotoPreview} 
                            alt="영수증 사진" 
                            className="w-full max-h-48 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptPhoto(null)
                              setReceiptPhotoPreview(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setReceiptPhoto(file)
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setReceiptPhotoPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                          <Image className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">클릭하여 영수증 사진을 업로드하세요</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 경고 메시지 */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ※ 한국 또는 중국 택배사 정보 중 최소 하나는 입력해주세요.
                    </p>
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