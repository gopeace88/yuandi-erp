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
   * API 문서: https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C#none
   */
  async fetchFromKoreaExim(searchdate?: string): Promise<number | null> {
    try {
      const authkey = process.env.KOREA_EXIM_API_KEY;
      if (!authkey) {
        console.error('KOREA_EXIM_API_KEY not configured');
        return null;
      }
      
      // 날짜가 지정되지 않으면 가장 최근 영업일 사용
      if (!searchdate) {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
        
        // 주말이면 금요일로 조정
        const dayOfWeek = koreaTime.getDay();
        if (dayOfWeek === 0) { // 일요일
          koreaTime.setDate(koreaTime.getDate() - 2);
        } else if (dayOfWeek === 6) { // 토요일
          koreaTime.setDate(koreaTime.getDate() - 1);
        }
        
        searchdate = koreaTime.toISOString().split('T')[0].replace(/-/g, '');
      }
      
      const url = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${authkey}&searchdate=${searchdate}&data=AP01`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Korea Exim API error:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      // 응답 확인
      if (!Array.isArray(data) || data.length === 0) {
        console.error('Invalid response from Korea Exim API');
        return null;
      }
      
      // 결과 코드 확인 (1: 성공)
      if (data[0]?.result !== 1) {
        const errorMessages: { [key: number]: string } = {
          2: 'DATA 코드 오류',
          3: '인증코드 오류',
          4: '일일제한횟수 마감'
        };
        console.error(`Korea Exim API error: ${errorMessages[data[0]?.result] || 'Unknown error'}`);
        return null;
      }
      
      // CNH (위안화) 환율 찾기
      const cnyRate = data.find((item: any) => item.cur_unit === 'CNH');
      if (cnyRate && cnyRate.deal_bas_r) {
        // deal_bas_r은 매매기준율 (문자열로 제공됨, 쉼표 포함 가능)
        const rate = parseFloat(cnyRate.deal_bas_r.replace(/,/g, ''));
        console.log(`✅ 환율 조회 성공: 1 CNY = ${rate} KRW`);
        return rate;
      }
      
      console.warn('CNH rate not found in response');
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
   * 환율 업데이트 (주 1회: 일요일 새벽 3시)
   * 지난 금요일의 환율 데이터를 가져와서 일주일 동안 사용
   */
  async updateWeeklyRate(): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      // 지난 금요일 날짜 계산
      const today = new Date();
      const lastFriday = new Date(today);
      const daysSinceFriday = (today.getDay() + 2) % 7; // 일요일=0이므로 금요일까지 2일
      lastFriday.setDate(today.getDate() - daysSinceFriday);
      
      console.log(`주간 환율 업데이트 시작 (${lastFriday.toISOString().split('T')[0]} 금요일 데이터 조회)`);
      
      // 금요일 환율 조회를 위해 날짜 설정
      const searchdate = lastFriday.toISOString().split('T')[0].replace(/-/g, '');
      
      // 1. API에서 금요일 환율 가져오기
      let rate = await this.fetchFromKoreaExim(searchdate);
      let source = 'api_bank';
      
      // 2. 실패시 대체 API 시도
      if (!rate) {
        rate = await this.fetchFromFixer();
        source = 'api_forex';
      }
      
      // 3. 그래도 실패시 최근 환율 유지
      if (!rate) {
        const { data: lastRate } = await supabase
          .from('exchange_rates')
          .select('rate')
          .order('date', { ascending: false })
          .limit(1)
          .single();
        
        if (lastRate) {
          rate = lastRate.rate;
          source = 'cached';
          console.log('API 실패, 최근 환율 유지:', rate);
        } else {
          rate = 178.50; // 최후의 기본값
          source = 'default';
        }
      }
      
      const todayDate = new Date().toISOString().split('T')[0];
      
      // 4. exchange_rates 테이블에 저장
      const { error: insertError } = await supabase
        .from('exchange_rates')
        .upsert({
          date: todayDate,
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
          date: todayDate,
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
   * 현재 환율 조회 (DB에 없으면 API 자동 호출)
   */
  async getCurrentRate(): Promise<number> {
    try {
      const supabase = await createClient();
      
      // 1. 캐시에서 최근 7일 이내 환율 조회
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: cachedRate, error } = await supabase
        .from('exchange_rates')
        .select('rate, date')
        .eq('base_currency', 'CNY')
        .eq('target_currency', 'KRW')
        .eq('is_active', true)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (cachedRate && !error) {
        console.log(`캐시된 환율 사용: ${cachedRate.rate} (${cachedRate.date})`);
        return cachedRate.rate;
      }
      
      // 2. 캐시에 없거나 7일 이상 지났으면 API 호출
      console.log('환율 캐시 없음, API 호출 시작...');
      
      // 가장 최근 금요일 날짜 계산
      const today = new Date();
      let lastFriday = new Date(today);
      const dayOfWeek = today.getDay();
      
      // 오늘이 금요일이 아니면 지난 금요일로
      if (dayOfWeek !== 5) {
        const daysToSubtract = dayOfWeek === 0 ? 2 : (dayOfWeek + 2) % 7;
        lastFriday.setDate(today.getDate() - daysToSubtract);
      }
      
      const searchdate = lastFriday.toISOString().split('T')[0].replace(/-/g, '');
      const rate = await this.fetchFromKoreaExim(searchdate);
      
      if (rate) {
        // API 성공시 DB에 저장
        const { error: saveError } = await supabase
          .from('exchange_rates')
          .upsert({
            date: lastFriday.toISOString().split('T')[0],
            base_currency: 'CNY',
            target_currency: 'KRW',
            rate: rate,
            source: 'api_bank',
            is_active: true
          }, {
            onConflict: 'date,base_currency,target_currency'
          });
        
        if (!saveError) {
          console.log(`✅ 환율 API 호출 및 저장 성공: ${rate}`);
        }
        return rate;
      }
      
      // 3. API도 실패하면 기본값
      console.warn('환율 API 호출 실패, 기본값 사용');
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
      const supabase = await createClient();
      
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