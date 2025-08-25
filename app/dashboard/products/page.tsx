'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 상품 관리 페이지는 재고 관리 페이지로 통합됨
export default function ProductsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // 재고 관리 페이지로 리다이렉트
    router.replace('/dashboard/inventory')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to Inventory Management...</p>
      </div>
    </div>
  )
}