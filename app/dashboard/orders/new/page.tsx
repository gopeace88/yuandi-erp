// import { OrderForm } from '@/components/forms/order-form'
// import { getProducts } from '@/lib/api/products'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewOrderPage() {
  // const products = await getProducts({ active: true })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          새 주문 생성
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          고객 정보와 상품을 선택하여 새로운 주문을 생성하세요
        </p>
      </div>

      {/* Order Form */}
      <Card>
        <CardHeader>
          <CardTitle>주문 정보 입력</CardTitle>
        </CardHeader>
        <CardContent>
          {/* <OrderForm products={products} /> */}
          <div className="text-center py-8 text-gray-500">
            주문 폼 구현 예정
          </div>
        </CardContent>
      </Card>
    </div>
  )
}