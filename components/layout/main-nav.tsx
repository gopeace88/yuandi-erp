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

const navItems = [
  {
    href: '/',
    label: '대시보드',
    icon: Home,
  },
  {
    href: '/products',
    label: '상품 관리',
    icon: Package,
  },
  {
    href: '/orders',
    label: '주문 관리',
    icon: ShoppingCart,
  },
  {
    href: '/shipments',
    label: '배송 관리',
    icon: Truck,
  },
  {
    href: '/reports',
    label: '리포트',
    icon: BarChart3,
  },
  {
    href: '/customers',
    label: '고객 관리',
    icon: Users,
  },
  {
    href: '/settings',
    label: '설정',
    icon: Settings,
  },
]

export function MainNav() {
  const pathname = usePathname()

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