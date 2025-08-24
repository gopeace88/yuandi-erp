/**
 * Reusable Data Table Component
 * 
 * Provides a flexible table with sorting, filtering, and pagination
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  accessor: (item: T) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  selectedItem?: T
  emptyMessage?: string
  loading?: boolean
  sortable?: boolean
  className?: string
  headerClassName?: string
  rowClassName?: string | ((item: T, index: number) => string)
  stickyHeader?: boolean
  maxHeight?: string
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  selectedItem,
  emptyMessage = 'No data available',
  loading = false,
  sortable = true,
  className = '',
  headerClassName = '',
  rowClassName = '',
  stickyHeader = false,
  maxHeight
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    if (!sortable) return
    
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' }
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return null
    })
  }, [sortable])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    const column = columns.find(col => col.key === sortConfig.key)
    if (!column) return data

    return [...data].sort((a, b) => {
      const aValue = column.accessor(a)
      const bValue = column.accessor(b)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [data, sortConfig, columns])

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (!sortable) return null
    
    if (sortConfig?.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  // Get row class
  const getRowClass = (item: T, index: number) => {
    const baseClass = 'hover:bg-gray-50 transition-colors'
    const customClass = typeof rowClassName === 'function' 
      ? rowClassName(item, index)
      : rowClassName
    const selectedClass = selectedItem && keyExtractor(selectedItem) === keyExtractor(item)
      ? 'bg-blue-50'
      : ''
    const clickableClass = onRowClick ? 'cursor-pointer' : ''
    
    return `${baseClass} ${customClass} ${selectedClass} ${clickableClass}`
  }

  const containerStyle = maxHeight ? { maxHeight, overflowY: 'auto' as const } : {}

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`overflow-hidden ${className}`} style={containerStyle}>
      <table className="w-full">
        <thead className={stickyHeader ? 'sticky top-0 z-10 bg-white' : ''}>
          <tr className={`border-b ${headerClassName}`}>
            {columns.map(column => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left font-medium text-gray-700 ${
                  column.sortable !== false && sortable ? 'cursor-pointer select-none' : ''
                } ${column.className || ''}`}
                style={{ width: column.width, textAlign: column.align || 'left' }}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  <span>{column.header}</span>
                  {column.sortable !== false && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr
              key={keyExtractor(item)}
              className={getRowClass(item, index)}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map(column => (
                <td
                  key={column.key}
                  className={`px-4 py-3 ${column.className || ''}`}
                  style={{ textAlign: column.align || 'left' }}
                >
                  {column.accessor(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// Pagination Component
// ============================================================================

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (items: number) => void
  itemsPerPageOptions?: number[]
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  className = ''
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPagesToShow = 7
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t ${className}`}>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
        {onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm"
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>
                {option} per page
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-2">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-1 border rounded-md text-sm hover:bg-gray-50 ${
                  currentPage === page ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Search and Filter Components
// ============================================================================

export interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchFilter({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  debounceMs = 300
}: SearchFilterProps) {
  const [localValue, setLocalValue] = useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, value, onChange, debounceMs])

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  )
}

export interface SelectFilterProps<T> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  placeholder?: string
  className?: string
}

export function SelectFilter<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = ''
}: SelectFilterProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}