import { SKUGenerator } from '../utils/SKUGenerator';

describe('SKUGenerator', () => {
  describe('generate', () => {
    it('should generate valid SKU with correct pattern', () => {
      const sku = SKUGenerator.generate({
        category: 'Electronics',
        model: 'iPhone15',
        color: 'Black',
        brand: 'Apple'
      });
      
      // 패턴 검증: XXX-모델-XXX-XXX-XXXXX
      expect(sku).toMatch(/^ELE-iPhone15-BLA-APP-[A-Z0-9]{5}$/);
    });
    
    it('should handle Korean characters', () => {
      const sku = SKUGenerator.generate({
        category: '전자',
        model: '갤럭시S24',
        color: '검정',
        brand: '삼성'
      });
      
      expect(sku).toMatch(/^전자-갤럭시S24-검정-삼성-[A-Z0-9]{5}$/);
    });
    
    it('should normalize short inputs with padding', () => {
      const sku = SKUGenerator.generate({
        category: 'TV',
        model: 'OLED55',
        color: 'BK',
        brand: 'LG'
      });
      
      expect(sku).toMatch(/^TVX-OLED55-BKX-LGX-[A-Z0-9]{5}$/);
    });
    
    it('should truncate long inputs', () => {
      const sku = SKUGenerator.generate({
        category: 'ElectronicsAndAppliances',
        model: 'SuperLongModelNameThatExceedsTwentyCharacters',
        color: 'BlackMatte',
        brand: 'Samsung'
      });
      
      expect(sku).toMatch(/^ELE-SuperLongModelNameT-BLA-SAM-[A-Z0-9]{5}$/);
    });
    
    it('should remove special characters', () => {
      const sku = SKUGenerator.generate({
        category: 'E@lec#tro!nics',
        model: 'iPhone-15-Pro',
        color: 'Space Gray',
        brand: 'App*le'
      });
      
      expect(sku).toMatch(/^ELE-iPhone15Pro-SPA-APP-[A-Z0-9]{5}$/);
    });
    
    it('should throw error for missing required fields', () => {
      expect(() => {
        SKUGenerator.generate({
          category: '',
          model: 'iPhone15',
          color: 'Black',
          brand: 'Apple'
        });
      }).toThrow('All properties (category, model, color, brand) are required');
      
      expect(() => {
        SKUGenerator.generate({
          category: 'Electronics',
          model: '',
          color: 'Black',
          brand: 'Apple'
        });
      }).toThrow('All properties (category, model, color, brand) are required');
    });
    
    it('should generate unique SKUs for same product', () => {
      const props = {
        category: 'Electronics',
        model: 'iPhone15',
        color: 'Black',
        brand: 'Apple'
      };
      
      const sku1 = SKUGenerator.generate(props);
      const sku2 = SKUGenerator.generate(props);
      
      // 같은 prefix를 가지지만 다른 hash
      expect(sku1.substring(0, 23)).toBe(sku2.substring(0, 23));
      expect(sku1.substring(24)).not.toBe(sku2.substring(24));
    });
  });
  
  describe('validate', () => {
    it('should validate correct SKU format', () => {
      expect(SKUGenerator.validate('ELE-iPhone15-BLA-APP-A1B2C')).toBe(true);
      expect(SKUGenerator.validate('TVX-OLED55-BKX-LGX-12345')).toBe(true);
    });
    
    it('should reject invalid SKU format', () => {
      expect(SKUGenerator.validate('INVALID')).toBe(false);
      expect(SKUGenerator.validate('ELE-iPhone15-BLA-APP')).toBe(false); // Missing hash
      expect(SKUGenerator.validate('ELE-iPhone15-BLA-APP-A1B2')).toBe(false); // Short hash
      expect(SKUGenerator.validate('ele-iPhone15-bla-app-a1b2c')).toBe(false); // Lowercase
    });
  });
  
  describe('parse', () => {
    it('should parse valid SKU correctly', () => {
      const sku = 'ELE-iPhone15-BLA-APP-A1B2C';
      const parsed = SKUGenerator.parse(sku);
      
      expect(parsed).toEqual({
        category: 'ELE',
        model: 'iPhone15',
        color: 'BLA',
        brand: 'APP',
        hash: 'A1B2C'
      });
    });
    
    it('should return null for invalid SKU', () => {
      expect(SKUGenerator.parse('INVALID')).toBeNull();
      expect(SKUGenerator.parse('')).toBeNull();
    });
  });
});