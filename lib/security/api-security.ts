import { NextRequest, NextResponse } from 'next/server'
import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

/**
 * API Security Middleware for preventing common vulnerabilities
 */

/**
 * XSS Prevention
 */
export class XSSProtection {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false,
    })
  }

  /**
   * Escape special characters for safe output
   */
  static escapeHTML(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    }
    
    return input.replace(/[&<>"'/]/g, (char) => map[char])
  }

  /**
   * Sanitize JSON data recursively
   */
  static sanitizeJSON(data: any): any {
    if (typeof data === 'string') {
      return this.escapeHTML(data)
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJSON(item))
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[this.escapeHTML(key)] = this.sanitizeJSON(value)
      }
      return sanitized
    }
    
    return data
  }

  /**
   * Validate and sanitize user input
   */
  static sanitizeInput(input: string, type: 'text' | 'email' | 'url' | 'number' = 'text'): string {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '')
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
    
    switch (type) {
      case 'email':
        // Basic email validation and sanitization
        sanitized = sanitized.toLowerCase().trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
          throw new Error('Invalid email format')
        }
        break
        
      case 'url':
        // URL validation and sanitization
        try {
          const url = new URL(sanitized)
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Invalid URL protocol')
          }
          sanitized = url.toString()
        } catch {
          throw new Error('Invalid URL format')
        }
        break
        
      case 'number':
        // Number validation
        if (!/^\d+(\.\d+)?$/.test(sanitized)) {
          throw new Error('Invalid number format')
        }
        break
        
      default:
        // General text sanitization
        sanitized = this.escapeHTML(sanitized)
    }
    
    return sanitized
  }
}

/**
 * SQL Injection Prevention
 */
export class SQLInjectionProtection {
  private static readonly dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|ORDER BY|GROUP BY|HAVING)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_|0x|\\x)/gi,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    /(['"])\s*OR\s*\1\s*=\s*\1/gi,
  ]

  /**
   * Check if input contains potential SQL injection
   */
  static containsSQLInjection(input: string): boolean {
    return this.dangerousPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Sanitize input to prevent SQL injection
   */
  static sanitize(input: string): string {
    if (this.containsSQLInjection(input)) {
      throw new Error('Potential SQL injection detected')
    }
    
    // Escape single quotes
    return input.replace(/'/g, "''")
  }

  /**
   * Validate and sanitize database identifiers
   */
  static sanitizeIdentifier(identifier: string): string {
    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error('Invalid identifier format')
    }
    
    // Check against reserved SQL keywords
    const reservedKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
      'TABLE', 'DATABASE', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION',
    ]
    
    if (reservedKeywords.includes(identifier.toUpperCase())) {
      throw new Error('Reserved SQL keyword cannot be used as identifier')
    }
    
    return identifier
  }
}

/**
 * CSRF Protection
 */
export class CSRFProtection {
  private static readonly CSRF_HEADER = 'x-csrf-token'
  private static readonly CSRF_COOKIE = 'csrf-token'

  /**
   * Verify CSRF token
   */
  static async verifyToken(request: NextRequest): Promise<boolean> {
    // Skip CSRF check for GET requests
    if (request.method === 'GET' || request.method === 'HEAD') {
      return true
    }

    const headerToken = request.headers.get(this.CSRF_HEADER)
    const cookieToken = request.cookies.get(this.CSRF_COOKIE)?.value

    if (!headerToken || !cookieToken) {
      return false
    }

    // Use timing-safe comparison
    return this.timingSafeEqual(headerToken, cookieToken)
  }

  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const buffer = new Uint8Array(32)
    crypto.getRandomValues(buffer)
    return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Timing-safe string comparison
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }
}

/**
 * Input Validation Schemas
 */
export const ValidationSchemas = {
  // User input schemas
  email: z.string().email().max(255),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  
  username: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  
  phoneNumber: z.string()
    .regex(/^[0-9]{10,11}$/, 'Invalid phone number format'),
  
  // Order schemas
  orderNumber: z.string()
    .regex(/^\d{6}-\d{3}$/, 'Invalid order number format'),
  
  productSKU: z.string()
    .regex(/^[A-Z]{3}-[A-Z]{4}-[A-Z]{2}-[A-Z]{3}-[A-Z0-9]{5}$/, 'Invalid SKU format'),
  
  // Numeric validations
  quantity: z.number().int().min(1).max(9999),
  
  price: z.number().min(0).max(999999999),
  
  // Date validations
  date: z.string().datetime(),
  
  // Search query
  searchQuery: z.string()
    .max(100)
    .transform(str => XSSProtection.escapeHTML(str)),
  
  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
}

/**
 * Request Validator
 */
export class RequestValidator {
  /**
   * Validate request body against schema
   */
  static validateBody<T>(
    body: unknown,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; errors: string[] } {
    try {
      const data = schema.parse(body)
      return { success: true, data }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        }
      }
      return { success: false, errors: ['Invalid request body'] }
    }
  }

  /**
   * Validate query parameters
   */
  static validateQuery<T>(
    params: URLSearchParams,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; errors: string[] } {
    const query: any = {}
    for (const [key, value] of params.entries()) {
      query[key] = value
    }
    
    return this.validateBody(query, schema)
  }

  /**
   * Sanitize file name
   */
  static sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    fileName = fileName.replace(/\.\./g, '')
    fileName = fileName.replace(/[\/\\]/g, '')
    
    // Remove special characters except dots and hyphens
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    
    // Limit length
    if (fileName.length > 255) {
      const ext = fileName.split('.').pop()
      fileName = fileName.substring(0, 250 - (ext?.length || 0)) + '.' + ext
    }
    
    return fileName
  }
}

/**
 * API Security Middleware
 */
export async function withAPISecurity(
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<(request: NextRequest) => Promise<NextResponse>> {
  return async (request: NextRequest) => {
    try {
      // 1. Check request method
      const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      if (!allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        )
      }

      // 2. Verify CSRF token for state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const isValidCSRF = await CSRFProtection.verifyToken(request)
        if (!isValidCSRF) {
          return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          )
        }
      }

      // 3. Check Content-Type for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type')
        if (!contentType?.includes('application/json') && !contentType?.includes('multipart/form-data')) {
          return NextResponse.json(
            { error: 'Invalid content type' },
            { status: 400 }
          )
        }
      }

      // 4. Apply rate limiting
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      // Implement rate limiting logic here

      // 5. Execute the handler
      const response = await handler(request)

      // 6. Add security headers to response
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

      return response
    } catch (error) {
      console.error('API Security Middleware Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}