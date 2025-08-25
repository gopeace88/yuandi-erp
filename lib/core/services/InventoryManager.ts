import { createClient } from '@supabase/supabase-js';

/**
 * 재고 관리 서비스
 * 
 * 주요 기능:
 * - 재고 검증
 * - 재고 차감 (주문 시)
 * - 재고 복구 (환불 시)
 * - 재고 조정 (입고/조정)
 * - 낮은 재고 알림
 */
export class InventoryManager {
  private supabase: ReturnType<typeof createClient>;
  
  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient;
  }
  
  /**
   * 재고 확인
   * @param productId 상품 ID
   * @param requiredQuantity 필요 수량
   * @returns 재고 충분 여부
   */
  async checkStock(productId: string, requiredQuantity: number): Promise<{
    available: boolean;
    currentStock: number;
    message?: string;
  }> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .select('id, sku, name, on_hand')
        .eq('id', productId)
        .single();
      
      if (error || !product) {
        return {
          available: false,
          currentStock: 0,
          message: `Product not found: ${productId}`
        };
      }
      
      const available = product.on_hand >= requiredQuantity;
      
      return {
        available,
        currentStock: product.on_hand,
        message: available 
          ? undefined 
          : `Insufficient stock for ${product.name}. Required: ${requiredQuantity}, Available: ${product.on_hand}`
      };
    } catch (error) {
      console.error('Error checking stock:', error);
      return {
        available: false,
        currentStock: 0,
        message: 'Error checking stock'
      };
    }
  }
  
  /**
   * 다중 상품 재고 검증
   * @param items 상품 목록
   * @returns 검증 결과
   */
  async validateStock(items: Array<{
    productId: string;
    quantity: number;
  }>): Promise<{
    valid: boolean;
    errors: string[];
    details: Array<{
      productId: string;
      required: number;
      available: number;
      sufficient: boolean;
    }>;
  }> {
    const errors: string[] = [];
    const details: Array<{
      productId: string;
      required: number;
      available: number;
      sufficient: boolean;
    }> = [];
    
    for (const item of items) {
      const result = await this.checkStock(item.productId, item.quantity);
      
      details.push({
        productId: item.productId,
        required: item.quantity,
        available: result.currentStock,
        sufficient: result.available
      });
      
      if (!result.available) {
        errors.push(result.message || 'Insufficient stock');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      details
    };
  }
  
  /**
   * 재고 차감 (트랜잭션)
   * @param items 차감할 상품 목록
   * @returns 차감 결과
   */
  async deductStock(items: Array<{
    productId: string;
    quantity: number;
  }>): Promise<{
    success: boolean;
    message?: string;
    updatedProducts?: Array<{
      productId: string;
      previousStock: number;
      newStock: number;
    }>;
  }> {
    const updatedProducts: Array<{
      productId: string;
      previousStock: number;
      newStock: number;
    }> = [];
    
    try {
      // 먼저 모든 재고 검증
      const validation = await this.validateStock(items);
      
      if (!validation.valid) {
        return {
          success: false,
          message: validation.errors.join('; ')
        };
      }
      
      // 각 상품 재고 차감
      for (const item of items) {
        // 현재 재고 조회
        const { data: product, error: fetchError } = await this.supabase
          .from('products')
          .select('id, on_hand')
          .eq('id', item.productId)
          .single();
        
        if (fetchError || !product) {
          throw new Error(`Failed to fetch product: ${item.productId}`);
        }
        
        const previousStock = product.on_hand;
        const newStock = previousStock - item.quantity;
        
        // 재고 업데이트
        const { error: updateError } = await this.supabase
          .from('products')
          .update({ 
            on_hand: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.productId);
        
        if (updateError) {
          throw new Error(`Failed to update stock for product: ${item.productId}`);
        }
        
        updatedProducts.push({
          productId: item.productId,
          previousStock,
          newStock
        });
        
        // 낮은 재고 체크
        await this.checkLowStock(item.productId, newStock);
      }
      
      return {
        success: true,
        updatedProducts
      };
      
    } catch (error) {
      console.error('Error deducting stock:', error);
      
      // 롤백 시도 (이미 업데이트된 상품들 복구)
      for (const updated of updatedProducts) {
        await this.supabase
          .from('products')
          .update({ on_hand: updated.previousStock })
          .eq('id', updated.productId);
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deduct stock'
      };
    }
  }
  
  /**
   * 재고 복구 (환불 시)
   * @param items 복구할 상품 목록
   * @returns 복구 결과
   */
  async restoreStock(items: Array<{
    productId: string;
    quantity: number;
  }>): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      for (const item of items) {
        // 현재 재고 조회
        const { data: product, error: fetchError } = await this.supabase
          .from('products')
          .select('id, on_hand')
          .eq('id', item.productId)
          .single();
        
        if (fetchError || !product) {
          throw new Error(`Failed to fetch product: ${item.productId}`);
        }
        
        const newStock = product.on_hand + item.quantity;
        
        // 재고 업데이트
        const { error: updateError } = await this.supabase
          .from('products')
          .update({ 
            on_hand: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.productId);
        
        if (updateError) {
          throw new Error(`Failed to restore stock for product: ${item.productId}`);
        }
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error restoring stock:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to restore stock'
      };
    }
  }
  
  /**
   * 재고 조정 (입고, 관리자 조정 등)
   * @param productId 상품 ID
   * @param adjustment 조정 수량 (양수: 증가, 음수: 감소)
   * @param reason 조정 사유
   * @returns 조정 결과
   */
  async adjustStock(
    productId: string, 
    adjustment: number, 
    reason: string
  ): Promise<{
    success: boolean;
    previousStock?: number;
    newStock?: number;
    message?: string;
  }> {
    try {
      // 현재 재고 조회
      const { data: product, error: fetchError } = await this.supabase
        .from('products')
        .select('id, on_hand')
        .eq('id', productId)
        .single();
      
      if (fetchError || !product) {
        return {
          success: false,
          message: `Product not found: ${productId}`
        };
      }
      
      const previousStock = product.on_hand;
      const newStock = Math.max(0, previousStock + adjustment); // 음수 방지
      
      // 재고 업데이트
      const { error: updateError } = await this.supabase
        .from('products')
        .update({ 
          on_hand: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (updateError) {
        return {
          success: false,
          message: 'Failed to adjust stock'
        };
      }
      
      // 이벤트 로그 기록
      await this.logInventoryEvent(productId, previousStock, newStock, reason);
      
      // 낮은 재고 체크
      await this.checkLowStock(productId, newStock);
      
      return {
        success: true,
        previousStock,
        newStock
      };
      
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to adjust stock'
      };
    }
  }
  
  /**
   * 낮은 재고 확인
   * @param productId 상품 ID
   * @param currentStock 현재 재고
   */
  private async checkLowStock(productId: string, currentStock: number): Promise<void> {
    try {
      const { data: product } = await this.supabase
        .from('products')
        .select('low_stock_threshold, name, sku')
        .eq('id', productId)
        .single();
      
      if (product && currentStock <= product.low_stock_threshold) {
        console.warn(`Low stock alert: ${product.name} (${product.sku}) - Current: ${currentStock}, Threshold: ${product.low_stock_threshold}`);
        
        // TODO: 알림 시스템 연동
        // await this.notificationService.sendLowStockAlert(product, currentStock);
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }
  
  /**
   * 재고 이벤트 로그 기록
   */
  private async logInventoryEvent(
    productId: string,
    previousStock: number,
    newStock: number,
    reason: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('event_logs')
        .insert({
          event: 'inventory_adjustment',
          ref_type: 'product',
          ref_id: productId,
          detail: {
            previous_stock: previousStock,
            new_stock: newStock,
            adjustment: newStock - previousStock,
            reason
          }
        });
    } catch (error) {
      console.error('Error logging inventory event:', error);
    }
  }
  
  /**
   * 낮은 재고 상품 목록 조회
   */
  async getLowStockProducts(): Promise<Array<{
    id: string;
    sku: string;
    name: string;
    onHand: number;
    threshold: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('id, sku, name, on_hand, low_stock_threshold')
        .filter('on_hand', 'lte', 'low_stock_threshold')
        .filter('active', 'eq', true)
        .order('on_hand', { ascending: true });
      
      if (error) {
        console.error('Error fetching low stock products:', error);
        return [];
      }
      
      return (data || []).map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        onHand: product.on_hand,
        threshold: product.low_stock_threshold
      }));
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  }
}