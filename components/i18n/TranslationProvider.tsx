/**
 * 번역 프로바이더 컴포넌트
 * React Context를 통해 번역 기능 제공
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { type Locale, defaultLocale, getDictionary, getBrowserLocale } from '@/lib/i18n';
import { interpolateMessage, formatCurrency, formatDate, formatNumber, pluralize } from '@/lib/i18n';

interface TranslationContextValue {
  t: (key: string, values?: Record<string, string | number>, fallback?: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  formatDate: (date: Date) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  pluralize: (count: number, messages: { zero?: string; one: string; other: string }) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
  initialDictionary?: Record<string, any>;
}

export function TranslationProvider({ 
  children, 
  initialLocale,
  initialDictionary 
}: TranslationProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale || defaultLocale);
  const [dictionary, setDictionary] = useState<Record<string, any>>(initialDictionary || {});
  const [loading, setLoading] = useState(!initialDictionary);

  // Load dictionary for current locale
  useEffect(() => {
    async function loadDictionary() {
      if (!dictionary || Object.keys(dictionary).length === 0) {
        setLoading(true);
        try {
          const newDictionary = await getDictionary(locale);
          setDictionary(newDictionary);
        } catch (error) {
          console.error('Failed to load dictionary:', error);
          // Fallback to empty dictionary
          setDictionary({});
        } finally {
          setLoading(false);
        }
      }
    }

    loadDictionary();
  }, [locale, dictionary]);

  // Auto-detect locale on first visit
  useEffect(() => {
    if (!initialLocale && typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('yuandi-locale') as Locale;
      if (savedLocale && savedLocale !== locale) {
        setLocale(savedLocale);
      } else if (!savedLocale) {
        const browserLocale = getBrowserLocale();
        if (browserLocale !== locale) {
          setLocale(browserLocale);
          localStorage.setItem('yuandi-locale', browserLocale);
        }
      }
    }
  }, [initialLocale, locale]);

  // Translation function
  const t = useCallback((
    key: string,
    values?: Record<string, string | number>,
    fallback?: string
  ): string => {
    try {
      const keys = key.split('.');
      let result: any = dictionary;
      
      for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
          break;
        }
      }
      
      if (typeof result === 'string') {
        if (values) {
          return interpolateMessage(result, values);
        }
        return result;
      }
      
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

  // Enhanced context value with locale switching
  const contextValue: TranslationContextValue & {
    switchLocale: (newLocale: Locale) => Promise<void>;
    loading: boolean;
  } = {
    t,
    locale,
    setLocale,
    formatDate: formatDateFn,
    formatNumber: formatNumberFn,
    formatCurrency: formatCurrencyFn,
    pluralize: pluralizeFn,
    switchLocale: async (newLocale: Locale) => {
      if (newLocale === locale) return;
      
      setLoading(true);
      try {
        const newDictionary = await getDictionary(newLocale);
        setLocale(newLocale);
        setDictionary(newDictionary);
        
        // Save to localStorage and cookie
        if (typeof window !== 'undefined') {
          localStorage.setItem('yuandi-locale', newLocale);
          document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
        }
      } catch (error) {
        console.error('Failed to switch locale:', error);
      } finally {
        setLoading(false);
      }
    },
    loading
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext() {
  const context = useContext(TranslationContext);
  
  if (!context) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  
  return context as TranslationContextValue & {
    switchLocale: (newLocale: Locale) => Promise<void>;
    loading: boolean;
  };
}

// HOC for server-side translation support
export function withTranslation<T extends object>(
  Component: React.ComponentType<T>,
  locale?: Locale
) {
  return function TranslatedComponent(props: T) {
    const [dictionary, setDictionary] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function loadDictionary() {
        try {
          const dict = await getDictionary(locale || defaultLocale);
          setDictionary(dict);
        } catch (error) {
          console.error('Failed to load dictionary:', error);
        } finally {
          setLoading(false);
        }
      }

      loadDictionary();
    }, [locale]);

    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <TranslationProvider 
        initialLocale={locale || defaultLocale} 
        initialDictionary={dictionary}
      >
        <Component {...props} />
      </TranslationProvider>
    );
  };
}

// Translation debugging utilities (development only)
export function TranslationDebugger() {
  const { locale, dictionary } = useTranslationContext();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-50">
      <div>Locale: {locale}</div>
      <div>Keys: {Object.keys(dictionary).length}</div>
    </div>
  );
}

export { TranslationContext };