/**
 * 도메인 서비스 통합 인덱스
 * 
 * 이 파일은 모든 도메인 서비스를 한 곳에서 import할 수 있도록 제공합니다.
 */

// SKU 서비스
export {
  generateSKU,
  isValidSKU,
  parseSKU,
  type SKUInput
} from './sku.service';

// 주문번호 서비스
export {
  generateOrderNumber,
  formatOrderDate,
  getNextSequenceNumber,
  parseOrderNumber,
  isValidOrderNumber,
  getKoreanDate
} from './order-number.service';

// 재고 관리 서비스
export {
  InventoryService,
  InventoryMovementType,
  InsufficientStockError,
  ProductNotFoundError,
  InvalidQuantityError,
  type StockOperationResult,
  type LowStockProduct
} from './inventory.service';

// PCCC 서비스
export {
  isValidPCCCFormat,
  normalizePCCC,
  maskPCCC,
  validatePCCC,
  getPCCCInfo,
  validatePCCCBatch,
  formatPCCCInput,
  generatePCCCFromRRN,
  type PCCCValidationResult,
  type PCCCInfo
} from './pccc.service';

// 통합 도메인 서비스 클래스
import { SupabaseClient } from '@supabase/supabase-js';
import { InventoryService } from './inventory.service';

/**
 * 통합 도메인 서비스
 * 모든 도메인 로직을 한 곳에서 관리
 */
export class DomainService {
  public inventory: InventoryService;

  constructor(private supabase: SupabaseClient) {
    this.inventory = new InventoryService(supabase);
  }

  /**
   * SKU 생성
   */
  generateSKU(input: import('./sku.service').SKUInput): string {
    return generateSKU(input);
  }

  /**
   * 주문번호 생성
   */
  async generateOrderNumber(date?: Date): Promise<string> {
    return generateOrderNumber(this.supabase, date);
  }

  /**
   * PCCC 검증
   */
  validatePCCC(pccc: string): import('./pccc.service').PCCCValidationResult {
    return validatePCCC(pccc);
  }

  /**
   * 주문 생성 프로세스
   * SKU 생성, 주문번호 생성, 재고 차감을 한 번에 처리
   */
  async createOrderWithValidation(params: {
    productId: string;
    quantity: number;
    customerInfo: {
      name: string;
      phone: string;
      email?: string;
      pccc: string;
      address: string;
      addressDetail?: string;
      zipCode: string;
    };
    userId: string;
  }): Promise<{
    orderNo: string;
    stockResult: import('./inventory.service').StockOperationResult;
    pcccValidation: import('./pccc.service').PCCCValidationResult;
  }> {
    // PCCC 검증
    const pcccValidation = validatePCCC(params.customerInfo.pccc);
    if (!pcccValidation.isValid) {
      throw new Error(`Invalid PCCC: ${pcccValidation.errors.join(', ')}`);
    }

    // 재고 확인 및 차감
    const stockResult = await this.inventory.validateAndDeductStock(
      params.productId,
      params.quantity,
      'temp-order-id', // 실제로는 주문 생성 후 업데이트
      params.userId,
      true // 트랜잭션 사용
    );

    // 주문번호 생성
    const orderNo = await this.generateOrderNumber();

    return {
      orderNo,
      stockResult,
      pcccValidation
    };
  }

  /**
   * 환불 프로세스
   * 재고 복구 처리
   */
  async processRefund(params: {
    orderId: string;
    productId: string;
    quantity: number;
    userId: string;
  }): Promise<import('./inventory.service').StockOperationResult> {
    return await this.inventory.restoreStock(
      params.productId,
      params.quantity,
      params.orderId,
      params.userId
    );
  }

  /**
   * 입고 프로세스
   * 신규 상품 생성 또는 기존 상품 재고 추가
   */
  async processInbound(params: {
    productInfo?: {
      category: string;
      name: string;
      model: string;
      color?: string;
      brand?: string;
    };
    productId?: string;
    quantity: number;
    unitCost: number;
    note: string;
    userId: string;
  }): Promise<{
    sku?: string;
    stockResult: import('./inventory.service').StockOperationResult;
  }> {
    let sku: string | undefined;
    let productId = params.productId;

    // 신규 상품인 경우 SKU 생성
    if (params.productInfo && !productId) {
      sku = this.generateSKU(params.productInfo);
      // 실제로는 여기서 상품을 DB에 생성하고 ID를 받아야 함
      // productId = await this.createProduct({ ...params.productInfo, sku });
    }

    if (!productId) {
      throw new Error('Product ID is required for inbound processing');
    }

    // 재고 입고 처리
    const stockResult = await this.inventory.recordInbound(
      productId,
      params.quantity,
      params.unitCost,
      params.note,
      params.userId
    );

    return {
      sku,
      stockResult
    };
  }

  /**
   * 재고 부족 상품 모니터링
   */
  async monitorLowStock(threshold?: number): Promise<import('./inventory.service').LowStockProduct[]> {
    return await this.inventory.getLowStockProducts(threshold);
  }
}