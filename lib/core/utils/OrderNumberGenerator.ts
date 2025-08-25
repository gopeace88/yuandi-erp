/**
 * 주문번호 생성기
 * 패턴: ORD-YYMMDD-###
 * 예시: ORD-241225-001
 * 
 * 특징:
 * - 일별 순번 자동 증가
 * - 한국 시간(UTC+9) 기준
 * - 자정에 순번 리셋
 * - 동시성 처리를 위한 락 메커니즘
 */
export class OrderNumberGenerator {
  private static counters = new Map<string, number>();
  private static locks = new Map<string, Promise<void>>();
  private static readonly PREFIX = 'ORD';
  private static readonly SEPARATOR = '-';
  private static readonly SEQUENCE_DIGITS = 3;
  
  /**
   * 주문번호 생성 (비동기 - DB 연동 가능)
   * @param existingNumbers 오늘 날짜의 기존 주문번호 목록 (중복 방지용)
   * @returns 생성된 주문번호
   */
  static async generate(existingNumbers?: string[]): Promise<string> {
    const dateKey = this.getDateKey();
    
    // 락 대기
    while (this.locks.has(dateKey)) {
      await this.locks.get(dateKey);
    }
    
    // 락 설정
    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    this.locks.set(dateKey, lockPromise);
    
    try {
      // 현재 카운터 가져오기 또는 초기화
      let sequence = this.counters.get(dateKey) || 0;
      
      // 기존 주문번호가 있으면 가장 큰 번호 찾기
      if (existingNumbers && existingNumbers.length > 0) {
        const maxSequence = this.findMaxSequence(existingNumbers, dateKey);
        sequence = Math.max(sequence, maxSequence);
      }
      
      // 다음 순번
      sequence++;
      
      // 카운터 업데이트
      this.counters.set(dateKey, sequence);
      
      // 오래된 카운터 정리
      this.cleanOldCounters(dateKey);
      
      // 주문번호 생성
      const orderNo = this.formatOrderNumber(dateKey, sequence);
      
      return orderNo;
    } finally {
      // 락 해제
      this.locks.delete(dateKey);
      releaseLock!();
    }
  }
  
  /**
   * 동기식 주문번호 생성 (테스트용)
   */
  static generateSync(): string {
    const dateKey = this.getDateKey();
    
    // 현재 카운터 가져오기
    let sequence = this.counters.get(dateKey) || 0;
    sequence++;
    
    // 카운터 업데이트
    this.counters.set(dateKey, sequence);
    
    // 오래된 카운터 정리
    this.cleanOldCounters(dateKey);
    
    return this.formatOrderNumber(dateKey, sequence);
  }
  
  /**
   * 날짜 키 생성 (YYMMDD 형식)
   * 한국 시간(UTC+9) 기준
   */
  private static getDateKey(date?: Date): string {
    const now = date || new Date();
    
    // 한국 시간으로 변환 (UTC+9)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    
    const year = kstDate.getUTCFullYear().toString().slice(2);
    const month = (kstDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = kstDate.getUTCDate().toString().padStart(2, '0');
    
    return `${year}${month}${day}`;
  }
  
  /**
   * 주문번호 포맷팅
   */
  private static formatOrderNumber(dateKey: string, sequence: number): string {
    const sequenceStr = sequence.toString().padStart(this.SEQUENCE_DIGITS, '0');
    return `${this.PREFIX}${this.SEPARATOR}${dateKey}${this.SEPARATOR}${sequenceStr}`;
  }
  
  /**
   * 기존 주문번호에서 최대 순번 찾기
   */
  private static findMaxSequence(orderNumbers: string[], dateKey: string): number {
    let maxSequence = 0;
    const prefix = `${this.PREFIX}${this.SEPARATOR}${dateKey}${this.SEPARATOR}`;
    
    for (const orderNo of orderNumbers) {
      if (orderNo.startsWith(prefix)) {
        const sequenceStr = orderNo.substring(prefix.length);
        const sequence = parseInt(sequenceStr, 10);
        
        if (!isNaN(sequence)) {
          maxSequence = Math.max(maxSequence, sequence);
        }
      }
    }
    
    return maxSequence;
  }
  
  /**
   * 오래된 카운터 정리 (메모리 관리)
   */
  private static cleanOldCounters(currentKey: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.counters.keys()) {
      if (key !== currentKey) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.counters.delete(key);
    }
  }
  
  /**
   * 주문번호 유효성 검증
   */
  static validate(orderNo: string): boolean {
    // 패턴: ORD-YYMMDD-###
    const pattern = /^ORD-\d{6}-\d{3}$/;
    
    if (!pattern.test(orderNo)) {
      return false;
    }
    
    // 날짜 유효성 검증
    const parts = orderNo.split(this.SEPARATOR);
    const dateStr = parts[1];
    
    const year = 2000 + parseInt(dateStr.substring(0, 2), 10);
    const month = parseInt(dateStr.substring(2, 4), 10) - 1;
    const day = parseInt(dateStr.substring(4, 6), 10);
    
    const date = new Date(year, month, day);
    
    return date.getFullYear() === year && 
           date.getMonth() === month && 
           date.getDate() === day;
  }
  
  /**
   * 주문번호 파싱
   */
  static parse(orderNo: string): {
    date: Date;
    sequence: number;
  } | null {
    if (!this.validate(orderNo)) {
      return null;
    }
    
    const parts = orderNo.split(this.SEPARATOR);
    const dateStr = parts[1];
    const sequenceStr = parts[2];
    
    const year = 2000 + parseInt(dateStr.substring(0, 2), 10);
    const month = parseInt(dateStr.substring(2, 4), 10) - 1;
    const day = parseInt(dateStr.substring(4, 6), 10);
    
    return {
      date: new Date(year, month, day),
      sequence: parseInt(sequenceStr, 10)
    };
  }
  
  /**
   * 카운터 리셋 (테스트용)
   */
  static reset(): void {
    this.counters.clear();
    this.locks.clear();
  }
}