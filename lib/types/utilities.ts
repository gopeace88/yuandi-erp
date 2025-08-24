/**
 * TypeScript Type Utilities
 * 
 * Advanced type utilities for better type safety and developer experience
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Make all properties nullable
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null
}

/**
 * Make specific properties nullable
 */
export type NullableBy<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null
}

/**
 * Deep partial type
 */
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>
} : T

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = T extends object ? {
  readonly [P in keyof T]: DeepReadonly<T[P]>
} : T

/**
 * Mutable type (remove readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Deep mutable type
 */
export type DeepMutable<T> = T extends object ? {
  -readonly [P in keyof T]: DeepMutable<T[P]>
} : T

/**
 * Extract keys of specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/**
 * Strict omit (ensures keys exist)
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>

/**
 * Strict extract (ensures keys exist)
 */
export type StrictExtract<T, K extends keyof T> = Pick<T, K>

/**
 * XOR type (either A or B, but not both)
 */
export type XOR<T, U> = (T | U) extends object
  ? (T & { [K in keyof U]?: never }) | (U & { [K in keyof T]?: never })
  : T | U

/**
 * At least one property required
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>
}[keyof T]

/**
 * Exactly one property required
 */
export type ExactlyOne<T> = AtLeastOne<T> & {
  [K in keyof T]: {
    [P in K]: T[P]
  } & {
    [P in Exclude<keyof T, K>]?: never
  }
}[keyof T]

// ============================================================================
// API Types
// ============================================================================

/**
 * API Response wrapper
 */
export type ApiResponse<T> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: ApiError }

/**
 * API Error type
 */
export interface ApiError {
  message: string
  code: string
  status: number
  details?: any
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * Sort configuration
 */
export interface SortConfig<T> {
  field: keyof T
  direction: 'asc' | 'desc'
}

/**
 * Filter configuration
 */
export interface FilterConfig<T> {
  field: keyof T
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'
  value: any
}

// ============================================================================
// Form Types
// ============================================================================

/**
 * Form field configuration
 */
export interface FormField<T = any> {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date' | 'file'
  value: T
  required?: boolean
  disabled?: boolean
  placeholder?: string
  options?: Array<{ label: string; value: any }>
  validation?: (value: T) => string | undefined
  onChange?: (value: T) => void
  onBlur?: () => void
}

/**
 * Form state
 */
export interface FormState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
}

/**
 * Form actions
 */
export interface FormActions<T> {
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
  setFieldError: <K extends keyof T>(field: K, error: string) => void
  setFieldTouched: <K extends keyof T>(field: K, touched: boolean) => void
  setValues: (values: Partial<T>) => void
  setErrors: (errors: Partial<Record<keyof T, string>>) => void
  reset: () => void
  submit: () => Promise<void>
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Timestamps
 */
export interface Timestamps {
  created_at: string
  updated_at: string
}

/**
 * Soft delete
 */
export interface SoftDelete {
  deleted_at: string | null
}

/**
 * Audit fields
 */
export interface AuditFields {
  created_by: string
  updated_by: string | null
}

/**
 * Base entity
 */
export interface BaseEntity extends Timestamps {
  id: string
}

/**
 * Full entity with all tracking fields
 */
export interface TrackedEntity extends BaseEntity, SoftDelete, AuditFields {}

// ============================================================================
// React Component Types
// ============================================================================

/**
 * Component with children
 */
export interface WithChildren {
  children: React.ReactNode
}

/**
 * Component with className
 */
export interface WithClassName {
  className?: string
}

/**
 * Component with style
 */
export interface WithStyle {
  style?: React.CSSProperties
}

/**
 * Async component props
 */
export interface AsyncComponentProps<T> {
  promise: Promise<T>
  pending?: React.ReactNode
  fulfilled?: (data: T) => React.ReactNode
  rejected?: (error: Error) => React.ReactNode
}

/**
 * Modal props
 */
export interface ModalProps extends WithChildren {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
}

/**
 * Table column configuration
 */
export interface TableColumn<T> {
  key: keyof T | string
  header: string
  accessor: (item: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
}

// ============================================================================
// Business Logic Types
// ============================================================================

/**
 * Money type with currency
 */
export interface Money {
  amount: number
  currency: 'KRW' | 'CNY' | 'USD'
}

/**
 * Date range
 */
export interface DateRange {
  start: Date | string
  end: Date | string
}

/**
 * Address
 */
export interface Address {
  postalCode: string
  roadAddress: string
  jibunAddress?: string
  detailAddress?: string
  extraAddress?: string
  country?: string
}

/**
 * Contact information
 */
export interface ContactInfo {
  name: string
  phone: string
  email?: string
}

/**
 * File upload
 */
export interface FileUpload {
  file: File
  preview?: string
  progress?: number
  error?: string
  uploaded?: boolean
  url?: string
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Check if value is an array
 */
export function isArray<T = any>(value: unknown): value is T[] {
  return Array.isArray(value)
}

/**
 * Check if value is an object
 */
export function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}

/**
 * Check if value is a promise
 */
export function isPromise<T = any>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (
    isObject(value) &&
    isFunction((value as any).then) &&
    isFunction((value as any).catch)
  )
}

/**
 * Check if API response is successful
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is { success: true; data: T } {
  return response.success === true
}

/**
 * Check if API response is error
 */
export function isApiError(
  response: ApiResponse<any>
): response is { success: false; error: ApiError } {
  return response.success === false
}

// ============================================================================
// Type Assertions
// ============================================================================

/**
 * Assert that value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is not defined'
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message)
  }
}

/**
 * Assert that condition is true
 */
export function assert(
  condition: any,
  message = 'Assertion failed'
): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Exhaustive check for discriminated unions
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`)
}

// ============================================================================
// Type Transformers
// ============================================================================

/**
 * Convert nullable to defined
 */
export function toNonNullable<T>(value: T | null | undefined, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue
}

/**
 * Pick defined values from object
 */
export function pickDefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  
  for (const key in obj) {
    if (isDefined(obj[key])) {
      result[key] = obj[key]
    }
  }
  
  return result
}

/**
 * Omit null/undefined values from object
 */
export function omitNullish<T extends Record<string, any>>(obj: T): Partial<T> {
  return pickDefined(obj)
}

/**
 * Type-safe object keys
 */
export function objectKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>
}

/**
 * Type-safe object entries
 */
export function objectEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>
}

/**
 * Type-safe object from entries
 */
export function objectFromEntries<K extends string, V>(
  entries: Array<[K, V]>
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>
}