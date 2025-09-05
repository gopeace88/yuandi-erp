'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Locale, i18nConfig } from './config';
import { useTranslation as useTranslationHook } from '@/hooks/useTranslation';

interface TranslationContextValue {
  locale: Locale;
  dictionary: Record<string, any>;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>, fallback?: string) => string;
  formatDate: (date: Date) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  pluralize: (count: number, messages: { zero?: string; one: string; other: string }) => string;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

export function TranslationProvider({ 
  children, 
  initialLocale = 'ko',
  initialDictionary = {}
}: { 
  children: React.ReactNode;
  initialLocale?: Locale;
  initialDictionary?: Record<string, any>;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState<Record<string, any>>(initialDictionary);

  const translation = useTranslationHook({ locale, dictionary });

  const setLocale = useCallback(async (newLocale: Locale) => {
    try {
      // 새 언어 사전 로드
      const response = await fetch(`/api/i18n/dictionary?locale=${newLocale}`);
      if (response.ok) {
        const newDictionary = await response.json();
        setDictionary(newDictionary);
      }
      
      // 로케일 업데이트
      setLocaleState(newLocale);
      
      // 쿠키 저장
      document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
      
      // 로컬 스토리지 저장
      localStorage.setItem('locale', newLocale);
      
      // 페이지 새로고침 (옵션)
      // window.location.pathname = `/${newLocale}${window.location.pathname.replace(/^\/[^\/]+/, '')}`;
    } catch (error) {
      console.error('Failed to change locale:', error);
    }
  }, []);

  useEffect(() => {
    // 브라우저 언어 감지
    if (typeof window !== 'undefined' && !localStorage.getItem('locale')) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('ko')) {
        setLocaleState('ko');
      } else if (browserLang.startsWith('zh')) {
        setLocaleState('zh-CN');
      } else {
        setLocaleState('en');
      }
    }
  }, []);

  const value: TranslationContextValue = {
    locale,
    dictionary,
    setLocale,
    t: translation.t,
    formatDate: translation.formatDate,
    formatNumber: translation.formatNumber,
    formatCurrency: translation.formatCurrency,
    pluralize: translation.pluralize,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}