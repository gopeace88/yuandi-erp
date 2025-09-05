import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Order 관련 타입 정의
export interface Order {
  id: string
  orderNumber: string
  customerId: string
  status: OrderStatus
  totalAmount: number
  paymentMethod?: string
  paymentDate?: Date
  shippingAddress: ShippingAddress
  pccc: string
  notes?: string
  items: OrderItem[]
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface ShippingAddress {
  address: string
  addressDetail?: string
  zipCode: string
  recipient: string
  phone: string
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DONE = 'DONE',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

export interface CreateOrderDto {
  customerId: string
  items: CreateOrderItemDto[]
  shippingAddress: ShippingAddress
  pccc: string
  paymentMethod: string
  notes?: string
}

export interface CreateOrderItemDto {
  productId: string
  quantity: number
}

export interface UpdateOrderDto {
  status?: OrderStatus
  shippingAddress?: ShippingAddress
  notes?: string
}

export interface OrderFilter {
  status?: OrderStatus
  customerId?: string
  startDate?: Date
  endDate?: Date
  search?: string
}

export interface OrderStatistics {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  statusDistribution: Record<OrderStatus, number>
  topProducts: Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
  }>
}

export class OrderService {
  private supabase: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * 주문 생성
   */
  async createOrder(dto: CreateOrderDto, userId: string): Promise<Order> {
    // 트랜잭션 시작
    const { data: order, error: orderError } = await this.supabase.rpc('create_order_transaction', {
      p_customer_id: dto.customerId,
      p_shipping_address: dto.shippingAddress,
      p_pccc: dto.pccc,
      p_payment_method: dto.paymentMethod,
      p_notes: dto.notes,
      p_items: dto.items,
      p_created_by: userId
    })

    if (orderError) {
      throw new Error(`주문 생성 실패: ${orderError.message}`)
    }

    // 재고 확인 및 차감
    for (const item of dto.items) {
      const { error: stockError } = await this.supabase.rpc('update_inventory_for_order', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
        p_order_id: order.id
      })

      if (stockError) {
        // 롤백 처리
        await this.cancelOrder(order.id, userId)
        throw new Error(`재고 부족: ${stockError.message}`)
      }
    }

    // 주문 알림 발송 (옵션)
    await this.sendOrderNotification(order)

    return order
  }

