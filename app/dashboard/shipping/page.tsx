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

      {/* 배송 통계 */}
      <div className="bg-white px-4 py-2 rounded-lg shadow">
        <div className="flex items-center gap-6 text-sm text-gray-700">
          <span>
            <span className="text-gray-500">배송 대기:</span>
            <span className="ml-2 font-medium">{pending.length}건</span>
          </span>
          <span>
            <span className="text-gray-500">배송 중:</span>
            <span className="ml-2 font-medium">{shipped.length}건</span>
          </span>
          <span>
            <span className="text-gray-500">배송 완료:</span>
            <span className="ml-2 font-medium">{completed.length}건</span>
          </span>
          <span>
            <span className="text-gray-500">오늘 발송:</span>
            <span className="ml-2 font-medium">12건</span>
          </span>
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