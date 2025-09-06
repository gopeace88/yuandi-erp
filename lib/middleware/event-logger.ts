import { createServerSupabase } from '@/lib/supabase/server'

export interface EventLogEntry {
  event_type: string
  entity_type?: string | null
  entity_id?: string | null
  entity_name?: string | null
  action?: string | null
  before_data?: any
  after_data?: any
  ip_address?: string | null
  user_agent?: string | null
  actor_id?: string | null
  actor_name?: string | null
  event_category?: string | null
  event_severity?: string
}

export class EventLogger {
  async logEvent(entry: EventLogEntry): Promise<void> {
    try {
      const supabase = await createServerSupabase()
      
      const logEntry = {
        event_type: entry.event_type,
        entity_type: entry.entity_type || null,
        entity_id: entry.entity_id?.toString() || null,
        entity_name: entry.entity_name || null,
        action: entry.action || null,
        actor_id: entry.actor_id || null,
        actor_name: entry.actor_name || null,
        event_category: entry.event_category || null,
        event_severity: entry.event_severity || 'info',
        before_data: entry.before_data || null,
        after_data: entry.after_data || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('event_logs')
        .insert(logEntry)

      if (error) {
        console.error('Failed to log event:', error)
        // Don't throw error to avoid breaking the main operation
      }
    } catch (error) {
      console.error('Event logging error:', error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  async logOrderEvent(
    operation: EventLogEntry['operation'],
    orderId: string | number,
    userId?: string,
    description?: string,
    beforeData?: any,
    afterData?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      table_name: 'orders',
      operation,
      record_id: orderId,
      user_id: userId,
      action_description: description,
      before_data: beforeData,
      after_data: afterData,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  async logProductEvent(
    operation: EventLogEntry['operation'],
    productId: string | number,
    userId?: string,
    description?: string,
    beforeData?: any,
    afterData?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      table_name: 'products',
      operation,
      record_id: productId,
      user_id: userId,
      action_description: description,
      before_data: beforeData,
      after_data: afterData,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }
}

// Singleton instance
let eventLogger: EventLogger | null = null

export function getEventLogger(): EventLogger {
  if (!eventLogger) {
    eventLogger = new EventLogger()
  }
  return eventLogger
}