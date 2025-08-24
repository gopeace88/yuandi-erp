import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down'
  icon: LucideIcon
}

export function StatCard({ title, value, change, trend, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {change !== undefined && (
        <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
          <div className="text-sm">
            <span className={`flex items-center ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}%
              <span className="ml-2 text-gray-500 dark:text-gray-400">
                전일 대비
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}