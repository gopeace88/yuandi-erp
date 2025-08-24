import { ActivityFilters } from '@/components/forms/activity-filters'

export interface ActivityLog {
  id: string
  event_type: string
  actor_id: string
  actor_name?: string
  resource_type: string
  resource_id: string
  details: any
  created_at: string
  ip_address?: string
  user_agent?: string
}

export async function fetchActivityLogs(filters?: ActivityFilters): Promise<ActivityLog[]> {
  const params = new URLSearchParams()
  
  if (filters?.eventType) params.append('event_type', filters.eventType)
  if (filters?.resourceType) params.append('resource_type', filters.resourceType)
  if (filters?.startDate) params.append('start_date', filters.startDate)
  if (filters?.endDate) params.append('end_date', filters.endDate)
  if (filters?.userId) params.append('user_id', filters.userId)

  const response = await fetch(`/api/event-logs?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch activity logs')
  }

  const data = await response.json()
  return data.data || []
}

export async function fetchActivityStats() {
  const response = await fetch('/api/event-logs/stats')
  
  if (!response.ok) {
    throw new Error('Failed to fetch activity stats')
  }

  const data = await response.json()
  return data.stats || {}
}