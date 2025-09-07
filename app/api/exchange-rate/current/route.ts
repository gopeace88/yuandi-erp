/**
 * 현재 환율 조회 API
 */

import { NextResponse } from 'next/server';
import { ExchangeRateService } from '@/lib/services/exchange-rate.service';

export async function GET() {
  try {
    const service = new ExchangeRateService();
    const rate = await service.getCurrentRate();
    
    return NextResponse.json({
      success: true,
      rate: rate,
      base: 'CNY',
      target: 'KRW',
      date: new Date().toISOString().split('T')[0]
    });
    
  } catch (error) {
    console.error('Failed to get current rate:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch exchange rate',
        rate: 178.50 // 기본값
      },
      { status: 500 }
    );
  }
}