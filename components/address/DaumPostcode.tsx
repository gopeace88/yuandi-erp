'use client';

import React, { useEffect } from 'react';

declare global {
  interface Window {
    daum: any;
  }
}

export interface AddressData {
  postcode: string;           // 우편번호
  address: string;            // 기본 주소
  addressDetail: string;      // 상세 주소 (사용자 입력)
  addressEnglish?: string;    // 영문 주소
  roadAddress?: string;       // 도로명 주소
  jibunAddress?: string;      // 지번 주소
  buildingName?: string;      // 건물명
  extraAddress?: string;      // 참고항목
}

interface DaumPostcodeProps {
  onComplete: (data: AddressData) => void;
  onClose?: () => void;
  width?: number | string;
  height?: number | string;
  animation?: boolean;
  autoClose?: boolean;
  className?: string;
}

/**
 * Daum 우편번호 서비스 컴포넌트
 * 
 * @example
 * ```tsx
 * <DaumPostcode
 *   onComplete={(data) => {
 *     console.log('선택된 주소:', data);
 *   }}
 *   onClose={() => {
 *     console.log('닫기');
 *   }}
 * />
 * ```
 */
export const DaumPostcode: React.FC<DaumPostcodeProps> = ({
  onComplete,
  onClose,
  width = '100%',
  height = 450,
  animation = true,
  autoClose = true,
  className = ''
}) => {
  useEffect(() => {
    // Daum Postcode 스크립트 동적 로드
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.daum && window.daum.Postcode) {
        initializePostcode();
      }
    };

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const initializePostcode = () => {
    const container = document.getElementById('daum-postcode-container');
    if (!container || !window.daum) return;

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        // 우편번호와 주소 정보를 추출
        let fullAddress = data.address;
        let extraAddress = '';

        // 도로명 주소인 경우 참고항목 추가
        if (data.addressType === 'R') {
          if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
            extraAddress += data.bname;
          }
          if (data.buildingName !== '' && data.apartment === 'Y') {
            extraAddress += extraAddress !== '' ? ', ' + data.buildingName : data.buildingName;
          }
          if (extraAddress !== '') {
            extraAddress = ' (' + extraAddress + ')';
          }
        }

        const addressData: AddressData = {
          postcode: data.zonecode,
          address: fullAddress + extraAddress,
          addressDetail: '',
          addressEnglish: data.addressEnglish || '',
          roadAddress: data.roadAddress || '',
          jibunAddress: data.jibunAddress || '',
          buildingName: data.buildingName || '',
          extraAddress: extraAddress
        };

        onComplete(addressData);

        // 자동 닫기 옵션이 활성화된 경우
        if (autoClose && onClose) {
          onClose();
        }
      },
      onclose: function(state: string) {
        // state가 'FORCE_CLOSE'인 경우, 사용자가 브라우저 닫기 버튼을 통해 팝업을 닫았을 경우
        if (state === 'FORCE_CLOSE' && onClose) {
          onClose();
        }
      },
      width: '100%',
      height: '100%',
      animation: animation
    }).embed(container);
  };

  return (
    <div 
      id="daum-postcode-container" 
      className={className}
      style={{ width, height }}
    />
  );
};

/**
 * 모달 형태의 Daum 우편번호 서비스
 */
interface DaumPostcodeModalProps {
  isOpen: boolean;
  onComplete: (data: AddressData) => void;
  onClose: () => void;
  title?: string;
}

export const DaumPostcodeModal: React.FC<DaumPostcodeModalProps> = ({
  isOpen,
  onComplete,
  onClose,
  title = '우편번호 찾기'
}) => {
  useEffect(() => {
    if (isOpen) {
      // ESC 키로 모달 닫기
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      // body 스크롤 방지
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <DaumPostcode
            onComplete={(data) => {
              onComplete(data);
              onClose();
            }}
            height={400}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * 주소 입력 필드 컴포넌트
 */
interface AddressFieldProps {
  value: AddressData | null;
  onChange: (data: AddressData) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const AddressField: React.FC<AddressFieldProps> = ({
  value,
  onChange,
  label = '배송지 주소',
  required = false,
  disabled = false,
  placeholder = '우편번호 검색 버튼을 클릭하세요',
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleAddressComplete = (data: AddressData) => {
    onChange(data);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (value) {
      onChange({
        ...value,
        addressDetail: e.target.value
      });
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={value?.postcode || ''}
            placeholder="우편번호"
            disabled
            className="flex-none w-32 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            우편번호 검색
          </button>
        </div>
        
        <input
          type="text"
          value={value?.address || ''}
          placeholder={placeholder}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
        />
        
        <input
          type="text"
          value={value?.addressDetail || ''}
          onChange={handleDetailChange}
          placeholder="상세주소를 입력하세요"
          disabled={disabled || !value?.address}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
        />
      </div>

      <DaumPostcodeModal
        isOpen={isModalOpen}
        onComplete={handleAddressComplete}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};