'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { StorageService, UploadResult } from '@/lib/domain/services/storage.service';

export interface ProductImageUploadProps {
  productId: string;
  onUploadComplete?: (results: UploadResult[]) => void;
  onError?: (error: string) => void;
  currentImageCount?: number;
  maxImages?: number;
  compressImages?: boolean;
  optimizeForWeb?: boolean;
  createThumbnails?: boolean;
  className?: string;
}

interface ImageFile {
  file: File;
  preview: string;
  isMain: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  productId,
  onUploadComplete,
  onError,
  currentImageCount = 0,
  maxImages = 10,
  compressImages = false,
  optimizeForWeb = false,
  createThumbnails = false,
  className = ''
}) => {
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();
  const storageService = new StorageService(supabase);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `지원하지 않는 이미지 형식: ${file.name}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기는 10MB를 초과할 수 없습니다: ${file.name}`;
    }
    return null;
  };

  const processImageFiles = async (files: File[]): Promise<ImageFile[]> => {
    const processed: ImageFile[] = [];
    
    for (const file of files) {
      const error = validateImage(file);
      if (error) {
        setUploadError(error);
        onError?.(error);
        continue;
      }

      const preview = URL.createObjectURL(file);
      processed.push({
        file,
        preview,
        isMain: processed.length === 0 && selectedImages.length === 0 // First image is main
      });
    }

    return processed;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    setUploadError(null);

    // Check max images limit
    const totalImages = currentImageCount + selectedImages.length + files.length;
    if (totalImages > maxImages) {
      const error = `최대 ${maxImages}개까지 업로드 가능합니다. (현재: ${currentImageCount + selectedImages.length}개)`;
      setUploadError(error);
      onError?.(error);
      return;
    }

    const processed = await processImageFiles(files);
    setSelectedImages(prev => [...prev, ...processed]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, [currentImageCount, maxImages, selectedImages.length]);

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      // Update main image if necessary
      if (prev[index].isMain && newImages.length > 0) {
        newImages[0].isMain = true;
      }
      // Cleanup preview URL
      URL.revokeObjectURL(prev[index].preview);
      return newImages;
    });
  };

  const setMainImage = (index: number) => {
    setSelectedImages(prev => 
      prev.map((img, i) => ({
        ...img,
        isMain: i === index
      }))
    );
  };

  const moveImage = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    
    if (toIndex < 0 || toIndex >= selectedImages.length) return;

    setSelectedImages(prev => {
      const newImages = [...prev];
      [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
      return newImages;
    });
  };

  const processImageForUpload = async (file: File): Promise<File> => {
    let processedFile = file;

    // Compress image if enabled
    if (compressImages && file.size > 1024 * 1024) { // Only compress if > 1MB
      processedFile = await storageService.compressImage(processedFile, {
        maxSizeKB: 1024,
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1920
      });
    }

    // Optimize for web if enabled
    if (optimizeForWeb) {
      processedFile = await storageService.optimizeImageForWeb(processedFile);
    }

    return processedFile;
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({ current: 0, total: selectedImages.length });

    try {
      const results: UploadResult[] = [];
      
      for (let i = 0; i < selectedImages.length; i++) {
        const imageFile = selectedImages[i];
        
        // Update individual image upload status
        setSelectedImages(prev => 
          prev.map((img, idx) => 
            idx === i ? { ...img, isUploading: true, uploadProgress: 0 } : img
          )
        );

        try {
          // Process image before upload
          const processedFile = await processImageForUpload(imageFile.file);

          // Upload main image
          const result = await storageService.uploadProductImage(
            productId,
            processedFile,
            {
              metadata: {
                isMain: imageFile.isMain,
                order: i
              }
            }
          );

          results.push(result);

          // Create and upload thumbnail if enabled and upload was successful
          if (createThumbnails && result.success) {
            const thumbnail = await storageService.createThumbnail(processedFile, {
              width: 200,
              height: 200
            });
            
            await storageService.uploadProductImage(
              productId,
              thumbnail,
              {
                metadata: {
                  isThumbnail: true,
                  parentImage: result.path,
                  order: i
                }
              }
            );
          }

          // Update progress
          setUploadProgress(prev => ({ ...prev, current: i + 1 }));
          
          // Update individual image upload status
          setSelectedImages(prev => 
            prev.map((img, idx) => 
              idx === i 
                ? { ...img, isUploading: false, uploadProgress: 100 } 
                : img
            )
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '업로드 실패';
          
          // Update individual image error status
          setSelectedImages(prev => 
            prev.map((img, idx) => 
              idx === i 
                ? { ...img, isUploading: false, error: errorMsg } 
                : img
            )
          );
          
          results.push({
            success: false,
            error: errorMsg
          });
        }
      }

      // Check for errors
      const failedUploads = results.filter(r => !r.success);
      if (failedUploads.length > 0) {
        const errors = failedUploads.map(r => r.error).filter(Boolean).join('\n');
        setUploadError(errors);
        onError?.(errors);
      }

      // Call success callback
      onUploadComplete?.(results);

      // Clear successful uploads
      const successfulIndexes = results
        .map((r, i) => r.success ? i : -1)
        .filter(i => i >= 0);
      
      setSelectedImages(prev => 
        prev.filter((_, i) => !successfulIndexes.includes(i))
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드 실패';
      setUploadError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`product-image-upload ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-label="이미지 업로드"
        />

        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <p className="mt-2 text-sm text-gray-600">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
            disabled={isUploading}
          >
            클릭하거나 파일을 드래그
          </button>
          하여 업로드
        </p>
        <p className="text-xs text-gray-500 mt-1">
          jpg, png, webp (최대 10MB, 최대 {maxImages}개)
        </p>
        {(currentImageCount > 0 || selectedImages.length > 0) && (
          <p className="text-xs text-gray-600 mt-2">
            현재 이미지: {currentImageCount + selectedImages.length}/{maxImages}
          </p>
        )}
      </div>

      {/* Selected Images */}
      {selectedImages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            선택된 이미지 ({selectedImages.length}개)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {selectedImages.map((imageFile, index) => (
              <div
                key={index}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  imageFile.isMain 
                    ? 'border-indigo-500 ring-2 ring-indigo-200' 
                    : 'border-gray-200'
                }`}
              >
                <img
                  src={imageFile.preview}
                  alt={imageFile.file.name}
                  className="w-full h-32 object-cover"
                />

                {/* Main Badge */}
                {imageFile.isMain && (
                  <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded">
                    대표
                  </span>
                )}

                {/* Upload Status */}
                {imageFile.isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <svg className="animate-spin h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs">업로드 중...</span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {imageFile.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center p-2">
                    <p className="text-white text-xs text-center">{imageFile.error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-1">
                    {!imageFile.isMain && (
                      <button
                        type="button"
                        onClick={() => setMainImage(index)}
                        className="p-1 bg-white rounded hover:bg-gray-100"
                        aria-label="대표 이미지로 설정"
                        title="대표 이미지로 설정"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    )}
                    
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'up')}
                        className="p-1 bg-white rounded hover:bg-gray-100"
                        aria-label="앞으로 이동"
                        title="앞으로 이동"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    
                    {index < selectedImages.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'down')}
                        className="p-1 bg-white rounded hover:bg-gray-100"
                        aria-label="뒤로 이동"
                        title="뒤로 이동"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                      aria-label="제거"
                      title="제거"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* File Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                  <p className="text-xs text-white truncate">{imageFile.file.name}</p>
                  <p className="text-xs text-gray-300">{formatFileSize(imageFile.file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress.total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>업로드 중...</span>
            <span>{uploadProgress.current}/{uploadProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Upload Button */}
      {selectedImages.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || selectedImages.length === 0}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isUploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                업로드 중...
              </>
            ) : (
              '업로드'
            )}
          </button>
        </div>
      )}
    </div>
  );
};