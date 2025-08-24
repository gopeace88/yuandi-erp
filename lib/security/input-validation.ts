/**
 * Comprehensive Input Validation Module for YUANDI
 * 
 * Provides schema-based validation, sanitization, and security checks
 * for all user inputs across the application
 */

import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Korean phone number validation
 */
const koreanPhoneRegex = /^01[0-9]{1}-?[0-9]{3,4}-?[0-9]{4}$/
const koreanPhoneValidator = z.string().refine(
  (val) => koreanPhoneRegex.test(val.replace(/-/g, '')),
  { message: 'Invalid Korean phone number format' }
)

/**
 * Personal Customs Clearance Code (PCCC) validation
 */
const pcccRegex = /^P[0-9]{12}$/
const pcccValidator = z.string().refine(
  (val) => pcccRegex.test(val),
  { message: 'Invalid PCCC format (must be P followed by 12 digits)' }
)

/**
 * Common validation schemas
 */
export const CommonValidators = {
  // User-related
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .transform(val => val.trim()),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),

  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .transform(val => val.trim()),

  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .transform(val => DOMPurify.sanitize(val.trim())),

  // Korean-specific
  koreanPhone: koreanPhoneValidator,
  
  pccc: pcccValidator,

  // Address
  address: z.object({
    postalCode: z.string()
      .regex(/^[0-9]{5}$/, 'Postal code must be 5 digits'),
    roadAddress: z.string()
      .min(1, 'Road address is required')
      .max(200, 'Address too long')
      .transform(val => DOMPurify.sanitize(val)),
    detailAddress: z.string()
      .max(100, 'Detail address too long')
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    extraAddress: z.string()
      .max(100, 'Extra address too long')
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
  }),

  // Numeric
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(9999, 'Quantity too large'),

  price: z.number()
    .min(0, 'Price cannot be negative')
    .max(999999999, 'Price too large')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),

  percentage: z.number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100'),

  // Date and time
  date: z.string()
    .datetime({ message: 'Invalid date format' })
    .or(z.date()),

  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).refine(data => new Date(data.start) <= new Date(data.end), {
    message: 'Start date must be before or equal to end date',
  }),

  // Search and filters
  searchQuery: z.string()
    .max(100, 'Search query too long')
    .transform(val => DOMPurify.sanitize(val.trim())),

  sortField: z.enum([
    'created_at', 'updated_at', 'name', 'price', 
    'quantity', 'order_number', 'status',
  ]),

  sortOrder: z.enum(['asc', 'desc']),

  // Pagination
  page: z.number()
    .int()
    .min(1, 'Page must be at least 1')
    .default(1),

  limit: z.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10),

  // File upload
  fileName: z.string()
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid file name characters')
    .transform(val => {
      // Remove path traversal attempts
      return val.replace(/\.\./g, '').replace(/[\/\\]/g, '')
    }),

  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),

  // IDs
  uuid: z.string().uuid('Invalid UUID format'),

  numericId: z.number()
    .int()
    .positive('Invalid ID'),

  // Status enums
  orderStatus: z.enum(['PAID', 'SHIPPED', 'DONE', 'REFUNDED']),

  userRole: z.enum(['admin', 'order_manager', 'ship_manager', 'customer']),
}

/**
 * Product validation schemas
 */
export const ProductValidators = {
  createProduct: z.object({
    category: z.string()
      .min(1, 'Category is required')
      .max(50, 'Category too long')
      .transform(val => DOMPurify.sanitize(val)),
    name: z.string()
      .min(1, 'Product name is required')
      .max(200, 'Product name too long')
      .transform(val => DOMPurify.sanitize(val)),
    model: z.string()
      .min(1, 'Model is required')
      .max(100, 'Model too long')
      .transform(val => DOMPurify.sanitize(val)),
    color: z.string()
      .min(1, 'Color is required')
      .max(50, 'Color too long')
      .transform(val => DOMPurify.sanitize(val)),
    manufacturer: z.string()
      .min(1, 'Manufacturer is required')
      .max(100, 'Manufacturer too long')
      .transform(val => DOMPurify.sanitize(val)),
    cost_cny: CommonValidators.price,
    description: z.string()
      .max(1000, 'Description too long')
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    image_url: z.string()
      .url('Invalid image URL')
      .optional(),
  }),

  updateProduct: z.object({
    category: z.string()
      .max(50)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    name: z.string()
      .max(200)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    model: z.string()
      .max(100)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    color: z.string()
      .max(50)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    manufacturer: z.string()
      .max(100)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    cost_cny: CommonValidators.price.optional(),
    description: z.string()
      .max(1000)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    image_url: z.string()
      .url()
      .optional(),
  }),

  sku: z.string()
    .regex(
      /^[A-Z]{3}-[A-Z]{4}-[A-Z]{2}-[A-Z]{3}-[A-Z0-9]{5}$/,
      'Invalid SKU format'
    ),
}

/**
 * Order validation schemas
 */
