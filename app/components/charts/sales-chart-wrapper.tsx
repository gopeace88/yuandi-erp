'use client'

import dynamic from 'next/dynamic'

export interface SalesChartProps {
  data: Array<{
    date: string
    sales: number
  }>
}

// Dynamic import to avoid SSR issues with recharts
const SalesChart = dynamic(
  () => import('./sales-chart').then(mod => mod.SalesChart),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          매출 추이 (최근 7일)
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

export function SalesChartWrapper(props: SalesChartProps) {
  return <SalesChart {...props} />
}