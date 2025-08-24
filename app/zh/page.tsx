'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChinesePage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 중국어 설정 저장
      localStorage.setItem('locale', 'zh-CN')
      // 쿠키에도 저장
      document.cookie = `locale=zh-CN; path=/; max-age=${60 * 60 * 24 * 365}`
      // 메인 페이지로 리다이렉트
      router.push('/')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">正在重定向...</p>
      </div>
    </div>
  )
}