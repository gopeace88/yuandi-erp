/**
 * 파일 업로드 컴포넌트
 * 드래그 앤 드롭 및 다중 파일 업로드 지원
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload,
  X,
  File,
  Image,
  FileText,
  Archive,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import { formatFileSize } from '@/lib/storage';
import { toast } from 'sonner';

interface FileUploadProps {
  bucket: string;
  path?: string;
  category?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // bytes
  allowedTypes?: string[];
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface UploadFile extends File {
  id: string;
  preview?: string;
}

interface UploadedFile {
  id: string;
  path: string;
  publicUrl: string;
  name: string;
  size: number;
  type: string;
}

interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const FILE_ICONS = {
  'image/': <Image className="w-8 h-8 text-blue-500" />,
  'application/pdf': <FileText className="w-8 h-8 text-red-500" />,
  'text/': <FileText className="w-8 h-8 text-gray-500" />,
  'application/zip': <Archive className="w-8 h-8 text-yellow-500" />,
  'application/x-rar': <Archive className="w-8 h-8 text-yellow-500" />,
  default: <File className="w-8 h-8 text-gray-500" />
};

const getFileIcon = (fileType: string) => {
  for (const [type, icon] of Object.entries(FILE_ICONS)) {
    if (fileType.startsWith(type)) {
      return icon;
    }
  }
  return FILE_ICONS.default;
};

export default function FileUpload({
  bucket,
  path,
  category,
  multiple = false,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  allowedTypes,
  onUploadComplete,
  onUploadError,
  disabled = false,
  className = ''
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 파일 검증
  const validateFile = useCallback((file: File): string | null => {
    // 크기 검증
    if (file.size > maxSize) {
      return `파일 크기가 너무 큽니다. (최대: ${formatFileSize(maxSize)})`;
    }

    // 타입 검증
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return '허용되지 않는 파일 형식입니다.';
    }

    return null;
  }, [maxSize, allowedTypes]);

  // 파일 추가
  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: UploadFile[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      // 중복 검사
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name}: 이미 추가된 파일입니다.`);
        continue;
      }

      // 파일 수 제한 검사
      if (!multiple && files.length + validFiles.length >= 1) {
        errors.push('단일 파일만 업로드 가능합니다.');
        break;
      }

      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`최대 ${maxFiles}개의 파일만 업로드 가능합니다.`);
        break;
      }

      // 파일 검증
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        continue;
      }

      // 미리보기 생성 (이미지인 경우)
      const uploadFile: UploadFile = Object.assign(file, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });

      validFiles.push(uploadFile);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }

    if (errors.length > 0) {
      onUploadError?.(errors.join('\n'));
      toast.error(`업로드 오류: ${errors.length}개 파일에 문제가 있습니다.`);
    }
  }, [files, multiple, maxFiles, validateFile, onUploadError]);

  // 파일 제거
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // 미리보기 URL 정리
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
    
    setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
  }, []);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // input 값 리셋
    event.target.value = '';
  }, [addFiles]);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!dropZoneRef.current?.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  // 파일 업로드
  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading || disabled) return;

    setIsUploading(true);
    const successfulUploads: UploadedFile[] = [];
    
    try {
      for (const file of files) {
        setUploadProgress(prev => [
          ...prev.filter(p => p.fileId !== file.id),
          { fileId: file.id, progress: 0, status: 'uploading' }
        ]);

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('bucket', bucket);
          if (path) formData.append('path', path);
          if (category) formData.append('category', category);
          if (tags.trim()) formData.append('tags', tags.trim());
          if (description.trim()) formData.append('description', description.trim());

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const result = await response.json();
          
          successfulUploads.push({
            id: result.data.id,
            path: result.data.path,
            publicUrl: result.data.publicUrl,
            name: file.name,
            size: file.size,
            type: file.type
          });

          setUploadProgress(prev => prev.map(p =>
            p.fileId === file.id 
              ? { ...p, progress: 100, status: 'completed' }
              : p
          ));

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          
          setUploadProgress(prev => prev.map(p =>
            p.fileId === file.id 
              ? { ...p, status: 'error', error: errorMessage }
              : p
          ));

          console.error(`Upload failed for ${file.name}:`, error);
        }
      }

      if (successfulUploads.length > 0) {
        onUploadComplete?.(successfulUploads);
        toast.success(`${successfulUploads.length}개 파일이 업로드되었습니다.`);
        
        // 성공한 파일들 제거
        const successfulIds = successfulUploads.map(f => {
          const originalFile = files.find(file => 
            file.name === f.name && file.size === f.size
          );
          return originalFile?.id;
        }).filter(Boolean) as string[];
        
        setFiles(prev => prev.filter(f => !successfulIds.includes(f.id)));
        
        // 입력 필드 초기화
        setTags('');
        setDescription('');
      }

      const failedCount = files.length - successfulUploads.length;
      if (failedCount > 0) {
        onUploadError?.(`${failedCount}개 파일 업로드에 실패했습니다.`);
        toast.error(`${failedCount}개 파일 업로드 실패`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
      toast.error('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [files, bucket, path, category, tags, description, isUploading, disabled, onUploadComplete, onUploadError]);

  // 전체 진행률 계산
  const overallProgress = uploadProgress.length > 0 
    ? uploadProgress.reduce((sum, p) => sum + p.progress, 0) / uploadProgress.length
    : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 드롭존 */}
      <Card>
        <CardContent className="p-6">
          <div
            ref={dropZoneRef}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : disabled 
                ? 'border-gray-200 bg-gray-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={allowedTypes?.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
            />
            
            <Upload className={`w-12 h-12 mx-auto mb-4 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
            
            <div className="space-y-2">
              <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                {isDragOver 
                  ? '파일을 여기에 드롭하세요' 
                  : '파일을 드래그하거나 클릭하여 선택하세요'
                }
              </p>
              
              <div className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>
                  {multiple 
                    ? `최대 ${maxFiles}개 파일` 
                    : '단일 파일'
                  } · 최대 {formatFileSize(maxSize)}
                </p>
                {allowedTypes && (
                  <p className="mt-1">
                    지원 형식: {allowedTypes.map(type => type.split('/')[1]).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 선택된 파일 목록 */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">선택된 파일 ({files.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
                    setFiles([]);
                    setUploadProgress([]);
                  }}
                  disabled={isUploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  전체 제거
                </Button>
              </div>
              
              <div className="space-y-2">
                {files.map((file) => {
                  const progress = uploadProgress.find(p => p.fileId === file.id);
                  
                  return (
                    <div key={file.id} className="flex items-center space-x-3 p-2 border rounded">
                      {/* 파일 아이콘/미리보기 */}
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img 
                            src={file.preview} 
                            alt={file.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          getFileIcon(file.type)
                        )}
                      </div>
                      
                      {/* 파일 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        
                        {progress && (
                          <div className="mt-1">
                            {progress.status === 'uploading' && (
                              <div className="space-y-1">
                                <Progress value={progress.progress} className="h-1" />
                                <p className="text-xs text-gray-500">
                                  업로드 중... {Math.round(progress.progress)}%
                                </p>
                              </div>
                            )}
                            
                            {progress.status === 'completed' && (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span className="text-xs">완료</span>
                              </div>
                            )}
                            
                            {progress.status === 'error' && (
                              <div className="flex items-center text-red-600">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                <span className="text-xs">{progress.error}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* 상태 및 제거 버튼 */}
                      <div className="flex items-center space-x-2">
                        {progress?.status === 'completed' && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            완료
                          </Badge>
                        )}
                        
                        {progress?.status === 'error' && (
                          <Badge variant="destructive">
                            실패
                          </Badge>
                        )}
                        
                        {progress?.status === 'uploading' && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          disabled={isUploading && progress?.status === 'uploading'}
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메타데이터 입력 */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h4 className="font-medium">파일 정보</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">태그</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="태그1, 태그2, 태그3"
                  disabled={isUploading}
                />
                <p className="text-xs text-gray-500">쉼표로 구분하여 입력</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="파일 설명"
                  disabled={isUploading}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 업로드 진행률 */}
      {isUploading && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">전체 업로드 진행률</span>
                <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 업로드 버튼 */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={uploadFiles}
            disabled={isUploading || disabled}
            className="min-w-32"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                업로드 ({files.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}