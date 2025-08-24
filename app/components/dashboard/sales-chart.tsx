'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SalesData {
  date: string
  amount: number
}

interface SalesChartProps {
  data: SalesData[]
}

export function SalesChart({ data }: SalesChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm text-gray-600">{formatDate(label)}</p>
          <p className="text-sm font-semibold text-blue-600">
            매출: {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-sm">매출 데이터가 없습니다</div>
          <div className="text-xs mt-1">주문이 생성되면 차트가 표시됩니다</div>
        </div>
      </div>
    )
  }

  const totalSales = data.reduce((sum, item) => sum + item.amount, 0)
  const avgDaily = totalSales / data.length

  return (
    <div className="space-y-4">
      {/* 요약 통계 */}
      <div className="flex justify-between text-sm">
        <div>
          <div className="text-gray-500">7일 총 매출</div>
          <div className="font-semibold text-lg">{formatCurrency(totalSales)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-500">일평균</div>
          <div className="font-semibold text-lg">{formatCurrency(avgDaily)}</div>
        </div>
      </div>

      {/* 차트 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              fontSize={12}
              stroke="#9ca3af"
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              fontSize={12}
              stroke="#9ca3af"
            />
            <Tooltip content={customTooltip} />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#2563eb" 
              strokeWidth={3}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}