  /**
   * 주문 조회
   */
  async getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        items:order_items(*),
        shipment:shipments(*)
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      throw new Error(`주문 조회 실패: ${error.message}`)
    }

    return data
  }

  /**
   * 주문 목록 조회
   */
  async getOrders(filter: OrderFilter, page = 1, limit = 20): Promise<{
    orders: Order[]
    total: number
    page: number
    totalPages: number
  }> {
    let query = this.supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name, phone, email),
        items:order_items(count)
      `, { count: 'exact' })

    // 필터 적용
    if (filter.status) {
      query = query.eq('status', filter.status)
    }
    if (filter.customerId) {
      query = query.eq('customer_id', filter.customerId)
    }
    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate.toISOString())
    }
    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate.toISOString())
    }
    if (filter.search) {
      query = query.or(`order_number.ilike.%${filter.search}%,customer_name.ilike.%${filter.search}%`)
    }

    // 페이지네이션
    const offset = (page - 1) * limit
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`주문 목록 조회 실패: ${error.message}`)
    }

    return {
      orders: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }

  /**
   * 주문 상태 변경
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string): Promise<Order> {
    // 상태 전이 유효성 검증
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.REFUNDED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DONE, OrderStatus.REFUNDED],
      [OrderStatus.DONE]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.CANCELLED]: []
    }

    const { data: currentOrder, error: fetchError } = await this.supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      throw new Error(`주문 조회 실패: ${fetchError.message}`)
    }

    const currentStatus = currentOrder.status as OrderStatus
    if (!validTransitions[currentStatus].includes(status)) {
      throw new Error(`유효하지 않은 상태 전환: ${currentStatus} → ${status}`)
    }

    // 상태 업데이트
    const { data, error } = await this.supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      throw new Error(`주문 상태 변경 실패: ${error.message}`)
    }

    // 상태별 후처리
    await this.handleStatusChange(orderId, status, userId)

    return data
  }

  /**
   * 주문 취소
   */
  async cancelOrder(orderId: string, userId: string, reason?: string): Promise<void> {
    const order = await this.getOrder(orderId)
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다')
    }

    // 취소 가능 상태 확인
    if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
      throw new Error('취소할 수 없는 주문 상태입니다')
    }

    // 재고 복구
    for (const item of order.items) {
      await this.supabase.rpc('restore_inventory', {
        p_product_id: item.productId,
        p_quantity: item.quantity
      })
    }

    // 주문 취소 처리
    await this.updateOrderStatus(orderId, OrderStatus.CANCELLED, userId)

    // 취소 사유 기록
    if (reason) {
      await this.supabase
        .from('order_cancellations')
        .insert({
          order_id: orderId,
          reason,
          cancelled_by: userId,
          cancelled_at: new Date().toISOString()
        })
    }
  }

  /**
   * 주문 환불 처리
   */
  async refundOrder(orderId: string, amount: number, reason: string, userId: string): Promise<void> {
    const order = await this.getOrder(orderId)
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다')
    }

    // 환불 가능 상태 확인
    if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DONE].includes(order.status)) {
      throw new Error('환불할 수 없는 주문 상태입니다')
    }

    // 환불 금액 유효성 검증
    if (amount > order.totalAmount) {
      throw new Error('환불 금액이 주문 금액을 초과합니다')
    }

    // 환불 처리
    const { error } = await this.supabase
      .from('refunds')
      .insert({
        order_id: orderId,
        amount,
        reason,
        status: 'PENDING',
        requested_by: userId,
        requested_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`환불 처리 실패: ${error.message}`)
    }

    // 주문 상태 변경
    await this.updateOrderStatus(orderId, OrderStatus.REFUNDED, userId)

    // 재고 복구 (필요시)
    if (order.status === OrderStatus.PAID) {
      for (const item of order.items) {
        await this.supabase.rpc('restore_inventory', {
          p_product_id: item.productId,
          p_quantity: item.quantity
        })
      }
    }
  }

  /**
   * 주문 통계 조회
   */
  async getOrderStatistics(startDate: Date, endDate: Date): Promise<OrderStatistics> {
    // 기간별 주문 통계
    const { data: stats, error: statsError } = await this.supabase
      .rpc('get_order_statistics', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (statsError) {
      throw new Error(`통계 조회 실패: ${statsError.message}`)
    }

    // 상태별 분포
    const { data: distribution, error: distError } = await this.supabase
      .from('orders')
      .select('status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (distError) {
      throw new Error(`상태 분포 조회 실패: ${distError.message}`)
    }

    const statusDistribution = distribution.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<OrderStatus, number>)

    // 인기 상품
    const { data: topProducts, error: topError } = await this.supabase
      .rpc('get_top_products', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_limit: 10
      })

    if (topError) {
      throw new Error(`인기 상품 조회 실패: ${topError.message}`)
    }

    return {
      totalOrders: stats.total_orders,
      totalRevenue: stats.total_revenue,
      averageOrderValue: stats.average_order_value,
      statusDistribution,
      topProducts
    }
  }

  /**
   * 대량 주문 처리
   */
  async bulkCreateOrders(orders: CreateOrderDto[], userId: string): Promise<{
    success: Order[]
    failed: Array<{ order: CreateOrderDto; error: string }>
  }> {
    const success: Order[] = []
    const failed: Array<{ order: CreateOrderDto; error: string }> = []

    for (const orderDto of orders) {
      try {
        const order = await this.createOrder(orderDto, userId)
        success.push(order)
      } catch (error) {
        failed.push({
          order: orderDto,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    return { success, failed }
  }

  /**
   * 상태 변경 후처리
   */
  private async handleStatusChange(orderId: string, status: OrderStatus, userId: string): Promise<void> {
    switch (status) {
      case OrderStatus.PAID:
        // 결제 완료 처리
        await this.recordPayment(orderId)
        break
      
      case OrderStatus.SHIPPED:
        // 배송 시작 알림
        await this.notifyShipmentStart(orderId)
        break
      
      case OrderStatus.DONE:
        // 주문 완료 처리
        await this.completeOrder(orderId)
        break
      
      case OrderStatus.REFUNDED:
        // 환불 완료 처리
        await this.processRefund(orderId)
        break
    }

    // 이벤트 로그 기록
    await this.supabase
      .from('event_log')
      .insert({
        event_type: 'ORDER_STATUS_CHANGE',
        entity_type: 'orders',
        entity_id: orderId,
        actor_id: userId,
        metadata: { new_status: status },
        created_at: new Date().toISOString()
      })
  }

  // 헬퍼 메서드들
  private async sendOrderNotification(order: Order): Promise<void> {
    // 주문 알림 발송 로직
    console.log(`Order notification sent for ${order.orderNumber}`)
  }

  private async recordPayment(orderId: string): Promise<void> {
    // 결제 기록 로직
    console.log(`Payment recorded for order ${orderId}`)
  }

  private async notifyShipmentStart(orderId: string): Promise<void> {
    // 배송 시작 알림 로직
    console.log(`Shipment notification sent for order ${orderId}`)
  }

  private async completeOrder(orderId: string): Promise<void> {
    // 주문 완료 처리 로직
    console.log(`Order ${orderId} completed`)
  }

  private async processRefund(orderId: string): Promise<void> {
    // 환불 처리 로직
    console.log(`Refund processed for order ${orderId}`)
  }
}