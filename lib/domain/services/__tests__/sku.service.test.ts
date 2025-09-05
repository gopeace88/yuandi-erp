import { generateSKU } from '../sku.service';

describe('SKU Service', () => {
  describe('generateSKU', () => {
    it('should generate SKU with all required components', () => {
      const sku = generateSKU({
        category: 'ELEC',
        model: 'iPhone15',
        color: 'Black',
        brand: 'Apple'
      });

      // SKU 형식: [카테고리]-[모델]-[색상]-[브랜드]-[HASH5]
      const parts = sku.split('-');
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe('ELEC');
      expect(parts[1]).toBe('iPhone15');
      expect(parts[2]).toBe('Black');
      expect(parts[3]).toBe('Apple');
      expect(parts[4]).toMatch(/^[A-Z0-9]{5}$/); // 5자리 해시
    });

    it('should handle Korean characters correctly', () => {
      const sku = generateSKU({
        category: '전자',
        model: '아이폰15',
        color: '검정',
        brand: '애플'
      });

      const parts = sku.split('-');
      expect(parts).toHaveLength(5);
      expect(parts[4]).toMatch(/^[A-Z0-9]{5}$/);
    });

    it('should handle missing optional fields', () => {
      const sku = generateSKU({
        category: 'CLOTH',
        model: 'TShirt',
        brand: 'Nike'
      });

      const parts = sku.split('-');
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe('CLOTH');
      expect(parts[1]).toBe('TShirt');
      expect(parts[2]).toBe(''); // 색상 없음
      expect(parts[3]).toBe('Nike');
      expect(parts[4]).toMatch(/^[A-Z0-9]{5}$/);
    });

    it('should sanitize special characters', () => {
      const sku = generateSKU({
        category: 'ELEC/PHONE',
        model: 'iPhone-15-Pro',
        color: 'Space_Gray',
        brand: 'Apple@Inc'
      });

      const parts = sku.split('-');
      expect(parts[0]).toBe('ELECPHONE');
      expect(parts[1]).toBe('iPhone15Pro');
      expect(parts[2]).toBe('SpaceGray');
      expect(parts[3]).toBe('AppleInc');
    });

    it('should generate unique hash for same inputs', () => {
      const sku1 = generateSKU({
        category: 'ELEC',
        model: 'iPhone15',
        color: 'Black',
        brand: 'Apple'
      });

      const sku2 = generateSKU({
        category: 'ELEC',
        model: 'iPhone15',
        color: 'Black',
        brand: 'Apple'
      });

      // 같은 입력이라도 다른 해시를 생성
      expect(sku1).not.toBe(sku2);
      expect(sku1.slice(0, -6)).toBe(sku2.slice(0, -6)); // 해시 제외한 부분은 동일
    });

    it('should handle empty strings gracefully', () => {
      const sku = generateSKU({
        category: 'MISC',
        model: '',
        color: '',
        brand: ''
      });

      const parts = sku.split('-');
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe('MISC');
      expect(parts[1]).toBe('');
      expect(parts[2]).toBe('');
      expect(parts[3]).toBe('');
      expect(parts[4]).toMatch(/^[A-Z0-9]{5}$/);
    });

    it('should truncate very long inputs', () => {
      const longString = 'VeryLongModelNameThatExceedsNormalLength';
      const sku = generateSKU({
        category: longString,
        model: longString,
        color: longString,
        brand: longString
      });

      const parts = sku.split('-');
      // 각 부분이 적절한 길이로 제한되어야 함
      expect(parts[0].length).toBeLessThanOrEqual(20);
      expect(parts[1].length).toBeLessThanOrEqual(30);
      expect(parts[2].length).toBeLessThanOrEqual(20);
      expect(parts[3].length).toBeLessThanOrEqual(20);
    });
  });
});