import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Loading component should be moved to a .tsx file
// export const LoadingSpinner = () => (
//   <div className="flex items-center justify-center p-8">
//     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//   </div>
// )

// Error component should be moved to a .tsx file
// export const LoadingError = ({ error }: { error: Error }) => (
//   <div className="flex items-center justify-center p-8 text-red-600">
//     <p>Failed to load component: {error.message}</p>
//   </div>
// )

/**
 * Dynamic import wrapper with loading and error states
 */
export function createDynamicComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: ComponentType
    ssr?: boolean
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || (() => null), // LoadingSpinner,
    ssr: options?.ssr ?? true,
  })
}

// Heavy component dynamic imports
export const DynamicExcelExport = createDynamicComponent(
  () => import('@/components/features/excel-export').then(mod => ({ default: mod.ExcelExport })),
  { ssr: false }
)

export const DynamicChartComponent = createDynamicComponent(
  () => import('@/components/features/charts').then(mod => ({ default: mod.ChartComponent })),
  { ssr: false }
)

export const DynamicDataTable = createDynamicComponent(
  () => import('@/components/features/data-table').then(mod => ({ default: mod.DataTable }))
)

export const DynamicOrderForm = createDynamicComponent(
  () => import('@/components/features/order-form').then(mod => ({ default: mod.OrderForm }))
)

export const DynamicInventoryManager = createDynamicComponent(
  () => import('@/components/features/inventory-manager').then(mod => ({ default: mod.InventoryManager }))
)

// Modal components (usually not needed on initial load)
export const DynamicModal = createDynamicComponent(
  () => import('@/components/ui/modal').then(mod => ({ default: mod.Modal })),
  { ssr: false }
)

export const DynamicConfirmDialog = createDynamicComponent(
  () => import('@/components/ui/confirm-dialog').then(mod => ({ default: mod.ConfirmDialog })),
  { ssr: false }
)

// Heavy third-party libraries
export const DynamicDatePicker = createDynamicComponent(
  () => import('@/components/ui/date-picker').then(mod => ({ default: mod.DatePicker })),
  { ssr: false }
)

export const DynamicRichTextEditor = createDynamicComponent(
  () => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })),
  { ssr: false }
)

/**
 * Lazy load heavy utilities
 */
export const lazyLoadExcelUtils = () => import('@/lib/excel/excelUtils')
export const lazyLoadChartUtils = () => import('@/lib/charts/chartUtils')
export const lazyLoadPdfUtils = () => import('@/lib/pdf/pdfUtils')

/**
 * Prefetch dynamic components for better UX
 */
export function prefetchDynamicComponents() {
  if (typeof window !== 'undefined') {
    // Prefetch on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Prefetch commonly used dynamic components
        import('@/components/features/data-table')
        import('@/components/ui/modal')
      })
    }
  }
}

/**
 * Route-based code splitting helper
 */
export const routeComponents = {
  '/dashboard': () => import('@/app/dashboard/page'),
  '/orders': () => import('@/app/orders/page'),
  '/inventory': () => import('@/app/inventory/page'),
  '/track': () => import('@/app/track/page'),
} as const

/**
 * Conditional component loader based on user role
 */
export function loadComponentByRole(role: string) {
  switch (role) {
    case 'Admin':
      return import('@/components/features/admin-panel')
    case 'OrderManager':
      return import('@/components/features/order-manager-panel')
    case 'ShipManager':
      return import('@/components/features/ship-manager-panel')
    default:
      return import('@/components/features/guest-panel')
  }
}