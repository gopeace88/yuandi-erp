/**
 * Custom hooks for API interactions
 * 
 * Provides reusable hooks for data fetching, mutations, and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/utils/toast'

// ============================================================================
// Types
// ============================================================================

export interface ApiState<T> {
  data: T | null
  error: Error | null
  loading: boolean
  mutating?: boolean
}

export interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshInterval?: number
  dedupingInterval?: number
  initialData?: any
}

export interface UseMutationOptions extends UseApiOptions {
  optimisticUpdate?: (data: any) => any
  rollbackOnError?: boolean
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

// ============================================================================
// Core API Hook
// ============================================================================

/**
 * Generic API fetching hook
 */
export function useApi<T = any>(
  url: string | null,
  options: UseApiOptions = {}
): ApiState<T> & { 
  refetch: () => Promise<void>
  mutate: (data: T) => void 
} {
  const [state, setState] = useState<ApiState<T>>({
    data: options.initialData || null,
    error: null,
    loading: !options.initialData
  })
  
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) return

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (mountedRef.current) {
        setState({
          data: data.data || data,
          error: null,
          loading: false
        })
        options.onSuccess?.(data)
      }
    } catch (error) {
      if (mountedRef.current && error.name !== 'AbortError') {
        const err = error as Error
        setState({
          data: null,
          error: err,
          loading: false
        })
        options.onError?.(err)
      }
    }
  }, [url, options])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Revalidation on focus
  useEffect(() => {
    if (!options.revalidateOnFocus) return

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchData, options.revalidateOnFocus])

  // Revalidation on reconnect
  useEffect(() => {
    if (!options.revalidateOnReconnect) return

    const handleOnline = () => {
      fetchData()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [fetchData, options.revalidateOnReconnect])

  // Refresh interval
  useEffect(() => {
    if (!options.refreshInterval) return

    const interval = setInterval(fetchData, options.refreshInterval)

    return () => clearInterval(interval)
  }, [fetchData, options.refreshInterval])

  const mutate = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }))
  }, [])

  return {
    ...state,
    refetch: fetchData,
    mutate
  }
}

// ============================================================================
// Mutation Hook
// ============================================================================

/**
 * Hook for API mutations (POST, PUT, PATCH, DELETE)
 */
export function useMutation<TData = any, TVariables = any>(
  url: string | ((variables: TVariables) => string),
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options: UseMutationOptions = {}
): {
  mutate: (variables: TVariables) => Promise<TData>
  data: TData | null
  error: Error | null
  loading: boolean
  reset: () => void
} {
  const [state, setState] = useState<ApiState<TData>>({
    data: null,
    error: null,
    loading: false,
    mutating: false
  })

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    setState(prev => ({ ...prev, loading: true, error: null, mutating: true }))

    const endpoint = typeof url === 'function' ? url(variables) : url

    try {
      // Optimistic update
      if (options.optimisticUpdate) {
        const optimisticData = options.optimisticUpdate(variables)
        setState(prev => ({ ...prev, data: optimisticData }))
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: method !== 'DELETE' ? JSON.stringify(variables) : undefined,
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const result = data.data || data

      setState({
        data: result,
        error: null,
        loading: false,
        mutating: false
      })

      options.onSuccess?.(result)
      return result
    } catch (error) {
      const err = error as Error
      
      setState(prev => ({
        data: options.rollbackOnError ? null : prev.data,
        error: err,
        loading: false,
        mutating: false
      }))

      options.onError?.(err)
      throw err
    }
  }, [url, method, options])

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false,
      mutating: false
    })
  }, [])

  return {
    mutate,
    data: state.data,
    error: state.error,
    loading: state.loading,
    reset
  }
}

// ============================================================================
// Pagination Hook
// ============================================================================

/**
 * Hook for paginated data fetching
 */
export function usePagination<T = any>(
  baseUrl: string,
  options: UseApiOptions = {}
): {
  data: T[]
  pagination: PaginationState
  loading: boolean
  error: Error | null
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  refetch: () => Promise<void>
} {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false
  })

  const url = `${baseUrl}?page=${pagination.page}&limit=${pagination.limit}`
  
  const { data, error, loading, refetch } = useApi<{
    data: T[]
    pagination: PaginationState
  }>(url, {
    ...options,
    onSuccess: (response) => {
      if (response.pagination) {
        setPagination(response.pagination)
      }
      options.onSuccess?.(response)
    }
  })

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }, [])

  return {
    data: data?.data || [],
    pagination,
    loading,
    error,
    setPage,
    setLimit,
    refetch
  }
}

// ============================================================================
// Infinite Scroll Hook
// ============================================================================

/**
 * Hook for infinite scrolling
 */
export function useInfiniteScroll<T = any>(
  baseUrl: string,
  options: UseApiOptions = {}
): {
  data: T[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  reset: () => void
} {
  const [data, setData] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${baseUrl}?page=${page}&limit=20`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      const newData = result.data || []
      
      setData(prev => [...prev, ...newData])
      setPage(prev => prev + 1)
      setHasMore(newData.length === 20)
      
      options.onSuccess?.(result)
    } catch (err) {
      setError(err as Error)
      options.onError?.(err as Error)
    } finally {
      setLoading(false)
    }
  }, [baseUrl, page, loading, hasMore, options])

  const reset = useCallback(() => {
    setData([])
    setPage(1)
    setHasMore(true)
    setError(null)
  }, [])

  // Initial load
  useEffect(() => {
    loadMore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    reset
  }
}

// ============================================================================
// Debounced Search Hook
// ============================================================================

/**
 * Hook for debounced search
 */
export function useDebouncedSearch<T = any>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
): {
  query: string
  setQuery: (query: string) => void
  results: T[]
  loading: boolean
  error: Error | null
} {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      
      setLoading(true)
      setError(null)

      try {
        const data = await searchFn(query)
        setResults(data)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err as Error)
        }
      } finally {
        setLoading(false)
      }
    }, delay)

    return () => {
      clearTimeout(timer)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [query, delay, searchFn])

  return {
    query,
    setQuery,
    results,
    loading,
    error
  }
}

// ============================================================================
// Form Hook
// ============================================================================

/**
 * Hook for form handling with validation
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validate?: (values: T) => Record<string, string>
): {
  values: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  isDirty: boolean
  handleChange: (name: keyof T, value: any) => void
  handleBlur: (name: keyof T) => void
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: React.FormEvent) => Promise<void>
  reset: () => void
  setFieldError: (name: keyof T, error: string) => void
  setValues: (values: T) => void
} {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isDirty, setIsDirty] = useState(false)

  const validateForm = useCallback(() => {
    if (!validate) return {}
    const validationErrors = validate(values)
    setErrors(validationErrors)
    return validationErrors
  }, [values, validate])

  useEffect(() => {
    if (isDirty) {
      validateForm()
    }
  }, [values, isDirty, validateForm])

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    setIsDirty(true)
  }, [])

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name as string]: true }))
  }, [])

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        )
        setTouched(allTouched)

        // Validate
        const validationErrors = validateForm()
        
        if (Object.keys(validationErrors).length === 0) {
          await onSubmit(values)
        }
      }
    },
    [values, validateForm]
  )

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsDirty(false)
  }, [initialValues])

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name as string]: error }))
  }, [])

  const isValid = Object.keys(errors).length === 0

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldError,
    setValues
  }
}