export const OrderValidators = {
  createOrder: z.object({
    customer_name: CommonValidators.name,
    customer_phone: CommonValidators.koreanPhone,
    customer_pccc: CommonValidators.pccc,
    shipping_address: CommonValidators.address,
    items: z.array(z.object({
      product_id: CommonValidators.uuid,
      quantity: CommonValidators.quantity,
      unit_price: CommonValidators.price,
    })).min(1, 'At least one item is required'),
    notes: z.string()
      .max(500, 'Notes too long')
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
  }),

  updateOrderStatus: z.object({
    status: CommonValidators.orderStatus,
    tracking_number: z.string()
      .max(100)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
    tracking_photo_url: z.string()
      .url()
      .optional(),
  }),

  orderNumber: z.string()
    .regex(
      /^ORD-\d{6}-\d{3}$/,
      'Invalid order number format'
    ),
}

/**
 * Inventory validation schemas
 */
export const InventoryValidators = {
  inbound: z.object({
    product_id: CommonValidators.uuid,
    quantity: CommonValidators.quantity,
    notes: z.string()
      .max(500)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
  }),

  adjust: z.object({
    product_id: CommonValidators.uuid,
    quantity: z.number()
      .int('Quantity must be a whole number'),
    reason: z.enum(['damaged', 'lost', 'found', 'correction', 'other']),
    notes: z.string()
      .max(500)
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val) : val),
  }),
}

/**
 * Query parameter validation schemas
 */
export const QueryValidators = {
  pagination: z.object({
    page: CommonValidators.page,
    limit: CommonValidators.limit,
    sort: CommonValidators.sortField.optional(),
    order: CommonValidators.sortOrder.optional().default('desc'),
  }),

  dateFilter: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }).refine(data => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date)
    }
    return true
  }, {
    message: 'Start date must be before end date',
  }),

  searchFilter: z.object({
    q: CommonValidators.searchQuery.optional(),
    status: CommonValidators.orderStatus.optional(),
    category: z.string().max(50).optional(),
  }),
}

/**
 * Validation utility functions
 */
export class InputValidator {
  /**
   * Validate input against schema
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; errors: ValidationError[] } {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          new ValidationError(
            err.message,
            err.path.join('.'),
            err.code
          )
        )
        return { success: false, errors }
      }
      return { 
        success: false, 
        errors: [new ValidationError('Validation failed')] 
      }
    }
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHTML(input: string, options?: any): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false,
      ...options,
    })
  }

  /**
   * Sanitize for SQL
   */
  static sanitizeSQL(input: string): string {
    // Remove SQL special characters and keywords
    const dangerous = [
      /(--|;|\/\*|\*\/|xp_|sp_|0x)/gi,
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b|\bEXEC\b|\bUNION\b)/gi,
    ]
    
    let sanitized = input
    for (const pattern of dangerous) {
      sanitized = sanitized.replace(pattern, '')
    }
    
    // Escape single quotes
    return sanitized.replace(/'/g, "''")
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number // in bytes
      allowedTypes?: string[]
      allowedExtensions?: string[]
    } = {}
  ): { valid: boolean; error?: string } {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    } = options

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
      }
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed',
      }
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: 'File extension not allowed',
      }
    }

    // Check for double extensions (security risk)
    const doubleExtensionPattern = /\.(php|asp|jsp|exe|sh|bat)\.?/i
    if (doubleExtensionPattern.test(file.name)) {
      return {
        valid: false,
        error: 'Suspicious file name detected',
      }
    }

    return { valid: true }
  }

  /**
   * Validate JSON structure
   */
  static validateJSON(input: string): { valid: boolean; data?: any; error?: string } {
    try {
      const data = JSON.parse(input)
      return { valid: true, data }
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid JSON format',
      }
    }
  }

  /**
   * Check for common injection patterns
   */
  static hasInjectionPattern(input: string): boolean {
    const patterns = [
      // SQL injection
      /(--|;|\/\*|\*\/|xp_|sp_|0x)/i,
      /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/i,
      /(\bUNION\b.*\bSELECT\b)/i,
      
      // NoSQL injection
      /\$\w+:/,
      /\{\s*\$\w+\s*:/,
      
      // Command injection
      /[;&|`$()].*\b(cat|ls|pwd|whoami|id|uname)\b/i,
      
      // Path traversal
      /\.\.[\/\\]/,
      
      // XSS
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ]

    return patterns.some(pattern => pattern.test(input))
  }

  /**
   * Create safe error message for client
   */
  static createSafeError(error: ValidationError): string {
    // Don't expose internal details
    const safeMessages: Record<string, string> = {
      'Required': 'This field is required',
      'Invalid format': 'Please check the format',
      'Too long': 'This value is too long',
      'Too short': 'This value is too short',
    }

    for (const [key, message] of Object.entries(safeMessages)) {
      if (error.message.includes(key)) {
        return message
      }
    }

    return 'Invalid input'
  }
}