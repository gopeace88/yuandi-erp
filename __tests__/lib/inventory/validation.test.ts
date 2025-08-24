// Inventory Validation Tests
// 재고 검증 로직 테스트

interface Product {
  id: string;
  sku: string;
  name: string;
  onHand: number;
  lowStockThreshold: number;
}

interface OrderItem {
  productId: string;
  quantity: number;
}

interface InventoryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  insufficientStock: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
  }>;
}

// Inventory validation functions
class InventoryValidator {
  /**
   * SKU 생성 함수
   * Pattern: [Category]-[Model]-[Color]-[Brand]-[HASH5]
   */
  static generateSKU(
    category: string,
    model: string,
    color: string,
    brand: string
  ): string {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const modelCode = model.substring(0, 4).toUpperCase();
    const colorCode = color.substring(0, 2).toUpperCase();
    const brandCode = brand.substring(0, 3).toUpperCase();
    
    // Generate 5-character hash
    const hashInput = `${category}${model}${color}${brand}${Date.now()}`;
    const hash = this.simpleHash(hashInput).substring(0, 5).toUpperCase();
    
    return `${categoryCode}-${modelCode}-${colorCode}-${brandCode}-${hash}`;
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 재고 가용성 검증
   */
  static validateStockAvailability(
    products: Product[],
    orderItems: OrderItem[]
  ): InventoryValidationResult {
    const result: InventoryValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      insufficientStock: [],
      lowStockProducts: [],
    };

    // Create product map for quick lookup
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));

    // Validate each order item
    for (const item of orderItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        result.isValid = false;
        result.errors.push(`Product not found: ${item.productId}`);
        continue;
      }

      // Check stock availability
      if (product.onHand < item.quantity) {
        result.isValid = false;
        result.insufficientStock.push({
          productId: product.id,
          productName: product.name,
          requested: item.quantity,
          available: product.onHand,
        });
        result.errors.push(
          `Insufficient stock for ${product.name}: requested ${item.quantity}, available ${product.onHand}`
        );
      }

      // Check if stock will be low after order
      const remainingStock = product.onHand - item.quantity;
      if (remainingStock >= 0 && remainingStock <= product.lowStockThreshold) {
        result.lowStockProducts.push({
          productId: product.id,
          productName: product.name,
          currentStock: remainingStock,
          threshold: product.lowStockThreshold,
        });
        result.warnings.push(
          `Low stock warning for ${product.name}: ${remainingStock} units remaining (threshold: ${product.lowStockThreshold})`
        );
      }
    }

    return result;
  }

  /**
   * 재고 조정 검증
   */
  static validateStockAdjustment(
    currentStock: number,
    adjustment: number,
    reason: string
  ): { isValid: boolean; error?: string } {
    // Check for negative final stock
    const finalStock = currentStock + adjustment;
    if (finalStock < 0) {
      return {
        isValid: false,
        error: `Stock cannot be negative. Current: ${currentStock}, Adjustment: ${adjustment}, Result: ${finalStock}`,
      };
    }

    // Validate reason
    if (!reason || reason.trim().length < 3) {
      return {
        isValid: false,
        error: 'Adjustment reason must be at least 3 characters',
      };
    }

    // Check for large adjustments
    const adjustmentPercentage = Math.abs(adjustment / currentStock) * 100;
    if (adjustmentPercentage > 50 && currentStock > 10) {
      return {
        isValid: false,
        error: `Large adjustment (${adjustmentPercentage.toFixed(1)}%) requires supervisor approval`,
      };
    }

    return { isValid: true };
  }

  /**
   * 저재고 상품 확인
   */
  static checkLowStockProducts(products: Product[]): Product[] {
    return products.filter(p => p.onHand <= p.lowStockThreshold);
  }

  /**
   * 재고 회전율 계산
   */
  static calculateInventoryTurnover(
    soldQuantity: number,
    averageInventory: number,
    periodDays: number = 30
  ): number {
    if (averageInventory === 0) return 0;
    
    // Annualize the turnover rate
    const annualizationFactor = 365 / periodDays;
    return (soldQuantity / averageInventory) * annualizationFactor;
  }

  /**
   * 안전 재고 수준 계산
   */
  static calculateSafetyStock(
    averageDailyDemand: number,
    leadTimeDays: number,
    serviceLevelMultiplier: number = 1.65 // 95% service level
  ): number {
    const leadTimeDemand = averageDailyDemand * leadTimeDays;
    const standardDeviation = Math.sqrt(leadTimeDemand * 0.3); // Assuming 30% variability
    return Math.ceil(serviceLevelMultiplier * standardDeviation);
  }

  /**
   * 재주문점 계산
   */
  static calculateReorderPoint(
    averageDailyDemand: number,
    leadTimeDays: number,
    safetyStock: number
  ): number {
    return Math.ceil(averageDailyDemand * leadTimeDays + safetyStock);
  }
}

