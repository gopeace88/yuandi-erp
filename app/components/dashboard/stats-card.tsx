interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  className = ''
}: StatsCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-sm text-gray-500">전일 대비</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4">
            <div className="p-3 bg-blue-50 rounded-full">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}