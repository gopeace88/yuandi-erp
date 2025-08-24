/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in component tree and displays fallback UI
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  level?: 'page' | 'section' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null
  private previousResetKeys: Array<string | number> = []

  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
    
    // Call error handler if provided
    onError?.(error, errorInfo)
    
    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))
    
    // Report to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      })
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state
    
    // Reset on props change if enabled
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
    
    // Reset on resetKeys change
    if (hasError && resetKeys && resetKeys !== this.previousResetKeys) {
      if (resetKeys.some((key, idx) => key !== this.previousResetKeys[idx])) {
        this.resetErrorBoundary()
      }
    }
    
    this.previousResetKeys = resetKeys || []
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    })
  }

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }))
  }

  render() {
    const { hasError, error, errorInfo, errorCount, showDetails } = this.state
    const { children, fallback, isolate, level = 'component' } = this.props
    
    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback(error, this.resetErrorBoundary)}</>
      }
      
      // Default fallback UI based on level
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          level={level}
          errorCount={errorCount}
          showDetails={showDetails}
          onReset={this.resetErrorBoundary}
          onToggleDetails={this.toggleDetails}
          isolate={isolate}
        />
      )
    }
    
    return children
  }
}

// ============================================================================
// Error Fallback Component
// ============================================================================

interface ErrorFallbackProps {
  error: Error
  errorInfo: ErrorInfo | null
  level: 'page' | 'section' | 'component'
  errorCount: number
  showDetails: boolean
  onReset: () => void
  onToggleDetails: () => void
  isolate?: boolean
}

function ErrorFallback({
  error,
  errorInfo,
  level,
  errorCount,
  showDetails,
  onReset,
  onToggleDetails,
  isolate
}: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Different styles based on error level
  const containerClasses = {
    page: 'min-h-screen flex items-center justify-center bg-gray-50',
    section: 'p-8 bg-white rounded-lg shadow-lg',
    component: 'p-4 bg-red-50 border border-red-200 rounded'
  }
  
  const iconSizes = {
    page: 'w-16 h-16',
    section: 'w-12 h-12',
    component: 'w-8 h-8'
  }
  
  return (
    <div className={containerClasses[level]}>
      <div className="max-w-md w-full">
        <div className="text-center">
          <AlertTriangle 
            className={`${iconSizes[level]} text-red-500 mx-auto mb-4`}
          />
          
          <h2 className={`font-bold text-gray-900 mb-2 ${
            level === 'page' ? 'text-2xl' : level === 'section' ? 'text-xl' : 'text-lg'
          }`}>
            {level === 'page' 
              ? '페이지 로드 중 오류가 발생했습니다'
              : level === 'section'
              ? '섹션 로드 중 오류가 발생했습니다'
              : '컴포넌트 오류'}
          </h2>
          
          <p className="text-gray-600 mb-4">
            {error.message || '알 수 없는 오류가 발생했습니다.'}
          </p>
          
          {errorCount > 2 && (
            <p className="text-sm text-orange-600 mb-4">
              이 오류가 반복적으로 발생하고 있습니다. ({errorCount}회)
            </p>
          )}
          
          <div className="flex gap-2 justify-center mb-4">
            <button
              onClick={onReset}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </button>
            
            {level === 'page' && (
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                홈으로
              </button>
            )}
          </div>
          
          {isDevelopment && (
            <>
              <button
                onClick={onToggleDetails}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    오류 상세 숨기기
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    오류 상세 보기
                  </>
                )}
              </button>
              
              {showDetails && (
                <div className="mt-4 text-left">
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-64">
                    <div className="mb-2">
                      <strong className="text-red-400">Error:</strong> {error.name}
                    </div>
                    <div className="mb-2">
                      <strong className="text-red-400">Message:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div className="mb-2">
                        <strong className="text-red-400">Stack:</strong>
                        <pre className="text-xs mt-1 whitespace-pre-wrap">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong className="text-red-400">Component Stack:</strong>
                        <pre className="text-xs mt-1 whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Async Error Boundary for Suspense
// ============================================================================

export function AsyncErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 mb-2">비동기 로딩 중 오류 발생</p>
          <button
            onClick={reset}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            다시 시도
          </button>
        </div>
      )}
    >
      <React.Suspense
        fallback={
          fallback || (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  )
}

// ============================================================================
// Network Error Component
// ============================================================================

export function NetworkError({ 
  onRetry 
}: { 
  onRetry?: () => void 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        네트워크 연결 오류
      </h3>
      <p className="text-gray-600 mb-4 text-center">
        인터넷 연결을 확인하고 다시 시도해주세요.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Not Found Component
// ============================================================================

export function NotFound({ 
  message = '요청하신 페이지를 찾을 수 없습니다.' 
}: { 
  message?: string 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        페이지를 찾을 수 없습니다
      </h3>
      <p className="text-gray-600 mb-4 text-center">{message}</p>
      <button
        onClick={() => window.location.href = '/'}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        홈으로 돌아가기
      </button>
    </div>
  )
}

// ============================================================================
// Empty State Component
// ============================================================================

export function EmptyState({ 
  icon: Icon,
  title,
  message,
  action
}: { 
  icon?: any
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {Icon && <Icon className="w-12 h-12 text-gray-400 mb-4" />}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-gray-600 mb-4">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Type declaration for window.Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void
    }
  }
}