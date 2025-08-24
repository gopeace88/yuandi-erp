import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'

interface InventoryStatsProps {
  stats: {
    totalProducts: number
    totalValue: number
    lowStockCount: number
    outOfStockCount: number
  }
}

export function InventoryStats({ stats }: InventoryStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value)
  }

  const statCards = [
    {
      title: '전체 상품',
      value: stats.totalProducts.toLocaleString(),
      description: '등록된 상품 수',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: '재고 가치',
      value: formatCurrency(stats.totalValue),
      description: '총 재고 가치 (원가 기준)',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '재고 부족',
      value: stats.lowStockCount.toLocaleString(),
      description: '재고 부족 기준 이하',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: '품절',
      value: stats.outOfStockCount.toLocaleString(),
      description: '재고 0개 상품',
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                {card.description && (
                  <p className="mt-1 text-sm text-gray-500">{card.description}</p>
                )}
              </div>
              <div className={`ml-4 p-3 rounded-full ${card.bgColor}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}