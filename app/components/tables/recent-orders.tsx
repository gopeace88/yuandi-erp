interface Order {
  id: string
  order_no: string
  customer_name: string
  total_amount: number
  status: string
  created_at: string
}

interface RecentOrdersProps {
  orders: Order[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PAID: { label: '결제완료', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      SHIPPED: { label: '배송중', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      DONE: { label: '완료', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
      REFUNDED: { label: '환불', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value)
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          최근 주문
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                주문번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                고객명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                금액
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                주문일시
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {order.order_no}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {order.customer_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(order.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(order.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}