/**
 * 언어 선택 컴포넌트
 * 다국어 지원 (한국어, 중국어, 영어)
 */

'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Languages, Check, Globe } from 'lucide-react';
import { type Locale, localeConfig, locales } from '@/lib/i18n';

interface LanguageSelectorProps {
  currentLocale: Locale;
  className?: string;
  variant?: 'dropdown' | 'buttons' | 'compact';
  showFlag?: boolean;
  showName?: boolean;
}

export default function LanguageSelector({
  currentLocale,
  className = '',
  variant = 'dropdown',
  showFlag = true,
  showName = true
}: LanguageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    try {
      // 쿠키에 locale 설정
      document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
      
      // URL 업데이트 (필요한 경우)
      const currentPath = pathname;
      const newPath = currentPath.startsWith(`/${currentLocale}`) 
        ? currentPath.replace(`/${currentLocale}`, `/${newLocale}`)
        : `/${newLocale}${currentPath}`;

      // 페이지 새로고침으로 언어 변경 적용
      startTransition(() => {
        router.refresh();
        setIsOpen(false);
      });
    } catch (error) {
      console.error('Failed to switch language:', error);
    }
  };

  const currentConfig = localeConfig[currentLocale];

  if (variant === 'buttons') {
    return (
      <div className={`flex space-x-1 ${className}`}>
        {locales.map((locale) => {
          const config = localeConfig[locale];
          const isActive = locale === currentLocale;
          
          return (
            <Button
              key={locale}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchLanguage(locale)}
              disabled={isPending}
              className="relative"
            >
              {showFlag && (
                <span className="mr-1 text-sm">{config.flag}</span>
              )}
              {showName && (
                <span className="text-xs">{config.name}</span>
              )}
              {isActive && (
                <Check className="w-3 h-3 ml-1" />
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Badge
        variant="outline"
        className={`cursor-pointer hover:bg-gray-50 ${className}`}
        onClick={() => {
          const nextIndex = (locales.indexOf(currentLocale) + 1) % locales.length;
          switchLanguage(locales[nextIndex]);
        }}
      >
        {showFlag && (
          <span className="mr-1">{currentConfig.flag}</span>
        )}
        <span className="text-xs font-medium">
          {showName ? currentConfig.name : currentConfig.code.toUpperCase()}
        </span>
        <Globe className="w-3 h-3 ml-1" />
      </Badge>
    );
  }

  // Default dropdown variant
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`space-x-2 ${className}`}
          disabled={isPending}
        >
          {showFlag && (
            <span className="text-sm">{currentConfig.flag}</span>
          )}
          {showName && (
            <span className="text-sm font-medium">{currentConfig.name}</span>
          )}
          <Languages className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {locales.map((locale) => {
          const config = localeConfig[locale];
          const isActive = locale === currentLocale;
          
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => switchLanguage(locale)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">{config.flag}</span>
                <span className="font-medium">{config.name}</span>
                <span className="text-xs text-gray-500 uppercase">
                  {config.code}
                </span>
              </div>
              {isActive && (
                <Check className="w-4 h-4 text-green-600" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Language detection hook
export function useLanguageDetection() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const detectAndSetLanguage = () => {
    if (typeof navigator === 'undefined') return;

    const browserLang = navigator.language || navigator.languages?.[0];
    let detectedLocale: Locale = 'ko';

    if (browserLang?.startsWith('ko')) detectedLocale = 'ko';
    else if (browserLang?.startsWith('zh')) detectedLocale = 'zh-CN';
    else if (browserLang?.startsWith('en')) detectedLocale = 'en';

    // 쿠키에서 현재 설정된 언어 확인
    const currentLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1] as Locale;

    // 감지된 언어와 현재 언어가 다르면 변경
    if (!currentLocale || currentLocale !== detectedLocale) {
      document.cookie = `locale=${detectedLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
      
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return {
    detectAndSetLanguage,
    isPending
  };
}