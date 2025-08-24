'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutPage() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(true)

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        // 세션 정리
        if (typeof window !== 'undefined') {
          // 로컬 스토리지 정리
          localStorage.removeItem('user')
          localStorage.removeItem('session')
          
          // 쿠키 정리
          document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        }

        // 로그아웃 API 호출
        try {
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          if (!response.ok) {
            console.log('Logout API call failed, but continuing with client-side logout')
          }
        } catch (error) {
          console.log('Logout API call failed, but continuing with client-side logout')
        }

        setIsSigningOut(false)
        
        // 잠시 대기 후 메인 페이지로 리디렉션
        setTimeout(() => {
          router.push('/')
        }, 2000)

      } catch (error) {
        console.error('로그아웃 중 오류 발생:', error)
        setIsSigningOut(false)
        // 오류가 발생해도 메인 페이지로 리디렉션
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }

    handleSignOut()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Y</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            YUANDI
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Collection 관리 시스템
          </p>
        </div>

        <div className="text-center">
          {isSigningOut ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">
                로그아웃 중...
              </p>
            </>
          ) : (
            <>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                로그아웃이 완료되었습니다.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                잠시 후 메인 페이지로 이동합니다...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}