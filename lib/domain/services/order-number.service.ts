import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 날짜를 YYMMDD 형식으로 포맷
 * @param date - 포맷할 날짜
 * @returns YYMMDD 형식 문자열
 */
export function formatOrderDate(date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}${month}${day}`;
}

/**
 * 다음 시퀀스 번호 가져오기
 * @param supabase - Supabase 클라이언트
 * @param dateString - YYMMDD 형식의 날짜 문자열
 * @returns 다음 시퀀스 번호
 */
export async function getNextSequenceNumber(
  supabase: SupabaseClient,
  dateString: string
): Promise<number> {
  try {
    // 해당 날짜의 마지막 주문 번호 조회
    const { data, error } = await supabase
      .from('orders')
      .select('order_no')
      .like('order_no', `ORD-${dateString}-%`)
      .order('order_no', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to get next sequence number: ${error.message}`);
    }

    // 주문이 없으면 1부터 시작
    if (!data) {
      return 1;
    }

    // 마지막 시퀀스 번호 추출
    const lastSequence = parseInt(data.order_no.split('-')[1], 10);
    
    // 일일 최대 주문 수 체크 (999개)
    if (lastSequence >= 999) {
      throw new Error('Maximum daily order limit reached (999 orders)');
    }

    return lastSequence + 1;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Maximum daily order limit')) {
      throw error;
    }
    throw new Error(`Failed to get next sequence number: ${error}`);
  }
}

/**
 * 주문번호 자동 생성
 * 패턴: ORD-YYMMDD-###
 * 
 * @param supabase - Supabase 클라이언트
 * @param date - 주문 날짜 (선택적, 기본값: 현재 날짜)
 * @param withRetry - 동시성 충돌 시 재시도 여부
 * @returns 생성된 주문 번호
 * 
 * @example
 * generateOrderNumber(supabase)
 * // Returns: "ORD-240823-001"
 */
export async function generateOrderNumber(
  supabase: SupabaseClient,
  date?: Date,
  withRetry: boolean = false
): Promise<string> {
  const orderDate = date || new Date();
  const dateString = formatOrderDate(orderDate);
  
  let sequence: number;
  let attempts = 0;
  const maxAttempts = withRetry ? 3 : 1;
  
  while (attempts < maxAttempts) {
    try {
      sequence = await getNextSequenceNumber(supabase, dateString);
      const orderNo = `${dateString}-${sequence.toString().padStart(3, '0')}`;
      
      // 재시도 로직이 활성화된 경우, 중복 체크를 위한 임시 insert 시도
      if (withRetry && attempts > 0) {
        const { error } = await supabase
          .from('orders')
          .insert({ order_no: orderNo }, { count: 'none' });
        
        if (error && error.code === '23505') { // Duplicate key error
          attempts++;
          continue;
        }
      }
      
      return orderNo;
    } catch (error) {
      if (attempts === maxAttempts - 1) {
        throw error;
      }
      attempts++;
    }
  }
  
  throw new Error('Failed to generate order number after maximum attempts');
}

/**
 * 주문번호 파싱
 * @param orderNo - 파싱할 주문번호
 * @returns 파싱된 정보 또는 null
 */
export function parseOrderNumber(orderNo: string): {
  year: number;
  month: number;
  day: number;
  sequence: number;
  dateString: string;
  fullDate: Date;
} | null {
  if (!orderNo || typeof orderNo !== 'string') {
    return null;
  }

  const pattern = /^(\d{2})(\d{2})(\d{2})-(\d{3})$/;
  const match = orderNo.match(pattern);
  
  if (!match) {
    return null;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const sequence = parseInt(match[4], 10);
  
  // 2000년대와 2100년대 구분 (00-99를 2000-2099로 매핑)
  const fullYear = year >= 0 && year <= 99 ? 2000 + year : year;
  
  return {
    year,
    month,
    day,
    sequence,
    dateString: `${match[1]}${match[2]}${match[3]}`,
    fullDate: new Date(Date.UTC(fullYear, month - 1, day, 0, 0, 0, 0))
  };
}

/**
 * 주문번호 유효성 검증
 * @param orderNo - 검증할 주문번호
 * @returns 유효 여부
 */
export function isValidOrderNumber(orderNo: string): boolean {
  if (!orderNo || typeof orderNo !== 'string') {
    return false;
  }

  const pattern = /^\d{6}-\d{3}$/;
  if (!pattern.test(orderNo)) {
    return false;
  }

  const parsed = parseOrderNumber(orderNo);
  if (!parsed) {
    return false;
  }

  // 월 검증 (1-12)
  if (parsed.month < 1 || parsed.month > 12) {
    return false;
  }

  // 일 검증 (1-31)
  if (parsed.day < 1 || parsed.day > 31) {
    return false;
  }

  // 시퀀스 검증 (1-999)
  if (parsed.sequence < 1 || parsed.sequence > 999) {
    return false;
  }

  return true;
}

/**
 * 한국 시간대(Asia/Seoul) 기준 현재 날짜 가져오기
 * @returns 한국 시간대 기준 Date 객체
 */
export function getKoreanDate(): Date {
  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (kstOffset * 60000));
}