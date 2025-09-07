/**
 * 통화 전환 토글 컴포넌트
 * KRW/CNY 전환 기능 제공
 */

'use client';

import { useState, useEffect } from 'react';

interface CurrencyToggleProps {
  value: 'KRW' | 'CNY';
  onChange: (currency: 'KRW' | 'CNY') => void;
  showRate?: boolean;
  className?: string;
}

export default function CurrencyToggle({ 
  value, 
  onChange, 
  showRate = false,
  className = ''
}: CurrencyToggleProps) {
  const [currentRate, setCurrentRate] = useState<number>(178.50);
  
  useEffect(() => {
    // 현재 환율 조회
    fetchCurrentRate();
  }, []);
  
  const fetchCurrentRate = async () => {
    try {
      const response = await fetch('/api/exchange-rate/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentRate(data.rate);
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
    }
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onChange('KRW')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            value === 'KRW' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="mr-1">₩</span>
          원화
        </button>
        <button
          onClick={() => onChange('CNY')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            value === 'CNY' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="mr-1">¥</span>
          위안화
        </button>
      </div>
      
      {showRate && (
        <div className="text-sm text-gray-500">
          1 CNY = {currentRate.toFixed(2)} KRW
        </div>
      )}
    </div>
  );
}