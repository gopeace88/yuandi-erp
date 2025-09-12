'use client';

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
  locale?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
  locale = 'ko'
}: PaginationProps) {
  // 모바일에서는 3개, PC에서는 5개의 페이지 번호 표시
  const maxVisiblePages = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5;
  
  // 표시할 페이지 번호 계산
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // 전체 페이지가 maxVisiblePages 이하면 모두 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지를 중심으로 페이지 번호 표시
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - halfVisible);
      let end = Math.min(totalPages, currentPage + halfVisible);
      
      // 시작이나 끝에 가까울 때 조정
      if (currentPage <= halfVisible) {
        end = maxVisiblePages;
      } else if (currentPage > totalPages - halfVisible) {
        start = totalPages - maxVisiblePages + 1;
      }
      
      // 첫 페이지
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }
      
      // 중간 페이지들
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      // 마지막 페이지
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  if (totalPages <= 1) return null;
  
  const pageNumbers = getPageNumbers();
  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : 0;
  
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 ${className}`}>
      {/* 항목 정보 - 모바일에서는 간단하게 표시 */}
      {totalItems && itemsPerPage && (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <span className="hidden sm:inline">
            {startItem}-{endItem} / {locale === 'ko' ? '전체' : '共'} {totalItems}{locale === 'ko' ? '개' : '条'}
          </span>
          <span className="sm:hidden">
            {currentPage}/{totalPages} {locale === 'ko' ? '페이지' : '页'}
          </span>
        </div>
      )}
      
      {/* 페이지네이션 컨트롤 */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* 이전 페이지 버튼 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            p-2 rounded-lg border transition-colors
            ${currentPage === 1
              ? 'border-gray-200 text-gray-300 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
            }
          `}
          aria-label="이전 페이지"
        >
          <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        
        {/* 페이지 번호들 */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 text-gray-400 dark:text-gray-500">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`
                    min-w-[32px] sm:min-w-[40px] h-8 sm:h-10 px-2 sm:px-3 rounded-lg border transition-colors text-sm sm:text-base
                    ${currentPage === page
                      ? 'bg-blue-500 text-white border-blue-500 dark:bg-blue-600 dark:border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                  `}
                  aria-label={`페이지 ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* 다음 페이지 버튼 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            p-2 rounded-lg border transition-colors
            ${currentPage === totalPages
              ? 'border-gray-200 text-gray-300 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
            }
          `}
          aria-label="다음 페이지"
        >
          <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
      
      {/* 모바일에서 전체 항목 수 표시 */}
      {totalItems && (
        <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
          전체 {totalItems}개
        </div>
      )}
    </div>
  );
}