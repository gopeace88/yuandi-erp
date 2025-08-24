import { Product, generateSKU, validateProduct } from '@/lib/domain/models/product';

describe('Product Domain Model', () => {
  describe('generateSKU', () => {
    it('should generate SKU with correct format', () => {
      const sku = generateSKU({
        category: 'ELEC',
        model: 'iPhone15',
        color: 'Black',
        brand: 'Apple',
      });
      
      expect(sku).toMatch(/^ELEC-iPhone15-Black-Apple-[A-Z0-9]{5}$/);
    });

    it('should handle Korean characters in inputs', () => {
      const sku = generateSKU({
        category: '전자',
        model: '아이폰15',
        color: '검정',
        brand: '애플',
      });
      
      expect(sku).toMatch(/^전자-아이폰15-검정-애플-[A-Z0-9]{5}$/);
    });

    it('should generate unique SKUs for same product', () => {
      const input = {
        category: 'ELEC',
        model: 'iPhone15',
        color: 'Black',
        brand: 'Apple',
      };
      
      const sku1 = generateSKU(input);
      const sku2 = generateSKU(input);
      
      expect(sku1).not.toBe(sku2);
    });
  });

  describe('validateProduct', () => {
    it('should validate required fields', () => {
      const product = {
        category: '',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: 5000,
        onHand: 10,
      };

      const result = validateProduct(product);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category is required');
    });

    it('should validate cost is positive', () => {
      const product = {
        category: 'ELEC',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: -100,
        onHand: 10,
      };

      const result = validateProduct(product);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cost must be positive');
    });

    it('should validate stock is non-negative', () => {
      const product = {
        category: 'ELEC',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: 5000,
        onHand: -5,
      };

      const result = validateProduct(product);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Stock cannot be negative');
    });

    it('should pass validation for valid product', () => {
      const product = {
        category: 'ELEC',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: 5000,
        onHand: 10,
      };

      const result = validateProduct(product);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Product class', () => {
    it('should create product with auto-generated SKU', () => {
      const product = new Product({
        category: 'ELEC',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: 5000,
        onHand: 10,
      });

      expect(product.sku).toMatch(/^ELEC-A3090-Black-Apple-[A-Z0-9]{5}$/);
      expect(product.name).toBe('iPhone 15');
      expect(product.costCNY).toBe(5000);
      expect(product.onHand).toBe(10);
    });

    it('should calculate value correctly', () => {
      const product = new Product({
        category: 'ELEC',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: 5000,
        onHand: 10,
      });

      expect(product.getTotalValue()).toBe(50000);
    });

    it('should check low stock correctly', () => {
      const product = new Product({
        category: 'ELEC',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: 5000,
        onHand: 3,
      });

      expect(product.isLowStock()).toBe(true);
      expect(product.isLowStock(10)).toBe(true);
      expect(product.isLowStock(2)).toBe(false);
    });

    it('should adjust stock correctly', () => {
      const product = new Product({
        category: 'ELEC',
        name: 'iPhone 15',
        model: 'A3090',
        color: 'Black',
        brand: 'Apple',
        costCNY: 5000,
        onHand: 10,
      });

      product.adjustStock(5);
      expect(product.onHand).toBe(15);

      product.adjustStock(-3);
      expect(product.onHand).toBe(12);

      expect(() => product.adjustStock(-20)).toThrow('Insufficient stock');
    });
  });
});