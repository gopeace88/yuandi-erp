'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { StorageService, UploadResult, ShipmentPhotoMetadata } from '@/lib/domain/services/storage.service';

export interface ShipmentPhotoUploadProps {
  orderId: string;
  onUploadComplete?: (results: UploadResult[]) => void;
  onError?: (error: string) => void;
  label?: string;
  multiple?: boolean;
  includeTrackingInfo?: boolean;
  showPreview?: boolean;
  resetAfterUpload?: boolean;
  className?: string;
}

interface FileWithMetadata {
  file: File;
  preview?: string;
  type?: 'tracking' | 'package' | 'receipt';
  trackingNo?: string;
  courier?: string;
}

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const COURIER_OPTIONS = [
  { value: 'CJ대한통운', label: 'CJ대한통운' },
  { value: '한진택배', label: '한진택배' },
  { value: '우체국택배', label: '우체국택배' },
  { value: '롯데택배', label: '롯데택배' },
  { value: '로젠택배', label: '로젠택배' },
  { value: 'EMS', label: 'EMS' },
  { value: 'DHL', label: 'DHL' },
  { value: 'FedEx', label: 'FedEx' },
  { value: '기타', label: '기타' }
];

export const ShipmentPhotoUpload: React.FC<ShipmentPhotoUploadProps> = ({
  orderId,
  onUploadComplete,
  onError,
  label = '송장 사진 업로드',
  multiple = false,
  includeTrackingInfo = false,
  showPreview = false,
  resetAfterUpload = false,
  className = ''
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();
  const storageService = new StorageService(supabase);

  // Generate preview URLs for images
  useEffect(() => {
    if (!showPreview) return;

    selectedFiles.forEach(fileData => {
      if (fileData.file.type.startsWith('image/') && !fileData.preview) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFiles(prev => 
            prev.map(f => 
              f.file === fileData.file 
                ? { ...f, preview: reader.result as string }
                : f
            )
          );
        };
        reader.readAsDataURL(fileData.file);
      }
    });

    // Cleanup preview URLs
    return () => {
      selectedFiles.forEach(fileData => {
        if (fileData.preview) {
          URL.revokeObjectURL(fileData.preview);
        }
      });
    };
  }, [selectedFiles, showPreview]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `지원하지 않는 파일 형식: ${file.name}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기는 20MB를 초과할 수 없습니다: ${file.name}`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadError(null);

    const validatedFiles: FileWithMetadata[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validatedFiles.push({
          file,
          type: 'tracking' // Default type
        });
      }
    });

    if (errors.length > 0) {
      const errorMessage = errors.join('\n');
      setUploadError(errorMessage);
      onError?.(errorMessage);
      return;
    }

    if (multiple) {
      setSelectedFiles(prev => [...prev, ...validatedFiles]);
    } else {
      setSelectedFiles(validatedFiles);
    }
  };

  const updateFileMetadata = (index: number, updates: Partial<FileWithMetadata>) => {
    setSelectedFiles(prev => 
      prev.map((f, i) => i === index ? { ...f, ...updates } : f)
    );
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let results: UploadResult[];

      if (selectedFiles.length === 1) {
        // Single file upload
        const fileData = selectedFiles[0];
        const metadata: ShipmentPhotoMetadata = {
          orderId,
          photoType: fileData.type,
          trackingNo: fileData.trackingNo,
          courier: fileData.courier,
          timestamp: new Date().toISOString()
        };

        const result = await storageService.uploadShipmentPhoto(
          orderId,
          fileData.file,
          metadata
        );

        results = [result];
      } else {
        // Multiple file upload
        const photosToUpload = selectedFiles.map(fileData => ({
          file: fileData.file,
          type: fileData.type,
          metadata: {
            trackingNo: fileData.trackingNo,
            courier: fileData.courier
          }
        }));

        results = await storageService.uploadShipmentPhotos(orderId, photosToUpload);
      }

      // Check for errors
      const failedUploads = results.filter(r => !r.success);
      if (failedUploads.length > 0) {
        const errors = failedUploads.map(r => r.error).filter(Boolean).join('\n');
        setUploadError(errors);
        onError?.(errors);
      }

      // Call success callback with all results
      onUploadComplete?.(results);

      // Reset if configured
      if (resetAfterUpload && failedUploads.length === 0) {
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드 실패';
      setUploadError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
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
    <div className={`shipment-photo-upload ${className}`}>
      <div className="upload-section">
        <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          accept={ALLOWED_FILE_TYPES.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          aria-label={label}
          disabled={isUploading}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isUploading}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          파일 선택
        </button>
        
        <p className="mt-1 text-xs text-gray-500">
          지원 형식: jpg, png, pdf (최대 20MB)
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            선택된 파일: {selectedFiles.length}개
          </p>
          
          <div className="space-y-3">
            {selectedFiles.map((fileData, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start space-x-3">
                  {showPreview && (
                    <div className="flex-shrink-0 w-20 h-20">
                      {fileData.file.type.startsWith('image/') ? (
                        fileData.preview ? (
                          <img
                            src={fileData.preview}
                            alt={fileData.file.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded animate-pulse" />
                        )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded">
                          <span className="text-2xl">📄</span>
                          <span className="text-xs mt-1">PDF 문서</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{fileData.file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(fileData.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                        aria-label={`${fileData.file.name} 제거`}
                        disabled={isUploading}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label htmlFor={`type-${index}`} className="block text-xs text-gray-600">
                          사진 유형
                        </label>
                        <select
                          id={`type-${index}`}
                          value={fileData.type}
                          onChange={(e) => updateFileMetadata(index, { type: e.target.value as any })}
                          className="mt-1 block w-full text-sm border-gray-300 rounded-md"
                          disabled={isUploading}
                        >
                          <option value="tracking">송장</option>
                          <option value="package">포장</option>
                          <option value="receipt">영수증</option>
                        </select>
                      </div>
                      
                      {includeTrackingInfo && (
                        <>
                          <div>
                            <label htmlFor={`tracking-${index}`} className="block text-xs text-gray-600">
                              운송장 번호
                            </label>
                            <input
                              id={`tracking-${index}`}
                              type="text"
                              value={fileData.trackingNo || ''}
                              onChange={(e) => updateFileMetadata(index, { trackingNo: e.target.value })}
                              className="mt-1 block w-full text-sm border-gray-300 rounded-md"
                              placeholder="선택사항"
                              disabled={isUploading}
                            />
                          </div>
                          
                          <div>
                            <label htmlFor={`courier-${index}`} className="block text-xs text-gray-600">
                              택배사
                            </label>
                            <select
                              id={`courier-${index}`}
                              value={fileData.courier || ''}
                              onChange={(e) => updateFileMetadata(index, { courier: e.target.value })}
                              className="mt-1 block w-full text-sm border-gray-300 rounded-md"
                              disabled={isUploading}
                            >
                              <option value="">선택</option>
                              {COURIER_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mt-3 text-sm text-red-600">
          {uploadError}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
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