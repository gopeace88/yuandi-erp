/**
 * 환율 관리 서비스
 * 한국수출입은행 API 또는 수동 입력을 통한 환율 관리
 */

import { createClient } from '@/lib/supabase/server';

export interface ExchangeRate {
  date: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  source: string;
}

export class ExchangeRateService {
  /**
   * 한국수출입은행 API에서 환율 조회
   * API: https://www.koreaexim.go.kr/site/program/financial/exchangeJSON
   */
  async fetchFromKoreaExim(): Promise<number | null> {
    try {
      const authkey = process.env.KOREA_EXIM_API_KEY || 'demo'; // API 키 필요
      const searchdate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${authkey}&searchdate=${searchdate}&data=AP01`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Korea Exim API error:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      // CNY 환율 찾기
      const cnyRate = data.find((item: any) => item.cur_unit === 'CNY');
      if (cnyRate) {
        // deal_bas_r은 매매기준율 (문자열로 제공됨, 쉼표 포함)
        const rate = parseFloat(cnyRate.deal_bas_r.replace(/,/g, ''));
        return rate;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      return null;
    }
  }

  /**
   * 대체 API: Fixer.io (유료)
   */
  async fetchFromFixer(): Promise<number | null> {
    try {
      const apiKey = process.env.FIXER_API_KEY;
      if (!apiKey) return null;
      
      const url = `http://data.fixer.io/api/latest?access_key=${apiKey}&base=CNY&symbols=KRW`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.success && data.rates?.KRW) {
        return data.rates.KRW;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch from Fixer:', error);
      return null;
    }
  }

  /**
   * 오늘의 환율 업데이트
   */
  async updateDailyRate(): Promise<boolean> {
    try {
      const supabase = createClient();
      
      // 1. API에서 환율 가져오기
      let rate = await this.fetchFromKoreaExim();
      let source = 'api_bank';
      
      // 2. 실패시 대체 API 시도
      if (!rate) {
        rate = await this.fetchFromFixer();
        source = 'api_forex';
      }
      
      // 3. 그래도 실패시 기본값 사용
      if (!rate) {
        rate = 178.50; // 기본값
        source = 'default';
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      // 4. exchange_rates 테이블에 저장
      const { error: insertError } = await supabase
        .from('exchange_rates')
        .upsert({
          date: today,
          base_currency: 'CNY',
          target_currency: 'KRW',
          rate: rate,
          source: source,
          is_active: true
        }, {
          onConflict: 'date,base_currency,target_currency'
        });
      
      if (insertError) {
        console.error('Failed to save exchange rate:', insertError);
        return false;
      }
      
      // 5. 캐시 테이블 업데이트
      const { error: cacheError } = await supabase
        .from('daily_exchange_cache')
        .upsert({
          date: today,
          cny_to_krw: rate,
          krw_to_cny: 1 / rate
        }, {
          onConflict: 'date'
        });
      
      if (cacheError) {
        console.error('Failed to update cache:', cacheError);
        return false;
      }
      
      console.log(`✅ Exchange rate updated: 1 CNY = ${rate} KRW (${source})`);
      return true;
      
    } catch (error) {
      console.error('Failed to update daily rate:', error);
      return false;
    }
  }

  /**
   * 현재 환율 조회
   */
  async getCurrentRate(): Promise<number> {
    try {
      const supabase = createClient();
      
      // 캐시에서 오늘 환율 조회
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_exchange_cache')
        .select('cny_to_krw')
        .eq('date', today)
        .single();
      
      if (data && !error) {
        return data.cny_to_krw;
      }
      
      // 캐시에 없으면 최신 환율 조회
      const { data: latestRate } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('base_currency', 'CNY')
        .eq('target_currency', 'KRW')
        .eq('is_active', true)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (latestRate) {
        return latestRate.rate;
      }
      
      // 기본값
      return 178.50;
      
    } catch (error) {
      console.error('Failed to get current rate:', error);
      return 178.50;
    }
  }

  /**
   * 특정 날짜의 환율 조회
   */
  async getRateByDate(date: string): Promise<number> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('date', date)
        .eq('base_currency', 'CNY')
        .eq('target_currency', 'KRW')
        .eq('is_active', true)
        .single();
      
      if (data && !error) {
        return data.rate;
      }
      
      // 해당 날짜에 환율이 없으면 가장 가까운 날짜의 환율 사용
      const { data: nearestRate } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('base_currency', 'CNY')
        .eq('target_currency', 'KRW')
        .eq('is_active', true)
        .lte('date', date)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      return nearestRate?.rate || 178.50;
      
    } catch (error) {
      console.error('Failed to get rate by date:', error);
      return 178.50;
    }
  }

  /**
   * 금액 환산
   */
  convertCurrency(amount: number, from: 'KRW' | 'CNY', rate?: number): {
    krw: number;
    cny: number;
    rate: number;
  } {
    const exchangeRate = rate || 178.50;
    
    if (from === 'CNY') {
      return {
        krw: amount * exchangeRate,
        cny: amount,
        rate: exchangeRate
      };
    } else {
      return {
        krw: amount,
        cny: amount / exchangeRate,
        rate: exchangeRate
      };
    }
  }
}