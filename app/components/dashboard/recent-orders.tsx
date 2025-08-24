'use client'

import { useState, useEffect } from 'react'
import { Package, Clock, MapPin, Phone, Eye } from 'lucide-react'

interface RecentOrder {
  id: string
  orderNumber: string
  customerName: string
  phoneNumber: string
  address: string
  status: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
  totalAmount: number
  productCount: number
  createdAt: string
  shippedAt?: string
  trackingNumber?: string
}

const STATUS_CONFIG = {
  PAID: {
    label: '°DÌ',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: '=³'
  },
  SHIPPED: {
    label: '0¡',
    color: 'bg-green-50 text-green-600 border-green-200',
    icon: '=š'
  },
  DONE: {
    label: 'DÌ',
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: ''
  },
  REFUNDED: {
    label: 'Xˆ',
    color: 'bg-red-50 text-red-600 border-red-200',
    icon: '©'
  }
}

export function RecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentOrders()
  }, [])

  const loadRecentOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/recent-orders')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('\ü ü8 \Ü ä(:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours === 0) return ') '
    if (diffHours < 24) return `${diffHours}Ü `
    if (diffHours < 48) return '´'
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatAddress = (address: string) => {
    const parts = address.split(' ')
    return parts.slice(0, 3).join(' ') + (parts.length > 3 ? '...' : '')
  }

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="w-32 h-3 bg-gray-200 rounded"></div>
                <div className="w-40 h-3 bg-gray-200 rounded"></div>
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <div className="text-sm">\ü ü8t ÆµÈä</div>
        <div className="text-xs mt-1">È\´ ü8t Ý1t \Ü)Èä</div>
      </div>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <div className="space-y-2 p-4">
        {orders.map((order) => {
          const statusConfig = STATUS_CONFIG[order.status]
          
          return (
            <div key={order.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              {/* äT */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm text-blue-600">
                    {order.orderNumber}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(order.createdAt)}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full border ${statusConfig.color}`}>
                  {statusConfig.icon} {statusConfig.label}
                </div>
              </div>

              {/* à ô */}
              <div className="space-y-1 mb-2">
                <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <span>{order.customerName}</span>
                  <span className="text-xs text-gray-500">
                    ({formatPhone(order.phoneNumber)})
                  </span>
                </div>
                <div className="text-xs text-gray-600 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{formatAddress(order.address)}</span>
                </div>
              </div>

              {/* ü8 ô */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-600">
                  Áˆ {order.productCount}
                  {order.trackingNumber && (
                    <span className="ml-2 text-blue-600">
                      ´¡¥: {order.trackingNumber}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(order.totalAmount)}
                </div>
              </div>

              {/* 0¡ ô */}
              {order.status === 'SHIPPED' && order.shippedAt && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <span>=š</span>
                    <span>0¡ Ü‘: {formatDate(order.shippedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ”} */}
      {orders.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-xs text-center text-gray-600">
            <div className="flex justify-between items-center">
              <span>
                 ü8 : <span className="font-semibold">{orders.length}t</span>
              </span>
              <span>
                 ü8a: <span className="font-semibold">
                  {formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}