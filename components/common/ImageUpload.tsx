/**
 * 이미지 업로드 컴포넌트
 * Drag & Drop 및 파일 선택 지원
 */

'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  locale: string;
  accept?: string;
  maxSize?: number; // MB 단위
}

export default function ImageUpload({
  label,
  value,
  onChange,
  locale,
  accept = 'image/*',
  maxSize = 5
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string>(value || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const texts = {
    ko: {
      dragDropText: '이미지를 드래그하여 놓거나',
      clickText: '클릭하여 파일 선택',
      uploadingText: '업로드 중...',
      changeImage: '이미지 변경',
      removeImage: '이미지 제거',
      sizeError: `파일 크기는 ${maxSize}MB 이하여야 합니다.`,
      uploadError: '업로드 실패. 다시 시도해주세요.',
    },
    'zh-CN': {
      dragDropText: '拖放图片或',
      clickText: '点击选择文件',
      uploadingText: '上传中...',
      changeImage: '更换图片',
      removeImage: '删除图片',
      sizeError: `文件大小不能超过${maxSize}MB`,
      uploadError: '上传失败，请重试。',
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // 파일 크기 체크
    if (file.size > maxSize * 1024 * 1024) {
      alert(t.sizeError);
      return;
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      alert(locale === 'ko' ? '이미지 파일만 업로드 가능합니다.' : '只能上传图片文件。');
      return;
    }

    setLoading(true);

    try {
      // 파일 경로 설정 (label에 따라 다른 폴더에 저장)
      const folder = label.includes('송장') || label.includes('运单') ? 'shipments' : 
                     label.includes('영수증') || label.includes('收据') ? 'receipts' : 
                     'products';
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      
      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        throw error;
      }
      
      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      setPreview(publicUrl);
      onChange(publicUrl);
      setLoading(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert(t.uploadError);
      setLoading(false);
      
      // 로컬 미리보기를 위한 폴백
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label style={{ 
        display: 'block', 
        marginBottom: '0.25rem', 
        fontSize: '0.875rem', 
        fontWeight: '500' 
      }}>
        {label}
      </label>

      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#2563eb' : '#d1d5db'}`,
            borderRadius: '0.5rem',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
            transition: 'all 0.2s'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {loading ? (
            <div style={{ color: '#6b7280' }}>
              {t.uploadingText}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '0.5rem' }}>
                <svg
                  style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    margin: '0 auto',
                    color: '#9ca3af'
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {t.dragDropText}
              </p>
              <p style={{ 
                color: '#2563eb', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                marginTop: '0.25rem'
              }}>
                {t.clickText}
              </p>
            </>
          )}
        </div>
      ) : (
        <div style={{
          border: '1px solid #d1d5db',
          borderRadius: '0.5rem',
          padding: '1rem',
          position: 'relative'
        }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              width: '100%',
              maxHeight: '200px',
              objectFit: 'contain',
              borderRadius: '0.375rem'
            }}
          />
          <div style={{
            marginTop: '0.75rem',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                flex: 1,
                padding: '0.25rem 0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {t.changeImage}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              style={{
                flex: 1,
                padding: '0.25rem 0.75rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {t.removeImage}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  );
}