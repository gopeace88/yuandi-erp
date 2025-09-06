'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Package,
    ShoppingCart,
    Truck,
    DollarSign,
    BarChart3,
    Settings,
    User,
    Menu,
    X
} from 'lucide-react'

const navigationItems = [
    { name: '대시보드', href: '/dashboard', icon: Home },
    { name: '주문 관리', href: '/dashboard/orders', icon: ShoppingCart },
    { name: '재고 관리', href: '/dashboard/inventory', icon: Package },
    { name: '배송 관리', href: '/dashboard/shipping', icon: Truck },
    { name: '출납장부', href: '/dashboard/cashbook', icon: DollarSign },
    { name: '보고서', href: '/dashboard/reports', icon: BarChart3 },
    { name: '설정', href: '/dashboard/settings', icon: Settings },
]

export function MobileNavigation() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Mobile Navigation Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}>
                    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Navigation Items */}
                        <nav className="p-4 space-y-2">
                            {navigationItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* User Section */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">관리자</p>
                                    <p className="text-xs text-gray-500 truncate">admin@yuandi.com</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// Bottom Navigation for main pages
export function BottomNavigation() {
    const pathname = usePathname()

    const bottomNavItems = [
        { name: '홈', href: '/dashboard', icon: Home },
        { name: '주문', href: '/dashboard/orders', icon: ShoppingCart },
        { name: '재고', href: '/dashboard/inventory', icon: Package },
        { name: '배송', href: '/dashboard/shipping', icon: Truck },
        { name: '더보기', href: '/dashboard/settings', icon: Menu },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-40">
            <div className="flex items-center justify-around">
                {bottomNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'
                                }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className="text-xs mt-1 font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
