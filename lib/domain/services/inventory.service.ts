import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 재고 이동 타입
 */
export enum InventoryMovementType {
  INBOUND = 'inbound',      // 입고
  SALE = 'sale',            // 판매
  ADJUSTMENT = 'adjustment', // 조정
  DISPOSAL = 'disposal',     // 폐기
  REFUND = 'refund'         // 환불
}

/**
 * 재고 부족 에러
 */
export class InsufficientStockError extends Error {
  constructor(productId: string, requested: number, available: number) {
    super(`Insufficient stock for product ${productId}: requested ${requested}, available ${available}`);
    this.name = 'InsufficientStockError';
  }
}

/**
 * 상품을 찾을 수 없음 에러
 */
export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product not found: ${productId}`);
    this.name = 'ProductNotFoundError';
  }
}

/**
 * 잘못된 수량 에러
 */
export class InvalidQuantityError extends Error {
  constructor(quantity: number, reason?: string) {
    super(`Invalid quantity: ${quantity}${reason ? `. ${reason}` : ''}`);
    this.name = 'InvalidQuantityError';
  }
}

/**
 * 재고 작업 결과
 */
export interface StockOperationResult {
  productId: string;
  previousStock: number;
  newStock: number;
  [key: string]: any;
}

/**
 * 재고 부족 상품 정보
 */
export interface LowStockProduct {
  id: string;
  name: string;
  sku?: string;
  onHand: number;
  lowStockThreshold: number;
  stockShortage: number;
}

/**
 * 재고 관리 도메인 서비스
 * 재고 실시간 검증, 자동 차감/복구, 재고 조정 등을 처리
 */
export class InventoryService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 재고 확인
   * @param productId - 상품 ID
   * @param quantity - 확인할 수량
   * @returns 재고가 충분한지 여부
   */
  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('products')
      .select('id, on_hand')
      .eq('id', productId)
      .single();

    if (error || !data) {
      throw new ProductNotFoundError(productId);
    }

    return data.on_hand >= quantity;
  }

  /**
   * 재고 검증 및 차감 (주문 생성 시)
   * @param productId - 상품 ID
   * @param quantity - 차감할 수량
   * @param orderId - 주문 ID
   * @param userId - 사용자 ID
   * @param useTransaction - 트랜잭션 사용 여부
   * @returns 재고 작업 결과
   */
  async validateAndDeductStock(
    productId: string,
    quantity: number,
    orderId: string,
    userId: string,
    useTransaction: boolean = false
  ): Promise<StockOperationResult> {
    // 수량 검증
    if (quantity < 0) {
      throw new InvalidQuantityError(quantity, 'Quantity must be non-negative');
    }

    if (quantity === 0) {
      const { data } = await this.supabase
        .from('products')
        .select('on_hand')
        .eq('id', productId)
        .single();
      
      return {
        productId,
        previousStock: data?.on_hand || 0,
        newStock: data?.on_hand || 0,
        deducted: 0
      };
    }

    // 트랜잭션 사용 시 RPC 호출
    if (useTransaction) {
      const { data, error } = await this.supabase.rpc('deduct_stock_transaction', {
        p_product_id: productId,
        p_quantity: quantity,
        p_order_id: orderId,
        p_user_id: userId
      });

      if (error) {
        if (error.message.includes('insufficient')) {
          throw new InsufficientStockError(productId, quantity, 0);
        }
        throw error;
      }

      return {
        productId,
        previousStock: data.previous_stock,
        newStock: data.new_stock,
        deducted: quantity
      };
    }

    // 일반 처리 (트랜잭션 없음)
    const { data: product, error: fetchError } = await this.supabase
      .from('products')
      .select('id, on_hand')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new ProductNotFoundError(productId);
    }

    if (product.on_hand < quantity) {
      throw new InsufficientStockError(productId, quantity, product.on_hand);
    }

    // 재고 차감
    const newStock = product.on_hand - quantity;
    const { error: updateError } = await this.supabase
      .from('products')
      .update({ on_hand: newStock })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Failed to update stock: ${updateError.message}`);
    }

    // 재고 이동 기록
    await this.recordMovement(
      productId,
      InventoryMovementType.SALE,
      -quantity,
      product.on_hand,
      newStock,
      orderId,
      userId
    );

    return {
      productId,
      previousStock: product.on_hand,
      newStock,
      deducted: quantity
    };
  }

  /**
   * 재고 복구 (환불 시)
   * @param productId - 상품 ID
   * @param quantity - 복구할 수량
   * @param refundId - 환불 ID
   * @param userId - 사용자 ID
   * @returns 재고 작업 결과
   */
  async restoreStock(
    productId: string,
    quantity: number,
    refundId: string,
    userId: string
  ): Promise<StockOperationResult> {
    if (quantity < 0) {
      throw new InvalidQuantityError(quantity, 'Restore quantity must be non-negative');
    }

    if (quantity === 0) {
      const { data } = await this.supabase
        .from('products')
        .select('on_hand')
        .eq('id', productId)
        .single();
      
      return {
        productId,
        previousStock: data?.on_hand || 0,
        newStock: data?.on_hand || 0,
        restored: 0
      };
    }

    const { data: product, error: fetchError } = await this.supabase
      .from('products')
      .select('id, on_hand')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new ProductNotFoundError(productId);
    }

    // 재고 복구
    const newStock = product.on_hand + quantity;
    const { error: updateError } = await this.supabase
      .from('products')
      .update({ on_hand: newStock })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Failed to restore stock: ${updateError.message}`);
    }

    // 재고 이동 기록
    await this.recordMovement(
      productId,
      InventoryMovementType.REFUND,
      quantity,
      product.on_hand,
      newStock,
      refundId,
      userId
    );

    return {
      productId,
      previousStock: product.on_hand,
      newStock,
      restored: quantity
    };
  }

  /**
   * 재고 조정
   * @param productId - 상품 ID
   * @param newQuantity - 새로운 재고 수량
   * @param reason - 조정 사유
   * @param userId - 사용자 ID
   * @returns 재고 작업 결과
   */
  async adjustStock(
    productId: string,
    newQuantity: number,
    reason: string,
    userId: string
  ): Promise<StockOperationResult> {
    if (newQuantity < 0) {
      throw new InvalidQuantityError(newQuantity, 'Stock cannot be negative');
    }

    const { data: product, error: fetchError } = await this.supabase
      .from('products')
      .select('id, on_hand')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new ProductNotFoundError(productId);
    }

    const adjustment = newQuantity - product.on_hand;

    // 재고 업데이트
    const { error: updateError } = await this.supabase
      .from('products')
      .update({ on_hand: newQuantity })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Failed to adjust stock: ${updateError.message}`);
    }

    // 재고 이동 기록
    await this.recordMovement(
      productId,
      InventoryMovementType.ADJUSTMENT,
      adjustment,
      product.on_hand,
      newQuantity,
      null,
      userId,
      reason
    );

    return {
      productId,
      previousStock: product.on_hand,
      newStock: newQuantity,
      adjustment
    };
  }

  /**
   * 재고 부족 상품 조회
   * @param threshold - 임계값 (기본값: 각 상품의 low_stock_threshold 사용)
   * @returns 재고 부족 상품 목록
   */
  async getLowStockProducts(threshold?: number): Promise<LowStockProduct[]> {
    let query = this.supabase
      .from('products')
      .select('id, name, sku, on_hand, low_stock_threshold');

    if (threshold !== undefined) {
      query = query.lte('on_hand', threshold);
    }

    const { data, error } = await query
      .eq('active', true)
      .order('on_hand', { ascending: true });

    if (error) {
      throw new Error(`Failed to get low stock products: ${error.message}`);
    }

    if (!data) return [];

    // 재고 부족 상품 필터링 및 정보 계산
    return data
      .filter(product => {
        const limit = threshold !== undefined ? threshold : product.low_stock_threshold;
        return product.on_hand <= limit;
      })
      .map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        onHand: product.on_hand,
        lowStockThreshold: threshold !== undefined ? threshold : product.low_stock_threshold,
        stockShortage: (threshold !== undefined ? threshold : product.low_stock_threshold) - product.on_hand
      }));
  }

  /**
   * 입고 기록
   * @param productId - 상품 ID
   * @param quantity - 입고 수량
   * @param unitCost - 단가 (CNY)
   * @param note - 메모
   * @param userId - 사용자 ID
   * @returns 재고 작업 결과
   */
  async recordInbound(
    productId: string,
    quantity: number,
    unitCost: number,
    note: string,
    userId: string
  ): Promise<StockOperationResult & { unitCost: number; addedQuantity: number }> {
    if (quantity <= 0) {
      throw new InvalidQuantityError(quantity, 'Inbound quantity must be positive');
    }

    const { data: product, error: fetchError } = await this.supabase
      .from('products')
      .select('id, on_hand')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new ProductNotFoundError(productId);
    }

    // 재고 증가
    const newStock = product.on_hand + quantity;
    const { error: updateError } = await this.supabase
      .from('products')
      .update({ on_hand: newStock })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Failed to record inbound: ${updateError.message}`);
    }

    // 재고 이동 기록
    await this.recordMovement(
      productId,
      InventoryMovementType.INBOUND,
      quantity,
      product.on_hand,
      newStock,
      null,
      userId,
      note
    );

    return {
      productId,
      previousStock: product.on_hand,
      newStock,
      addedQuantity: quantity,
      unitCost
    };
  }

  /**
   * 재고 이동 기록
   * @private
   */
  private async recordMovement(
    productId: string,
    movementType: InventoryMovementType,
    quantity: number,
    balanceBefore: number,
    balanceAfter: number,
    refId: string | null,
    userId: string,
    note?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('inventory_movements')
      .insert({
        product_id: productId,
        movement_type: movementType,
        quantity,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ref_type: movementType === InventoryMovementType.SALE ? 'order' : 
                  movementType === InventoryMovementType.REFUND ? 'refund' : null,
        ref_id: refId,
        note,
        movement_date: new Date().toISOString(),
        created_by: userId
      });

    if (error) {
      // 로그만 남기고 에러는 던지지 않음 (메인 작업은 이미 완료됨)
      console.error('Failed to record inventory movement:', error);
    }
  }
}