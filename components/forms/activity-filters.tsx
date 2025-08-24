'use client'

import { useState } from 'react'

interface ActivityFiltersProps {
  onFilterChange?: (filters: ActivityFilters) => void
}

export interface ActivityFilters {
  eventType?: string
  resourceType?: string
  startDate?: string
  endDate?: string
  userId?: string
}

export function ActivityFilters({ onFilterChange }: ActivityFiltersProps) {
  const [filters, setFilters] = useState<ActivityFilters>({})

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.eventType || ''}
            onChange={(e) => handleFilterChange('eventType', e.target.value)}
          >
            <option value="">All Events</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resource Type
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.resourceType || ''}
            onChange={(e) => handleFilterChange('resourceType', e.target.value)}
          >
            <option value="">All Resources</option>
            <option value="order">Orders</option>
            <option value="product">Products</option>
            <option value="user">Users</option>
            <option value="cashbook">Cashbook</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setFilters({})
            onFilterChange?.({})
          }}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Filters
        </button>
      </div>
    </div>
  )
}