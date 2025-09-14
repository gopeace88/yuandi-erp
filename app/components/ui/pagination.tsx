'use client'

import React from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDoubleLeftIcon, 
  ChevronDoubleRightIcon 
} from '@heroicons/react/24/outline'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  showSummary?: boolean
  maxPageButtons?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  showSummary = true,
  maxPageButtons = 5,
  className = ''
}: PaginationProps) {
  // 페이지 버튼 범위 계산
  const getPageRange = () => {
    const halfRange = Math.floor(maxPageButtons / 2)
    let start = Math.max(1, currentPage - halfRange)
    let end = Math.min(totalPages, start + maxPageButtons - 1)
    
    // 끝에 가까울 때 시작점 조정
    if (end - start + 1 < maxPageButtons) {
      start = Math.max(1, end - maxPageButtons + 1)
    }
    
    return { start, end }
  }

  const { start, end } = getPageRange()
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  // 요약 정보 계산
  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : 0

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 ${className}`}>
      {/* 요약 정보 */}
      {showSummary && totalItems && itemsPerPage && (
        <div className="text-sm text-gray-600">
          {startItem} - {endItem} / 전체 {totalItems}개
        </div>
      )}

      {/* 페이지네이션 버튼 */}
      <div className="flex items-center gap-1">
        {/* 처음으로 */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="처음 페이지"
          data-testid="pagination-first"
        >
          <ChevronDoubleLeftIcon className="w-4 h-4" />
        </button>

        {/* 이전 */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="이전 페이지"
          data-testid="pagination-prev"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        {/* 페이지 번호들 */}
        <div className="flex items-center gap-1 px-2">
          {start > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                data-testid="pagination-page-1"
              >
                1
              </button>
              {start > 2 && <span className="px-1 text-gray-400">...</span>}
            </>
          )}

          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                page === currentPage
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'hover:bg-gray-100'
              }`}
              data-testid={`pagination-page-${page}`}
            >
              {page}
            </button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                data-testid={`pagination-page-${totalPages}`}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* 다음 */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="다음 페이지"
          data-testid="pagination-next"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>

        {/* 마지막으로 */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="마지막 페이지"
          data-testid="pagination-last"
        >
          <ChevronDoubleRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* 페이지 직접 입력 (옵션) */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">페이지</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value)
            if (!isNaN(page)) {
              handlePageChange(page)
            }
          }}
          className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="pagination-input"
        />
        <span className="text-gray-600">/ {totalPages}</span>
      </div>
    </div>
  )
}