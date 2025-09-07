'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Package, Truck, CheckCircle, Camera, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Shipment {
  id: string
  order_id: string
  order_no: string
  customer_name: string
  customer_phone: string
  shipping_address: string
  pccc_code: string
  tracking_no?: string
  courier?: string
  shipped_at?: string
  delivered_at?: string
  photo_url?: string
  status: 'PENDING' | 'shipped' | 'delivered'
  created_at: string
  updated_at?: string
}

const courierOptions = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'logen', label: '로젠택배' },
  { value: 'post', label: '우체국택배' },
  { value: 'ems', label: 'EMS' },
  { value: 'sf', label: '순풍택배' },
  { value: 'cainiao', label: 'Cainiao' },
]

const trackingUrls: { [key: string]: string } = {
  cj: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  hanjin: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumber=',
  lotte: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=',
  logen: 'https://www.ilogen.com/web/personal/trace/',
  post: 'https://service.epost.go.kr/trace.RetrieveRealtimeTraceList.postal?ems_gubun=E&POST_CODE=',
  ems: 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.postal?ems_gubun=E&POST_CODE=',
  sf: 'https://www.sf-express.com/kr/ko/dynamic_function/waybill/#search/bill-number/',
  cainiao: 'https://global.cainiao.com/detail.htm?mailNoList=',
}

const statusColors = {
  PENDING: 'bg-gray-100 text-gray-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
}

const statusLabels = {
  PENDING: '대기중',
  shipped: '배송중',
  delivered: '배송완료',
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [trackingNo, setTrackingNo] = useState('')
  const [selectedCourier, setSelectedCourier] = useState('')

  useEffect(() => {
    fetchShipments()
  }, [])

  const fetchShipments = async () => {
    try {
      const response = await fetch('/api/shipments')
      if (!response.ok) throw new Error('Failed to fetch shipments')
      const data = await response.json()
      setShipments(data)
    } catch (error) {
      console.error('Error fetching shipments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterTracking = (shipment: Shipment) => {
    setSelectedShipment(shipment)
    setTrackingNo(shipment.tracking_no || '')
    setSelectedCourier(shipment.courier || '')
    setIsTrackingModalOpen(true)
  }

  const handleSaveTracking = async () => {
    if (!selectedShipment || !trackingNo || !selectedCourier) return

    try {
      const response = await fetch(`/api/shipments/${selectedShipment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_no: trackingNo,
          courier: selectedCourier,
          status: 'shipped',
        }),
      })

      if (!response.ok) throw new Error('Failed to update shipment')

      setIsTrackingModalOpen(false)
      await fetchShipments()
    } catch (error) {
      console.error('Error updating shipment:', error)
      alert('배송 정보 업데이트에 실패했습니다.')
    }
  }

  const handleMarkDelivered = async (shipmentId: string) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error('Failed to mark as delivered')

      await fetchShipments()
    } catch (error) {
      console.error('Error marking as delivered:', error)
      alert('배송완료 처리에 실패했습니다.')
    }
  }

  const getTrackingUrl = (courier: string, trackingNo: string) => {
    const baseUrl = trackingUrls[courier]
    if (!baseUrl) return '#'
    return `${baseUrl}${trackingNo}`
  }

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.customer_phone.includes(searchTerm) ||
      (shipment.tracking_no && shipment.tracking_no.includes(searchTerm))
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">배송 관리</h1>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="주문번호, 고객명, 전화번호, 송장번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="PENDING">대기중</SelectItem>
              <SelectItem value="shipped">배송중</SelectItem>
              <SelectItem value="delivered">배송완료</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="h-4 w-4" />
            <span>총 {filteredShipments.length}건</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShipments.map((shipment) => (
          <Card key={shipment.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">{shipment.order_no}</p>
                <p className="text-xs text-gray-500">
                  PCCC: {shipment.pccc_code}
                </p>
              </div>
              <Badge className={statusColors[shipment.status]}>
                {statusLabels[shipment.status]}
              </Badge>
            </div>

            <div className="space-y-2 mb-3">
              <div>
                <p className="text-sm font-medium">{shipment.customer_name}</p>
                <p className="text-xs text-gray-500">{shipment.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 truncate">
                  {shipment.shipping_address}
                </p>
              </div>
              {shipment.tracking_no && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {courierOptions.find(c => c.value === shipment.courier)?.label}:
                  </span>
                  <span className="text-xs font-medium">{shipment.tracking_no}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {shipment.status === 'PENDING' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRegisterTracking(shipment)}
                  className="flex-1"
                >
                  <Truck className="h-3 w-3 mr-1" />
                  송장등록
                </Button>
              )}
              
              {shipment.status === 'shipped' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getTrackingUrl(shipment.courier!, shipment.tracking_no!), '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    추적
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkDelivered(shipment.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    완료
                  </Button>
                </>
              )}
              
              {shipment.status === 'delivered' && (
                <div className="text-xs text-gray-500 flex-1 text-center">
                  {shipment.delivered_at && 
                    format(new Date(shipment.delivered_at), 'MM/dd HH:mm', { locale: ko })
                  } 완료
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredShipments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}

      {/* Tracking Registration Modal */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">송장번호 등록</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  택배사
                </label>
                <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                  <SelectTrigger>
                    <SelectValue placeholder="택배사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {courierOptions.map((courier) => (
                      <SelectItem key={courier.value} value={courier.value}>
                        {courier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  송장번호
                </label>
                <Input
                  type="text"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  placeholder="송장번호 입력"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsTrackingModalOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSaveTracking}
                disabled={!trackingNo || !selectedCourier}
                className="flex-1"
              >
                저장
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}