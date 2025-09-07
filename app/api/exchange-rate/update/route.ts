/**
 * 환율 업데이트 API
 * 매일 오전 9시에 실행되도록 Vercel Cron 또는 외부 스케줄러 설정
 */

import { NextResponse } from 'next/server';
import { ExchangeRateService } from '@/lib/services/exchange-rate.service';

export async function GET(request: Request) {
  try {
    // API 키 검증 (보안을 위해)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const service = new ExchangeRateService();
    const success = await service.updateDailyRate();
    
    if (success) {
      const currentRate = await service.getCurrentRate();
      return NextResponse.json({
        success: true,
        message: 'Exchange rate updated successfully',
        rate: currentRate,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to update exchange rate' 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Exchange rate update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// 수동 환율 입력 API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rate, date } = body;
    
    if (!rate || rate <= 0) {
      return NextResponse.json(
        { error: 'Invalid rate' },
        { status: 400 }
      );
    }
    
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // 환율 저장
    const { error } = await supabase
      .from('exchange_rates')
      .upsert({
        date: targetDate,
        base_currency: 'CNY',
        target_currency: 'KRW',
        rate: rate,
        source: 'manual',
        is_active: true
      }, {
        onConflict: 'date,base_currency,target_currency'
      });
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to save exchange rate' },
        { status: 500 }
      );
    }
    
    // 캐시 업데이트
    await supabase
      .from('daily_exchange_cache')
      .upsert({
        date: targetDate,
        cny_to_krw: rate,
        krw_to_cny: 1 / rate
      }, {
        onConflict: 'date'
      });
    
    return NextResponse.json({
      success: true,
      message: 'Exchange rate saved successfully',
      rate: rate,
      date: targetDate
    });
    
  } catch (error) {
    console.error('Manual rate update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}