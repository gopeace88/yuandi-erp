/**
 * SKU (Stock Keeping Unit) 생성기
 * 패턴: [카테고리3자]-[모델]-[색상3자]-[브랜드3자]-[해시5자]
 * 예시: ELE-iPhone15-BLA-APP-A1B2C
 */
export class SKUGenerator {
  private static readonly SEPARATOR = '-';
  private static readonly HASH_LENGTH = 5;
  
  /**
   * SKU 생성
   * @param props 상품 정보
   * @returns 생성된 SKU 문자열
   */
  static generate(props: {
    category: string;
    model: string;
    color: string;
    brand: string;
  }): string {
    if (!props.category || !props.model || !props.color || !props.brand) {
      throw new Error('All properties (category, model, color, brand) are required');
    }
    
    const parts = [
      this.normalizeCategory(props.category),
      this.normalizeModel(props.model),
      this.normalizeColor(props.color),
      this.normalizeBrand(props.brand),
      this.generateHash()
    ];
    
    return parts.join(this.SEPARATOR);
  }
  
  /**
   * 카테고리 정규화 (첫 3자, 대문자)
   */
  private static normalizeCategory(category: string): string {
    return category
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, 'X');
  }
  
  /**
   * 모델명 정규화 (공백 제거, 특수문자 제거)
   */
  private static normalizeModel(model: string): string {
    return model
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 20); // 최대 20자
  }
  
  /**
   * 색상 정규화 (첫 3자, 대문자)
   */
  private static normalizeColor(color: string): string {
    return color
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, 'X');
  }
  
  /**
   * 브랜드 정규화 (첫 3자, 대문자)
   */
  private static normalizeBrand(brand: string): string {
    return brand
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, 'X');
  }
  
  /**
   * 고유 해시 생성 (5자)
   */
  private static generateHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let hash = '';
    
    for (let i = 0; i < this.HASH_LENGTH; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return hash;
  }
  
  /**
   * SKU 유효성 검증
   */
  static validate(sku: string): boolean {
    // 패턴: XXX-모델-XXX-XXX-XXXXX
    const pattern = /^[A-Z0-9]{3}-[A-Z0-9가-힣]+-[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{5}$/;
    return pattern.test(sku);
  }
  
  /**
   * SKU 파싱
   */
  static parse(sku: string): {
    category: string;
    model: string;
    color: string;
    brand: string;
    hash: string;
  } | null {
    if (!this.validate(sku)) {
      return null;
    }
    
    const parts = sku.split(this.SEPARATOR);
    
    return {
      category: parts[0],
      model: parts[1],
      color: parts[2],
      brand: parts[3],
      hash: parts[4]
    };
  }
}