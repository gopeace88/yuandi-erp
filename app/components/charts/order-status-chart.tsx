'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface OrderStatusChartProps {
  data: {
    paid: number
    shipped: number
    done: number
    refunded: number
  }
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const chartData = [
    { name: '결제완료', value: data.paid, color: '#3B82F6' },
    { name: '배송중', value: data.shipped, color: '#10B981' },
    { name: '완료', value: data.done, color: '#6B7280' },
    { name: '환불', value: data.refunded, color: '#EF4444' },
  ].filter(item => item.value > 0)
  
  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        주문 상태 분포
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: 'none',
              borderRadius: '0.375rem'
            }}
            itemStyle={{ color: '#F3F4F6' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}