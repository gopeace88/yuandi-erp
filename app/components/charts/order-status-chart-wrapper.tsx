'use client'

import dynamic from 'next/dynamic'

export interface OrderStatusChartProps {
  data: {
    paid: number
    shipped: number
    done: number
    refunded: number
  }
}

// Dynamic import to avoid SSR issues with recharts
const OrderStatusChart = dynamic(
  () => import('./order-status-chart').then(mod => mod.OrderStatusChart),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          주문 상태 분포
        </h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-sm">차트를 불러오는 중...</div>
          </div>
        </div>
      </div>
    )
  }
)

export function OrderStatusChartWrapper(props: OrderStatusChartProps) {
  return <OrderStatusChart {...props} />
}