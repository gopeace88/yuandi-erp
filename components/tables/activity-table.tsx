'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface ActivityLog {
  id: string
  event_type: string
  actor_id: string
  actor_name?: string
  resource_type: string
  resource_id: string
  details: any
  created_at: string
}

interface ActivityTableProps {
  logs?: ActivityLog[]
  loading?: boolean
}

export function ActivityTable({ logs = [], loading = false }: ActivityTableProps) {
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>(logs)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (filter) {
      setFilteredLogs(
        logs.filter(
          (log) =>
            log.event_type.toLowerCase().includes(filter.toLowerCase()) ||
            log.resource_type.toLowerCase().includes(filter.toLowerCase()) ||
            log.actor_name?.toLowerCase().includes(filter.toLowerCase())
        )
      )
    } else {
      setFilteredLogs(logs)
    }
  }, [filter, logs])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Activity Log</h2>
        <input
          type="text"
          placeholder="Filter activities..."
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    log.event_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                    log.event_type === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                    log.event_type === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.event_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.actor_name || log.actor_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.resource_type} #{log.resource_id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <details className="cursor-pointer">
                    <summary>View details</summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No activity logs found
        </div>
      )}
    </div>
  )
}