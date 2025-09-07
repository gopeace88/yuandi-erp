/**
 * 이중 통화 입력 컴포넌트
 * KRW/CNY 자동 환산 기능 제공
 */

'use client';

import { useState, useEffect } from 'react';

interface DualCurrencyInputProps {
  krwValue: number;
  cnyValue: number;
  onKrwChange: (value: number) => void;
  onCnyChange: (value: number) => void;
  exchangeRate?: number;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function DualCurrencyInput({
  krwValue,
  cnyValue,
  onKrwChange,
  onCnyChange,
  exchangeRate = 178.50,
  label,
  required = false,
  disabled = false,
  className = ''
}: DualCurrencyInputProps) {
  const [activeInput, setActiveInput] = useState<'krw' | 'cny' | null>(null);
  const [localKrw, setLocalKrw] = useState(krwValue.toString());
  const [localCny, setLocalCny] = useState(cnyValue.toString());
  
  useEffect(() => {
    if (activeInput !== 'krw') {
      setLocalKrw(krwValue ? krwValue.toLocaleString('ko-KR') : '');
    }
    if (activeInput !== 'cny') {
      setLocalCny(cnyValue ? cnyValue.toFixed(2) : '');
    }
  }, [krwValue, cnyValue, activeInput]);
  
  const handleKrwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    setLocalKrw(e.target.value);
    setActiveInput('krw');
    
    const numValue = parseFloat(value) || 0;
    onKrwChange(numValue);
    onCnyChange(numValue / exchangeRate);
  };
  
  const handleCnyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalCny(value);
    setActiveInput('cny');
    
    const numValue = parseFloat(value) || 0;
    onCnyChange(numValue);
    onKrwChange(numValue * exchangeRate);
  };
  
  const handleKrwBlur = () => {
    setActiveInput(null);
    if (krwValue) {
      setLocalKrw(krwValue.toLocaleString('ko-KR'));
    }
  };
  
  const handleCnyBlur = () => {
    setActiveInput(null);
    if (cnyValue) {
      setLocalCny(cnyValue.toFixed(2));
    }
  };
  
  return (
    <div className={className}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              ₩
            </span>
            <input
              type="text"
              value={localKrw}
              onChange={handleKrwChange}
              onFocus={() => setActiveInput('krw')}
              onBlur={handleKrwBlur}
              disabled={disabled}
              placeholder="0"
              className={`w-full pl-8 pr-3 py-2 border rounded-md text-right ${
                disabled ? 'bg-gray-100' : 'bg-white'
              } ${
                activeInput === 'krw' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'
              } focus:outline-none transition-colors`}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">한화</div>
        </div>
        
        <div className="flex items-center justify-center w-8 h-8">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        
        <div className="flex-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              ¥
            </span>
            <input
              type="text"
              value={localCny}
              onChange={handleCnyChange}
              onFocus={() => setActiveInput('cny')}
              onBlur={handleCnyBlur}
              disabled={disabled}
              placeholder="0.00"
              className={`w-full pl-8 pr-3 py-2 border rounded-md text-right ${
                disabled ? 'bg-gray-100' : 'bg-white'
              } ${
                activeInput === 'cny' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'
              } focus:outline-none transition-colors`}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">위안화</div>
        </div>
      </div>
      
      <div className="text-xs text-gray-400 text-center mt-2">
        환율: 1 CNY = {exchangeRate.toFixed(2)} KRW
      </div>
    </div>
  );
}