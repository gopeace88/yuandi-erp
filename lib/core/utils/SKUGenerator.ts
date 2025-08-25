/**
 * SKU (Stock Keeping Unit) 생성기
 * 단순화된 패턴: [카테고리4자]-[모델명]-[색상]-[일련번호6자]
 * 예시: ELEC-iPhone15Pro-Black-000001
 */
export class SKUGenerator {
  private static readonly SEPARATOR = '-';
  private static counter = 0;
  
  /**
   * SKU 생성
   * @param props 상품 정보
   * @returns 생성된 SKU 문자열
   */
  static generate(props: {
    category: string;
    model: string;
    color: string;
  }): string {
    if (!props.category || !props.model || !props.color) {
      throw new Error('All properties (category, model, color) are required');
    }
    
    const parts = [
      this.getCategoryCode(props.category),
      this.normalizeModel(props.model),
      this.normalizeColor(props.color),
      this.getSerialNumber()
    ];
    
    return parts.join(this.SEPARATOR);
  }
  
  /**
   * 카테고리 코드 (4자리)
   */
  private static getCategoryCode(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'electronics': 'ELEC',
      'fashion': 'FASH',
      'home': 'HOME',
      'beauty': 'BEAU',
      'food': 'FOOD',
      'sports': 'SPOR',
      'toys': 'TOYS',
      'books': 'BOOK',
      'office': 'OFFI',
      'other': 'OTHR'
    };
    
    return categoryMap[category.toLowerCase()] || 'OTHR';
  }
  
  /**
   * 모델명 정규화 (공백과 특수문자를 제거)
   */
  private static normalizeModel(model: string): string {
    return model
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 30); // 최대 30자
  }
  
  /**
   * 색상 정규화 (공백과 특수문자 제거)
   */
  private static normalizeColor(color: string): string {
    return color
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 20); // 최대 20자
  }
  
  /**
   * 일련번호 생성 (6자리)
   */
  private static getSerialNumber(): string {
    this.counter++;
    return this.counter.toString().padStart(6, '0');
  }
  
  /**
   * SKU 유효성 검증
   */
  static validate(sku: string): boolean {
    // 패턴: XXXX-모델-색상-000000
    const pattern = /^[A-Z]{4}-[A-Za-z0-9가-힣]+-[A-Za-z0-9가-힣]+-\d{6}$/;
    return pattern.test(sku);
  }
  
  /**
   * SKU 파싱
   */
  static parse(sku: string): {
    category: string;
    model: string;
    color: string;
    serial: string;
  } | null {
    const parts = sku.split(this.SEPARATOR);
    
    if (parts.length !== 4) {
      return null;
    }
    
    return {
      category: parts[0],
      model: parts[1],
      color: parts[2],
      serial: parts[3]
    };
  }
  
  /**
   * 카운터 리셋 (테스트용)
   */
  static reset(): void {
    this.counter = 0;
  }
}