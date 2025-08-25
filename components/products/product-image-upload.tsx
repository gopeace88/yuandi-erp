'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ProductImageUploadProps {
  onImageUpload: (file: File) => void;
  currentImage?: string;
  locale?: 'ko' | 'zh-CN';
}

export function ProductImageUpload({ 
  onImageUpload, 
  currentImage,
  locale = 'ko' 
}: ProductImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages = {
    'ko': {
      upload: '이미지 업로드',
      dragDrop: '이미지를 드래그하거나 클릭하여 선택',
      change: '이미지 변경',
      remove: '삭제',
      required: '* 제품 구분을 위해 이미지는 필수입니다'
    },
    'zh-CN': {
      upload: '上传图片',
      dragDrop: '拖放图片或点击选择',
      change: '更改图片',
      remove: '删除',
      required: '* 为了区分产品，图片是必需的'
    }
  };

  const t = (key: keyof typeof messages.ko) => messages[locale][key];

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {t('upload')}
      </label>
      
      {!preview ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {t('dragDrop')}
          </p>
          <p className="mt-1 text-xs text-red-500">
            {t('required')}
          </p>
        </div>
      ) : (
        <div className="relative group">
          <img
            src={preview}
            alt="Product"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute top-2 right-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleClick}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
              title={t('change')}
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
              title={t('remove')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}