'use client'

import dynamic from 'next/dynamic'
import { SalesChartProps } from './sales-chart'

// Dynamic import to avoid SSR issues with recharts
const SalesChart = dynamic(
  () => import('./sales-chart').then(mod => mod.SalesChart),
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

export function SalesChartWrapper(props: SalesChartProps) {
  return <SalesChart {...props} />
}