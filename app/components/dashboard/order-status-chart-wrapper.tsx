'use client'

import dynamic from 'next/dynamic'
import { OrderStatusChartProps } from './order-status-chart'

// Dynamic import to avoid SSR issues with recharts
const OrderStatusChart = dynamic(
  () => import('./order-status-chart').then(mod => mod.OrderStatusChart),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-sm">차트를 불러오는 중...</div>
        </div>
      </div>
    )
  }
)

export function OrderStatusChartWrapper(props: OrderStatusChartProps) {
  return <OrderStatusChart {...props} />
}