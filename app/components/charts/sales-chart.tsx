'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SalesChartProps {
  data: Array<{
    date: string
    sales: number
  }>
}

export function SalesChart({ data }: SalesChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value)
  }
  
  const chartData = data.map(item => ({
    ...item,
    displayDate: formatDate(item.date)
  }))
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        매출 추이 (최근 7일)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="displayDate" 
            stroke="#9CA3AF"
          />
          <YAxis 
            tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
            stroke="#9CA3AF"
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => `날짜: ${label}`}
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: 'none',
              borderRadius: '0.375rem'
            }}
            itemStyle={{ color: '#F3F4F6' }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="매출"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}