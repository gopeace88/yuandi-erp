'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export interface OrderStatusData {
  status: string
  label: string
  count: number
}

export interface OrderStatusChartProps {
  data: OrderStatusData[]
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const COLORS = {
    PAID: '#3b82f6',      // 파랑 - 결제완료
    SHIPPED: '#10b981',   // 초록 - 배송중
    DONE: '#6b7280',      // 회색 - 완료
    REFUNDED: '#ef4444'   // 빨강 - 환불
  }

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-semibold">{data.label}</p>
          <p className="text-sm text-gray-600">
            {data.count}개 주문 ({((data.count / total) * 100).toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-sm">주문 데이터가 없습니다</div>
          <div className="text-xs mt-1">주문이 생성되면 차트가 표시됩니다</div>
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-4">
      {/* 차트 */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={60}
              paddingAngle={5}
              dataKey="count"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.status as keyof typeof COLORS] || '#9ca3af'} 
                />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="grid grid-cols-2 gap-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ 
                backgroundColor: COLORS[item.status as keyof typeof COLORS] || '#9ca3af' 
              }}
            ></div>
            <div className="flex-1 flex justify-between">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-medium">{item.count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 총 주문 수 */}
      <div className="text-center pt-2 border-t">
        <div className="text-sm text-gray-500">총 주문 수</div>
        <div className="text-xl font-bold text-gray-900">{total.toLocaleString()}개</div>
      </div>
    </div>
  )
}