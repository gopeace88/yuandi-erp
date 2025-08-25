'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Menu, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/database.types'

interface HeaderProps {
  user: Profile & { email: string }
}

export function Header({ user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const supabase = createClient()
  
  const handleLogout = () => {
    // 로그아웃 API 호출 (GET 지원)
    window.location.href = '/api/auth/logout'
  }
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // 추후 검색 기능 구현
    console.log('Searching for:', searchQuery)
  }
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          
          <form onSubmit={handleSearch} className="ml-4 flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="주문번호, 고객명, 상품명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-700">{user.email}</span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}