describe('Inventory Validation', () => {
  describe('SKU Generation', () => {
    it('should generate SKU with correct format', () => {
      const sku = InventoryValidator.generateSKU(
        'Electronics',
        'iPhone15',
        'Black',
        'Apple'
      );

      expect(sku).toMatch(/^[A-Z]{3}-[A-Z]{4}-[A-Z]{2}-[A-Z]{3}-[A-Z0-9]{5}$/);
      expect(sku.startsWith('ELE-IPHO-BL-APP-')).toBe(true);
    });

    it('should generate unique SKUs for different products', () => {
      const sku1 = InventoryValidator.generateSKU('Phone', 'Galaxy', 'White', 'Samsung');
      const sku2 = InventoryValidator.generateSKU('Phone', 'Galaxy', 'Black', 'Samsung');
      
      expect(sku1).not.toBe(sku2);
    });

    it('should handle short input values', () => {
      const sku = InventoryValidator.generateSKU('TV', 'X1', 'R', 'LG');
      
      expect(sku).toMatch(/^[A-Z]{2,3}-[A-Z]{2,4}-[A-Z]{1,2}-[A-Z]{2,3}-[A-Z0-9]{5}$/);
    });
  });

  describe('Stock Availability Validation', () => {
    const mockProducts: Product[] = [
      { id: 'p1', sku: 'SKU-001', name: 'Product 1', onHand: 100, lowStockThreshold: 10 },
      { id: 'p2', sku: 'SKU-002', name: 'Product 2', onHand: 5, lowStockThreshold: 10 },
      { id: 'p3', sku: 'SKU-003', name: 'Product 3', onHand: 0, lowStockThreshold: 5 },
    ];

    it('should validate sufficient stock', () => {
      const orderItems: OrderItem[] = [
        { productId: 'p1', quantity: 50 },
      ];

      const result = InventoryValidator.validateStockAvailability(mockProducts, orderItems);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.insufficientStock).toHaveLength(0);
    });

    it('should detect insufficient stock', () => {
      const orderItems: OrderItem[] = [
        { productId: 'p1', quantity: 150 },
      ];

      const result = InventoryValidator.validateStockAvailability(mockProducts, orderItems);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.insufficientStock).toHaveLength(1);
      expect(result.insufficientStock[0]).toEqual({
        productId: 'p1',
        productName: 'Product 1',
        requested: 150,
        available: 100,
      });
    });

    it('should detect low stock warnings', () => {
      const orderItems: OrderItem[] = [
        { productId: 'p1', quantity: 95 },
      ];

      const result = InventoryValidator.validateStockAvailability(mockProducts, orderItems);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.lowStockProducts).toHaveLength(1);
      expect(result.lowStockProducts[0].currentStock).toBe(5);
    });

    it('should handle product not found', () => {
      const orderItems: OrderItem[] = [
        { productId: 'p999', quantity: 10 },
      ];

      const result = InventoryValidator.validateStockAvailability(mockProducts, orderItems);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Product not found');
    });

    it('should validate multiple order items', () => {
      const orderItems: OrderItem[] = [
        { productId: 'p1', quantity: 50 },
        { productId: 'p2', quantity: 3 },
        { productId: 'p3', quantity: 1 },
      ];

      const result = InventoryValidator.validateStockAvailability(mockProducts, orderItems);

      expect(result.isValid).toBe(false); // p3 has 0 stock
      expect(result.errors).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0); // p2 will have low stock
    });

    it('should handle zero quantity orders', () => {
      const orderItems: OrderItem[] = [
        { productId: 'p1', quantity: 0 },
      ];

      const result = InventoryValidator.validateStockAvailability(mockProducts, orderItems);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Stock Adjustment Validation', () => {
    it('should allow valid positive adjustment', () => {
      const result = InventoryValidator.validateStockAdjustment(100, 50, 'Inbound shipment');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow valid negative adjustment', () => {
      const result = InventoryValidator.validateStockAdjustment(100, -30, 'Damaged goods');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject adjustment resulting in negative stock', () => {
      const result = InventoryValidator.validateStockAdjustment(10, -15, 'Write-off');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Stock cannot be negative');
    });

    it('should reject adjustment without reason', () => {
      const result = InventoryValidator.validateStockAdjustment(100, 50, '');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reason must be at least 3 characters');
    });

    it('should reject large adjustments without approval', () => {
      const result = InventoryValidator.validateStockAdjustment(100, -60, 'Large write-off');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Large adjustment');
      expect(result.error).toContain('supervisor approval');
    });

    it('should allow large adjustments for low stock', () => {
      const result = InventoryValidator.validateStockAdjustment(5, -4, 'Final sale');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Low Stock Detection', () => {
    it('should identify low stock products', () => {
      const products: Product[] = [
        { id: 'p1', sku: 'SKU-001', name: 'Product 1', onHand: 5, lowStockThreshold: 10 },
        { id: 'p2', sku: 'SKU-002', name: 'Product 2', onHand: 15, lowStockThreshold: 10 },
        { id: 'p3', sku: 'SKU-003', name: 'Product 3', onHand: 10, lowStockThreshold: 10 },
      ];

      const lowStock = InventoryValidator.checkLowStockProducts(products);

      expect(lowStock).toHaveLength(2);
      expect(lowStock.map(p => p.id)).toEqual(['p1', 'p3']);
    });

    it('should return empty array when no low stock', () => {
      const products: Product[] = [
        { id: 'p1', sku: 'SKU-001', name: 'Product 1', onHand: 100, lowStockThreshold: 10 },
      ];

      const lowStock = InventoryValidator.checkLowStockProducts(products);

      expect(lowStock).toHaveLength(0);
    });
  });

  describe('Inventory Metrics', () => {
    it('should calculate inventory turnover', () => {
      const turnover = InventoryValidator.calculateInventoryTurnover(300, 100, 30);
      
      // (300/100) * (365/30) = 3 * 12.17 = 36.5
      expect(turnover).toBeCloseTo(36.5, 1);
    });

    it('should handle zero average inventory', () => {
      const turnover = InventoryValidator.calculateInventoryTurnover(100, 0, 30);
      
      expect(turnover).toBe(0);
    });

    it('should calculate safety stock', () => {
      const safetyStock = InventoryValidator.calculateSafetyStock(10, 7, 1.65);
      
      expect(safetyStock).toBeGreaterThan(0);
      expect(Number.isInteger(safetyStock)).toBe(true);
    });

    it('should calculate reorder point', () => {
      const reorderPoint = InventoryValidator.calculateReorderPoint(10, 7, 20);
      
      expect(reorderPoint).toBe(90); // (10 * 7) + 20
    });

    it('should handle zero demand for reorder point', () => {
      const reorderPoint = InventoryValidator.calculateReorderPoint(0, 7, 10);
      
      expect(reorderPoint).toBe(10);
    });
  });
});

export { InventoryValidator };