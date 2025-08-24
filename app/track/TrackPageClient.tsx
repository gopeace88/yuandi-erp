'use client'

import { useState, useEffect } from 'react'
import { Search, Package, Truck, CheckCircle, AlertCircle, ExternalLink, Clock, RefreshCw } from 'lucide-react'
import { Locale, browserLocaleMapping, defaultLocale, LOCALE_STORAGE_KEY } from '@/lib/i18n/config'
import { useLocale } from '@/contexts/LocaleContext'
import { formatDate, formatCurrency, formatPhoneNumber, formatRelativeTime } from '@/lib/i18n/formatters'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

interface Order {
  id: string
  order_no: string
  status: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
  customer_name: string
  customer_phone: string
  customer_email?: string
  shipping_address: string
  zip_code: string
  total_amount: number
  created_at: string
  order_items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }>
  shipments?: Array<{
    courier: string
    tracking_no: string
    tracking_url?: string
    shipped_at?: string
    delivered_at?: string
  }>
}

// 택배사별 추적 URL 생성
function generateTrackingUrl(courier: string, trackingNo: string): string {
  const courierUrls: Record<string, string> = {
    'CJ대한통운': `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${trackingNo}`,
    '한진택배': `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${trackingNo}`,
    '롯데택배': `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${trackingNo}`,
    '우체국택배': `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}`,
    '로젠택배': `https://www.ilogen.com/web/personal/trace/${trackingNo}`,
    'CU편의점택배': `https://www.cupost.co.kr/postbox/delivery/localResult.cupost?invoice_no=${trackingNo}`,
    'GS편의점택배': `https://www.gspostbox.com/parcel-tracking?parcelCode=${trackingNo}`,
    'EMS': `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}`,
    'DHL': `https://www.dhl.com/kr-ko/home/tracking.html?tracking-id=${trackingNo}`,
    'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNo}`,
    'UPS': `https://www.ups.com/track?loc=ko_KR&tracknum=${trackingNo}`,
  }
  
  return courierUrls[courier] || `https://search.naver.com/search.naver?query=${encodeURIComponent(courier + ' ' + trackingNo)}`
}

// 상태별 색상 및 배경색
function getStatusStyle(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'SHIPPED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'DONE':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REFUNDED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export default function TrackPageClient() {
  const { locale, setLocale, t } = useLocale()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  // 브라우저 언어 자동 감지
  useEffect(() => {
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (!storedLocale) {
      detectBrowserLanguage()
    }
  }, [])

  const detectBrowserLanguage = () => {
    if (typeof window === 'undefined') return

    const browserLang = navigator.language || navigator.languages?.[0] || ''
    let detectedLocale: Locale = defaultLocale
    
    for (const [browserCode, mappedLocale] of Object.entries(browserLocaleMapping)) {
      if (browserLang.toLowerCase().startsWith(browserCode.toLowerCase())) {
        detectedLocale = mappedLocale
        break
      }
    }
    
    if (detectedLocale !== locale) {
      setLocale(detectedLocale)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim() || !phone.trim()) {
      setError(t('validation.required'))
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const response = await fetch(`/api/track?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.message || t('common.error'))
        setOrders([])
      } else {
        setOrders(data.orders || [])
        if (data.orders?.length === 0) {
          setError(t('track.noOrders'))
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      setError(t('common.error'))
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Clock className="w-5 h-5" />
      case 'SHIPPED':
        return <Truck className="w-5 h-5" />
      case 'DONE':
        return <CheckCircle className="w-5 h-5" />
      case 'REFUNDED':
        return <RefreshCw className="w-5 h-5" />
      default:
        return <Package className="w-5 h-5" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return t('orders.statusPaid')
      case 'SHIPPED':
        return t('orders.statusShipped')
      case 'DONE':
        return t('orders.statusDone')
      case 'REFUNDED':
        return t('orders.statusRefunded')
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('track.title')}</h1>
            </div>
            <LanguageSwitcher currentLocale={locale} onLocaleChange={setLocale} />
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 폼 */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              {t('track.searchTitle')}
            </h2>
            <p className="text-gray-600">{t('track.searchDescription')}</p>
          </div>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.customerName')} *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('track.inputName')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.customerPhone')} *
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('track.inputPhone')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  maxLength={11}
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              {loading ? t('common.loading') : t('track.searchButton')}
            </button>
          </form>
        </div>

        {/* 검색 결과 */}
        {searched && !loading && orders.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('track.recentOrders')} ({orders.length})
            </h3>
            
            <div className="space-y-4">
              {orders.map((order, index) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* 주문 헤더 */}
                  <div className={`px-6 py-4 border-b ${getStatusStyle(order.status)} bg-opacity-20`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <p className="font-semibold text-gray-900">{order.order_no}</p>
                          <p className="text-sm text-gray-600">
                            {formatRelativeTime(order.created_at, locale)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusStyle(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(order.total_amount, 'KRW', locale)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* 상품 정보 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        {t('track.productInfo')}
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        {order.order_items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">
                              {item.product_name} 
                              <span className="text-gray-500 ml-2">x{item.quantity}</span>
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(item.subtotal, 'KRW', locale)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 배송 정보 */}
                    {order.shipments && order.shipments.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          {t('track.shippingInfo')}
                        </h4>
                        {order.shipments.map((shipment, idx) => (
                          <div key={idx} className="bg-blue-50 rounded-lg p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">{t('shipping.courier')}: </span>
                                <span className="font-medium">{shipment.courier}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">{t('shipping.trackingNo')}: </span>
                                <span className="font-mono font-medium">{shipment.tracking_no}</span>
                              </div>
                              {shipment.shipped_at && (
                                <div>
                                  <span className="text-gray-600">{t('shipping.shippingDate')}: </span>
                                  <span>{formatDate(shipment.shipped_at, locale)}</span>
                                </div>
                              )}
                              {shipment.delivered_at && (
                                <div>
                                  <span className="text-gray-600">{t('shipping.deliveryDate')}: </span>
                                  <span>{formatDate(shipment.delivered_at, locale)}</span>
                                </div>
                              )}
                            </div>
                            
                            {shipment.tracking_no && (
                              <a
                                href={shipment.tracking_url || generateTrackingUrl(shipment.courier, shipment.tracking_no)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                              >
                                <ExternalLink className="w-4 h-4" />
                                {t('shipping.trackShipment')}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 배송 주소 (개인정보 보호) */}
                    <div className="mt-4 text-sm text-gray-600">
                      <span className="font-medium">{t('orders.shippingAddress')}: </span>
                      {order.shipping_address} ({order.zip_code})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {searched && !loading && orders.length === 0 && !error && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg text-gray-600">{t('track.noOrders')}</p>
            <p className="text-sm text-gray-500 mt-2">
              {locale === 'ko' 
                ? '입력하신 정보로 등록된 주문이 없습니다.'
                : '没有找到相关订单信息。'}
            </p>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="mt-16 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2024 YUANDI Collection Management. All rights reserved.
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">
            {locale === 'ko' 
              ? '개인정보는 안전하게 보호되며 주문 조회 외 다른 용도로 사용되지 않습니다.'
              : '您的个人信息将得到安全保护，仅用于订单查询。'}
          </p>
        </div>
      </footer>
    </div>
  )
}