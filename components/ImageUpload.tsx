'use client';

import { useState, useRef } from 'react';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (url: string) => void;
  type?: 'product' | 'shipment';
  locale?: string;
}

export default function ImageUpload({ 
  currentImage, 
  onImageChange, 
  type = 'product',
  locale = 'ko' 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImage || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const texts = {
    ko: {
      selectImage: '이미지 선택',
      changeImage: '이미지 변경',
      uploading: '업로드 중...',
      uploadFailed: '업로드 실패',
      maxSize: '최대 5MB',
      formats: 'JPEG, PNG, WebP',
      dragDrop: '여기에 이미지를 드래그하거나 클릭하여 선택',
      remove: '제거'
    },
    'zh-CN': {
      selectImage: '选择图片',
      changeImage: '更改图片',
      uploading: '上传中...',
      uploadFailed: '上传失败',
      maxSize: '最大 5MB',
      formats: 'JPEG, PNG, WebP',
      dragDrop: '将图片拖到此处或点击选择',
      remove: '删除'
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert(t.formats);
      return;
    }

    // 파일 크기 체크
    if (file.size > 5 * 1024 * 1024) {
      alert(t.maxSize);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // 미리보기 URL 설정
      setPreviewUrl(data.url);
      
      // 부모 컴포넌트에 URL 전달
      onImageChange(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert(t.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute top-2 right-2 space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-white text-gray-700 text-sm rounded-lg shadow hover:bg-gray-50"
            >
              {t.changeImage}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg shadow hover:bg-red-600"
            >
              {t.remove}
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          {uploading ? (
            <div className="text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>{t.uploading}</p>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm">{t.dragDrop}</p>
              <p className="text-xs mt-1">{t.maxSize} • {t.formats}</p>
            </div>
          )}
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}