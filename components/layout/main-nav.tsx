'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Settings,
  Users,
  Home,
} from 'lucide-react'

export function MainNav() {
  const pathname = usePathname()
  
  // Extract locale from pathname
  const currentLocale = pathname.split('/')[1] || 'ko'
  
  const navItems = [
    {
      href: `/${currentLocale}/dashboard`,
      label: currentLocale === 'ko' ? '대시보드' : '仪表板',
      icon: Home,
    },
    {
      href: `/${currentLocale}/inventory`,
      label: currentLocale === 'ko' ? '재고 관리' : '库存管理',
      icon: Package,
    },
    {
      href: `/${currentLocale}/orders`,
      label: currentLocale === 'ko' ? '주문 관리' : '订单管理',
      icon: ShoppingCart,
    },
    {
      href: `/${currentLocale}/shipments`,
      label: currentLocale === 'ko' ? '배송 관리' : '配送管理',
      icon: Truck,
    },
    {
      href: `/${currentLocale}/cashbook`,
      label: currentLocale === 'ko' ? '출납장부' : '出纳簿',
      icon: BarChart3,
    },
    {
      href: `/${currentLocale}/settings`,
      label: currentLocale === 'ko' ? '설정' : '设置',
      icon: Settings,
    },
  ]

  return (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}