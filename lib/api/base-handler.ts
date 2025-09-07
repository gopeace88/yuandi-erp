/**
 * Base API Handler with common patterns
 * 
 * Provides consistent error handling, authentication, and response patterns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { getEventLogger } from '@/lib/middleware/event-logger'
import { z } from 'zod'

export type UserRole = 'admin' | 'order_manager' | 'ship_manager' | 'customer'

export interface ApiContext {
  request: NextRequest
  session: any
  supabase: any
  logger: ReturnType<typeof getEventLogger>
  params?: any
}

export interface ApiHandlerOptions {
  requiredRoles?: UserRole[]
  requireAuth?: boolean
  rateLimit?: {
    requests: number
    window: number // in seconds
  }
  cache?: {
    maxAge: number
    staleWhileRevalidate?: number
  }
}

export type ApiHandler<T = any> = (context: ApiContext) => Promise<NextResponse<T>>

/**
 * Create a standardized API handler with common patterns
 */
export function createApiHandler<T = any>(
  handler: ApiHandler<T>,
  options: ApiHandlerOptions = {}
): (request: NextRequest, params?: any) => Promise<NextResponse> {
  const { 
    requiredRoles = [], 
    requireAuth = true,
    cache 
  } = options

  return async (request: NextRequest, params?: any) => {
    try {
      // Authentication check
      if (requireAuth) {
        const session = await getServerSession()
        
        if (!session) {
          return NextResponse.json(
            { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
            { status: 401 }
          )
        }

        // Role-based access control
        if (requiredRoles.length > 0) {
          const userRole = session.user?.role as UserRole
          
          if (!requiredRoles.includes(userRole)) {
            return NextResponse.json(
              { error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' },
              { status: 403 }
            )
          }
        }

        // Create context
        const supabase = await createServerSupabase()
        const logger = getEventLogger(request)
        
        const context: ApiContext = {
          request,
          session,
          supabase,
          logger,
          params
        }

        // Execute handler
        const response = await handler(context)

        // Add cache headers if specified
        if (cache) {
          response.headers.set(
            'Cache-Control',
            `max-age=${cache.maxAge}${
              cache.staleWhileRevalidate 
                ? `, stale-while-revalidate=${cache.staleWhileRevalidate}`
                : ''
            }`
          )
        }

        return response
      } else {
        // No auth required
        const supabase = await createServerSupabase()
        const logger = getEventLogger(request)
        
        const context: ApiContext = {
          request,
          session: null,
          supabase,
          logger,
          params
        }

        return await handler(context)
      }
    } catch (error) {
      console.error('API Handler Error:', error)
      
      // Handle different error types
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            code: 'VALIDATION_ERROR',
            details: error.errors 
          },
          { status: 400 }
        )
      }

      if (error instanceof ApiError) {
        return NextResponse.json(
          { 
            error: error.message, 
            code: error.code,
            details: error.details 
          },
          { status: error.status }
        )
      }

      // Generic error
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          code: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'development' 
            ? (error as Error).message 
            : undefined
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
    orderBy: searchParams.get('orderBy') || 'created_at',
    order: (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  }
}

export function applyPagination(query: any, params: PaginationParams) {
  const { page = 1, limit = 20, orderBy = 'created_at', order = 'desc' } = params
  const from = (page - 1) * limit
  const to = from + limit - 1

  return query
    .order(orderBy, { ascending: order === 'asc' })
    .range(from, to)
}

/**
 * Response helpers
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, any>
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...meta
  })
}

export function errorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: code || 'ERROR',
      details
    },
    { status }
  )
}

/**
 * Validation helpers
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  return schema.parse(body)
}

export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}

/**
 * Database transaction helper
 */
export async function withTransaction<T>(
  supabase: any,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  // Note: Supabase doesn't have native transaction support
  // This is a placeholder for future implementation
  // Consider using RPC functions for complex transactions
  return callback(supabase)
}

/**
 * Batch operation helper
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(operation))
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Cache key generator
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join(',')
  
  return `${prefix}:${sortedParams}`
}