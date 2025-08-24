import { Suspense } from 'react'
import { Truck, Package, Clock, CheckCircle } from 'lucide-react'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { ShippingTable } from '@/components/tables/shipping-table'
// import { getShippingOrders } from '@/lib/api/shipping'

export default async function ShippingPage() {
  // const { pending, shipped, completed } = await getShippingOrders()
  const pending: any[] = []
  const shipped: any[] = []
  const completed: any[] = []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          배송 관리
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          주문 배송 상태를 관리하고 송장을 등록하세요
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                배송 대기
              </p>
              <p className="text-2xl font-bold">{pending.length}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                배송 중
              </p>
              <p className="text-2xl font-bold">{shipped.length}</p>
            </div>
            <Truck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                배송 완료
              </p>
              <p className="text-2xl font-bold">{completed.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                오늘 발송
              </p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs for Different Status */}
      <div className="rounded-lg border bg-card p-6">
        <div className="text-center py-8 text-gray-500">
          배송 관리 테이블 구현 예정
        </div>
      </div>
    </div>
  )
}