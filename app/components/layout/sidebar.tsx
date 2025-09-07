'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  Users, 
  FileText, 
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[] // 접근 가능한 역할
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: '대시보드',
    icon: LayoutDashboard,
    roles: ['admin', 'order_manager', 'ship_manager']
  },
  {
    href: '/orders',
    label: '주문 관리',
    icon: ShoppingCart,
    roles: ['admin', 'order_manager']
  },
  {
    href: '/inventory',
    label: '재고 관리',
    icon: Package,
    roles: ['admin', 'order_manager']
  },
  {
    href: '/shipping',
    label: '배송 관리',
    icon: Truck,
    roles: ['admin', 'ship_manager']
  },
  {
    href: '/customers',
    label: '고객 관리',
    icon: Users,
    roles: ['admin', 'order_manager']
  },
  {
    href: '/reports',
    label: '리포트',
    icon: FileText,
    roles: ['admin']
  },
  {
    href: '/logs',
    label: '작업 로그',
    icon: Activity,
    roles: ['admin']
  },
  {
    href: '/settings',
    label: '설정',
    icon: Settings,
    roles: ['admin']
  }
]

interface SidebarProps {
  userRole?: string
  userName?: string
  userEmail?: string
}

export function Sidebar({ userRole = 'admin', userName = 'admin User', userEmail = 'admin@example.com' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  // 사용자 권한에 따라 접근 가능한 메뉴 필터링
  const accessibleItems = NAV_ITEMS.filter(item => 
    !item.roles || item.roles.includes(userRole)
  )

  const handleLogout = () => {
    // 로그아웃 로직
    console.log('로그아웃')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* 로고 */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Y</span>
          </div>
          {!isCollapsed && (
            <div>
              <div className="font-bold text-gray-900">YUANDI</div>
              <div className="text-xs text-gray-500">Collection Management</div>
            </div>
          )}
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {accessibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 사용자 정보 */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-600">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {userName}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {userRole}
              </div>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        )}
      </div>

      {/* 축소/확대 버튼 (데스크톱만) */}
      <div className="hidden lg:block border-t p-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* 모바일 햄버거 메뉴 버튼 */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* 모바일 오버레이 */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 데스크톱 사이드바 */}
      <div 
        className={`
          hidden lg:flex flex-col bg-white border-r h-screen transition-all duration-300
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        <SidebarContent />
      </div>

      {/* 모바일 사이드바 */}
      <div 
        className={`
          lg:hidden fixed left-0 top-0 h-full w-64 bg-white border-r z-50 transform transition-transform
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
            <div>
              <div className="font-bold text-gray-900">YUANDI</div>
              <div className="text-xs text-gray-500">Collection Management</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}