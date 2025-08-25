import { createClient } from '@supabase/supabase-js';

/**
 * 출납장부 서비스
 * 
 * 주요 기능:
 * - 거래 자동 기록 (매출, 입고, 배송비, 환불, 조정)
 * - 환율 적용 (CNY ↔ KRW)
 * - 일별/월별 정산
 * - 현금 흐름 분석
 */

export type TransactionType = 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund';
export type Currency = 'CNY' | 'KRW';

export interface CashbookEntry {
  type: TransactionType;
  amount: number;
  currency: Currency;
  refType?: string;
  refId?: string;
  note?: string;
  date?: Date;
}

export class CashbookService {
  private supabase: ReturnType<typeof createClient>;
  private readonly DEFAULT_FX_RATE = 180; // 1 CNY = 180 KRW (기본값)
  
  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient;
  }
  
  /**
   * 환율 조회 (실제 구현 시 외부 API 연동)
   * @param from 원화
   * @param to 대상 통화
   * @returns 환율
   */
  async getExchangeRate(from: Currency, to: Currency): Promise<number> {
    // TODO: 실제 환율 API 연동
    // 현재는 고정 환율 사용
    if (from === 'CNY' && to === 'KRW') {
      return this.DEFAULT_FX_RATE;
    } else if (from === 'KRW' && to === 'CNY') {
      return 1 / this.DEFAULT_FX_RATE;
    }
    return 1;
  }
  
  /**
   * 거래 기록
   * @param entry 거래 정보
   * @returns 기록 결과
   */
  async recordTransaction(entry: CashbookEntry): Promise<{
    success: boolean;
    id?: string;
    message?: string;
  }> {
    try {
      const fxRate = await this.getExchangeRate(entry.currency, 'KRW');
      const amountKrw = entry.currency === 'KRW' 
        ? entry.amount 
        : Math.round(entry.amount * fxRate);
      
      const { data, error } = await this.supabase
        .from('cashbook')
        .insert({
          date: entry.date || new Date(),
          type: entry.type,
          amount: entry.amount,
          currency: entry.currency,
          fx_rate: entry.currency === 'CNY' ? fxRate : null,
          amount_krw: amountKrw,
          ref_type: entry.refType,
          ref_id: entry.refId,
          note: entry.note
        })
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          message: `Failed to record transaction: ${error.message}`
        };
      }
      
      return {
        success: true,
        id: data.id
      };
      
    } catch (error) {
      console.error('Error recording transaction:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to record transaction'
      };
    }
  }
  
  /**
   * 매출 기록 (주문 생성 시)
   * @param orderId 주문 ID
   * @param amount 금액 (CNY)
   * @param orderNo 주문번호
   * @returns 기록 결과
   */
  async recordSale(orderId: string, amount: number, orderNo?: string): Promise<{
    success: boolean;
    id?: string;
    message?: string;
  }> {
    return this.recordTransaction({
      type: 'sale',
      amount: amount,
      currency: 'CNY',
      refType: 'order',
      refId: orderId,
      note: orderNo ? `주문 ${orderNo} 매출` : '주문 매출'
    });
  }
  
  /**
   * 입고 비용 기록
   * @param inboundId 입고 ID
   * @param cost 비용 (CNY, 음수로 저장)
   * @param productInfo 상품 정보
   * @returns 기록 결과
   */
  async recordInbound(
    inboundId: string, 
    cost: number, 
    productInfo?: string
  ): Promise<{
    success: boolean;
    id?: string;
    message?: string;
  }> {
    return this.recordTransaction({
      type: 'inbound',
      amount: -Math.abs(cost), // 지출은 음수
      currency: 'CNY',
      refType: 'inbound',
      refId: inboundId,
      note: productInfo ? `입고: ${productInfo}` : '상품 입고'
    });
  }
  
  /**
   * 배송비 기록
   * @param shipmentId 배송 ID
   * @param shippingCost 배송비 (KRW, 음수로 저장)
   * @param courier 택배사
   * @returns 기록 결과
   */
  async recordShipping(
    shipmentId: string,
    shippingCost: number,
    courier?: string
  ): Promise<{
    success: boolean;
    id?: string;
    message?: string;
  }> {
    return this.recordTransaction({
      type: 'shipping',
      amount: -Math.abs(shippingCost), // 지출은 음수
      currency: 'KRW',
      refType: 'shipment',
      refId: shipmentId,
      note: courier ? `${courier} 배송비` : '배송비'
    });
  }
  
  /**
   * 환불 기록
   * @param orderId 주문 ID
   * @param refundAmount 환불 금액 (CNY, 음수로 저장)
   * @param orderNo 주문번호
   * @param reason 환불 사유
   * @returns 기록 결과
   */
  async recordRefund(
    orderId: string,
    refundAmount: number,
    orderNo?: string,
    reason?: string
  ): Promise<{
    success: boolean;
    id?: string;
    message?: string;
  }> {
    const note = orderNo 
      ? `주문 ${orderNo} 환불${reason ? ` - ${reason}` : ''}`
      : `환불${reason ? ` - ${reason}` : ''}`;
    
    return this.recordTransaction({
      type: 'refund',
      amount: -Math.abs(refundAmount), // 환불은 음수
      currency: 'CNY',
      refType: 'order',
      refId: orderId,
      note
    });
  }
  
  /**
   * 조정 기록 (기타 수입/지출)
   * @param amount 금액 (양수: 수입, 음수: 지출)
   * @param currency 통화
   * @param note 메모
   * @returns 기록 결과
   */
  async recordAdjustment(
    amount: number,
    currency: Currency,
    note: string
  ): Promise<{
    success: boolean;
    id?: string;
    message?: string;
  }> {
    return this.recordTransaction({
      type: 'adjustment',
      amount,
      currency,
      note
    });
  }
  
  /**
   * 일별 정산 조회
   * @param date 조회 날짜
   * @returns 일별 정산 결과
   */
  async getDailySummary(date: Date): Promise<{
    date: string;
    sales: number;
    expenses: number;
    netIncome: number;
    transactions: Array<{
      type: TransactionType;
      amount: number;
      amountKrw: number;
      note: string;
    }>;
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await this.supabase
        .from('cashbook')
        .select('*')
        .gte('date', startOfDay.toISOString())
        .lte('date', endOfDay.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching daily summary:', error);
        return {
          date: date.toISOString().split('T')[0],
          sales: 0,
          expenses: 0,
          netIncome: 0,
          transactions: []
        };
      }
      
      let sales = 0;
      let expenses = 0;
      const transactions: Array<{
        type: TransactionType;
        amount: number;
        amountKrw: number;
        note: string;
      }> = [];
      
      for (const entry of data || []) {
        const amountKrw = entry.amount_krw || 0;
        
        if (entry.type === 'sale') {
          sales += amountKrw;
        } else if (amountKrw < 0) {
          expenses += Math.abs(amountKrw);
        }
        
        transactions.push({
          type: entry.type,
          amount: entry.amount,
          amountKrw: amountKrw,
          note: entry.note || ''
        });
      }
      
      return {
        date: date.toISOString().split('T')[0],
        sales,
        expenses,
        netIncome: sales - expenses,
        transactions
      };
      
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return {
        date: date.toISOString().split('T')[0],
        sales: 0,
        expenses: 0,
        netIncome: 0,
        transactions: []
      };
    }
  }
  
  /**
   * 월별 정산 조회
   * @param year 연도
   * @param month 월 (1-12)
   * @returns 월별 정산 결과
   */
  async getMonthlySummary(year: number, month: number): Promise<{
    year: number;
    month: number;
    totalSales: number;
    totalExpenses: number;
    netIncome: number;
    byType: Record<TransactionType, {
      count: number;
      totalAmount: number;
    }>;
  }> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      
      const { data, error } = await this.supabase
        .from('cashbook')
        .select('*')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());
      
      if (error) {
        console.error('Error fetching monthly summary:', error);
        return this.getEmptyMonthlySummary(year, month);
      }
      
      let totalSales = 0;
      let totalExpenses = 0;
      const byType: Record<TransactionType, {
        count: number;
        totalAmount: number;
      }> = {
        sale: { count: 0, totalAmount: 0 },
        inbound: { count: 0, totalAmount: 0 },
        shipping: { count: 0, totalAmount: 0 },
        adjustment: { count: 0, totalAmount: 0 },
        refund: { count: 0, totalAmount: 0 }
      };
      
      for (const entry of data || []) {
        const amountKrw = entry.amount_krw || 0;
        const type = entry.type as TransactionType;
        
        byType[type].count++;
        byType[type].totalAmount += amountKrw;
        
        if (type === 'sale') {
          totalSales += amountKrw;
        } else if (amountKrw < 0) {
          totalExpenses += Math.abs(amountKrw);
        }
      }
      
      return {
        year,
        month,
        totalSales,
        totalExpenses,
        netIncome: totalSales - totalExpenses,
        byType
      };
      
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return this.getEmptyMonthlySummary(year, month);
    }
  }
  
  /**
   * 빈 월별 정산 결과 생성
   */
  private getEmptyMonthlySummary(year: number, month: number) {
    return {
      year,
      month,
      totalSales: 0,
      totalExpenses: 0,
      netIncome: 0,
      byType: {
        sale: { count: 0, totalAmount: 0 },
        inbound: { count: 0, totalAmount: 0 },
        shipping: { count: 0, totalAmount: 0 },
        adjustment: { count: 0, totalAmount: 0 },
        refund: { count: 0, totalAmount: 0 }
      }
    };
  }
  
  /**
   * 잔액 조회 (특정 날짜까지의 누적)
   * @param untilDate 기준 날짜
   * @returns 잔액
   */
  async getBalance(untilDate?: Date): Promise<{
    balanceCny: number;
    balanceKrw: number;
  }> {
    try {
      let query = this.supabase
        .from('cashbook')
        .select('amount, currency, amount_krw');
      
      if (untilDate) {
        query = query.lte('date', untilDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching balance:', error);
        return { balanceCny: 0, balanceKrw: 0 };
      }
      
      let balanceCny = 0;
      let balanceKrw = 0;
      
      for (const entry of data || []) {
        if (entry.currency === 'CNY') {
          balanceCny += entry.amount;
        }
        balanceKrw += entry.amount_krw || 0;
      }
      
      return { balanceCny, balanceKrw };
      
    } catch (error) {
      console.error('Error getting balance:', error);
      return { balanceCny: 0, balanceKrw: 0 };
    }
  }
}