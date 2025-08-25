'use client'

import { useEffect } from 'react'

export default function SignOutPage() {
  useEffect(() => {
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('session')
      
      // Clear cookies
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    }
    
    // Redirect to logout API
    window.location.href = '/api/auth/logout'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}