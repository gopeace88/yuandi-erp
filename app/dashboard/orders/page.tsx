'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { OrderAddModal } from '@/app/components/orders/order-add-modal'

export default function OrdersPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // 샘플 주문 데이터
  const allOrders = [
    { id: 'ORD-240823-001', customer: '홍길동', product: 'iPhone 15 Pro', quantity: 1, amount: 1250000, status: 'delivered', date: '2024-08-23' },
    { id: 'ORD-240822-015', customer: '김영희', product: '스마트워치 Ultra', quantity: 2, amount: 800000, status: 'shipping', date: '2024-08-22' },
    { id: 'ORD-240821-032', customer: '박민수', product: '무선 이어폰', quantity: 3, amount: 450000, status: 'paid', date: '2024-08-21' },
    { id: 'ORD-240820-011', customer: '이철수', product: 'iPad Pro', quantity: 1, amount: 1100000, status: 'done', date: '2024-08-20' },
    { id: 'ORD-240819-005', customer: '최영희', product: 'MacBook Air', quantity: 1, amount: 1600000, status: 'refunded', date: '2024-08-19' },
  ]

  // 필터링된 주문 목록
  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || order.status === statusFilter.toLowerCase()
    
    return matchesSearch && matchesStatus
  })
  
  // 통계 계산
  const stats = {
    total: allOrders.length,
    processing: allOrders.filter(o => o.status === 'paid' || o.status === 'shipping').length,
    delivered: allOrders.filter(o => o.status === 'delivered' || o.status === 'done').length,
    refunded: allOrders.filter(o => o.status === 'refunded').length
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      const handleLocaleChange = (e: CustomEvent) => {
        setLocale(e.detail.locale)
      }
      window.addEventListener('localeChange' as any, handleLocaleChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localeChange' as any, handleLocaleChange)
      }
    }
  }, [])

  const t = (key: string) => translate(locale, key)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('orders.addOrder')}
        </button>
      </div>

      {/* 주문 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              📋
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.total')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              ⏳
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.processing')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.delivered')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              ↩️
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('orders.stats.refunded')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.refunded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">{t('orders.list.title')}</h2>
            <div className="flex space-x-2">
              <input
                type="search"
                placeholder={t('orders.list.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('orders.status.all')}</option>
                <option value="paid">{t('orders.status.paid')}</option>
                <option value="shipping">{t('orders.status.shipped')}</option>
                <option value="done">{t('orders.status.done')}</option>
                <option value="refunded">{t('orders.status.refunded')}</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.orderNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.customerName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.productName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.quantity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.totalAmount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.orderDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                    <a href={`/dashboard/orders/${order.id}`} className="hover:underline">
                      {order.id}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{order.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'shipping' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'delivered' || order.status === 'done' ? 'bg-green-100 text-green-800' :
                      order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {t(`orders.status.${order.status === 'shipping' ? 'shipped' : order.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">{t('orders.actions.detail')}</button>
                    {order.status === 'paid' && (
                      <button className="text-orange-600 hover:text-orange-900">{t('orders.actions.process')}</button>
                    )}
                    {order.status === 'shipping' && (
                      <button className="text-green-600 hover:text-green-900">{t('orders.actions.track')}</button>
                    )}
                    {(order.status === 'delivered' || order.status === 'done') && (
                      <button className="text-green-600 hover:text-green-900">{t('orders.actions.complete')}</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    검색 결과가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 주문 추가 모달 */}
      {isAddModalOpen && (
        <OrderAddModal 
          locale={locale}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false)
            // TODO: 주문 목록 새로고침
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}