import { Suspense } from 'react'
import { Activity, Filter } from 'lucide-react'
import { ActivityTable } from '@/components/tables/activity-table'
import { ActivityFilters } from '@/components/forms/activity-filters'
import { fetchActivityLogs } from '@/lib/api/activity'

interface ActivityPageProps {
  searchParams?: {
    actor?: string
    type?: string
    date?: string
    page?: string
  }
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const logs = await fetchActivityLogs({
    eventType: searchParams?.type,
    userId: searchParams?.actor,
    startDate: searchParams?.date,
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            작업 로그
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            시스템 내 모든 작업 기록을 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-500">
            실시간 업데이트
          </span>
        </div>
      </div>

      {/* Filters */}
      <ActivityFilters />

      {/* Activity Table */}
      <Suspense fallback={<div>Loading activity logs...</div>}>
        <ActivityTable logs={logs} />
      </Suspense>
    </div>
  )
}