/**
 * 번역 훅
 * 클라이언트 사이드에서 번역 기능 제공
 */

'use client';

import { useCallback, useMemo } from 'react';
import { type Locale, interpolateMessage, pluralize, formatCurrency, formatDate, formatNumber } from '@/lib/i18n';

export interface TranslationContextValue {
  locale: Locale;
  dictionary: Record<string, any>;
  t: TranslationFunction;
  formatDate: (date: Date) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  pluralize: (count: number, messages: { zero?: string; one: string; other: string }) => string;
}

export type TranslationFunction = (
  key: string,
  values?: Record<string, string | number>,
  fallback?: string
) => string;

interface UseTranslationProps {
  locale: Locale;
  dictionary: Record<string, any>;
}

export function useTranslation({ locale, dictionary }: UseTranslationProps): TranslationContextValue {
  const t: TranslationFunction = useCallback((
    key: string,
    values?: Record<string, string | number>,
    fallback?: string
  ) => {
    try {
      // 점으로 구분된 키를 통해 중첩된 객체에 접근
      const keys = key.split('.');
      let result: any = dictionary;
      
      for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
          break;
        }
      }
      
      if (typeof result === 'string') {
        // 템플릿 변수가 있으면 치환
        if (values) {
          return interpolateMessage(result, values);
        }
        return result;
      }
      
      // 번역을 찾을 수 없는 경우
      console.warn(`Translation missing for key: ${key} in locale: ${locale}`);
      return fallback || key;
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return fallback || key;
    }
  }, [dictionary, locale]);

  const formatDateFn = useCallback((date: Date) => {
    return formatDate(date, locale);
  }, [locale]);

  const formatNumberFn = useCallback((number: number) => {
    return formatNumber(number, locale);
  }, [locale]);

  const formatCurrencyFn = useCallback((amount: number, currency = 'KRW') => {
    return formatCurrency(amount, currency, locale);
  }, [locale]);

  const pluralizeFn = useCallback((
    count: number,
    messages: { zero?: string; one: string; other: string }
  ) => {
    return pluralize(count, messages, locale);
  }, [locale]);

  return useMemo(() => ({
    locale,
    dictionary,
    t,
    formatDate: formatDateFn,
    formatNumber: formatNumberFn,
    formatCurrency: formatCurrencyFn,
    pluralize: pluralizeFn
  }), [locale, dictionary, t, formatDateFn, formatNumberFn, formatCurrencyFn, pluralizeFn]);
}

// 번역 키 자동완성을 위한 타입 헬퍼
export type TranslationKey = 
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.create'
  | 'navigation.dashboard'
  | 'navigation.orders'
  | 'navigation.products'
  | 'orders.title'
  | 'orders.createOrder'
  | 'orders.orderNumber'
  | 'products.title'
  | 'products.addProduct'
  | 'dashboard.title'
  | 'dashboard.todaySales'
  | 'errors.required'
  | 'errors.invalid'
  | 'validation.email'
  | 'validation.phone'
  | string; // 새로운 키들을 위한 fallback

// 번역 키 검증 유틸리티
export function isValidTranslationKey(key: string, dictionary: Record<string, any>): boolean {
  const keys = key.split('.');
  let current = dictionary;
  
  for (const k of keys) {
    if (current[k] === undefined) {
      return false;
    }
    current = current[k];
  }
  
  return typeof current === 'string';
}

// 번역 키 목록 추출 유틸리티
export function extractTranslationKeys(
  dictionary: Record<string, any>, 
  prefix = ''
): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(dictionary)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...extractTranslationKeys(value, fullKey));
    }
  }
  
  return keys;
}

// 번역 통계 유틸리티
export function getTranslationStats(dictionaries: Record<Locale, Record<string, any>>) {
  const stats: Record<Locale, { total: number; missing: number; coverage: number }> = {};
  const allKeys = new Set<string>();
  
  // 모든 가능한 키 수집
  for (const dictionary of Object.values(dictionaries)) {
    extractTranslationKeys(dictionary).forEach(key => allKeys.add(key));
  }
  
  // 각 언어별 통계 계산
  for (const [locale, dictionary] of Object.entries(dictionaries) as Array<[Locale, Record<string, any>]>) {
    const existingKeys = extractTranslationKeys(dictionary);
    const total = allKeys.size;
    const existing = existingKeys.length;
    const missing = total - existing;
    const coverage = total > 0 ? (existing / total) * 100 : 0;
    
    stats[locale] = {
      total,
      missing,
      coverage: Math.round(coverage * 100) / 100
    };
  }
  
  return {
    stats,
    totalKeys: allKeys.size,
    allKeys: Array.from(allKeys).sort()
  };
}