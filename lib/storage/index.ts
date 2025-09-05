/**
 * 파일 업로드 및 스토리지 관리
 * Supabase Storage를 활용한 파일 관리 시스템
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase 클라이언트 (서버사이드용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 파일 타입 정의
export interface FileUploadOptions {
  bucket: string;
  path?: string;
  fileName?: string;
  metadata?: Record<string, any>;
  upsert?: boolean;
}

export interface FileUploadResult {
  success: boolean;
  data?: {
    id: string;
    path: string;
    publicUrl: string;
    metadata: FileMetadata;
  };
  error?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  bucket: string;
  uploadedBy?: string;
  uploadedAt: string;
  category?: 'product' | 'document' | 'avatar' | 'attachment' | 'receipt';
  tags?: string[];
  description?: string;
}

export interface FileSearchOptions {
  bucket?: string;
  category?: string;
  uploadedBy?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'size' | 'uploadedAt';
  sortOrder?: 'asc' | 'desc';
}

// 허용된 파일 타입
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  archives: ['application/zip', 'application/x-rar-compressed']
};

// 파일 크기 제한 (bytes)
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  other: 20 * 1024 * 1024 // 20MB
};

// 스토리지 버킷 설정
export const STORAGE_BUCKETS = {
  products: 'products',
  documents: 'documents',
  avatars: 'avatars',
  attachments: 'attachments',
  receipts: 'receipts',
  temp: 'temp'
};

// 파일 타입 검증
export function validateFileType(file: File, allowedTypes?: string[]): boolean {
  if (!allowedTypes) {
    // 기본 허용 타입들
    const allAllowedTypes = [
      ...ALLOWED_FILE_TYPES.images,
      ...ALLOWED_FILE_TYPES.documents,
      ...ALLOWED_FILE_TYPES.spreadsheets,
      ...ALLOWED_FILE_TYPES.archives
    ];
    return allAllowedTypes.includes(file.type);
  }
  
  return allowedTypes.includes(file.type);
}

// 파일 크기 검증
export function validateFileSize(file: File, maxSize?: number): boolean {
  if (!maxSize) {
    // 파일 타입에 따른 기본 크기 제한
    if (ALLOWED_FILE_TYPES.images.includes(file.type)) {
      maxSize = FILE_SIZE_LIMITS.image;
    } else if (ALLOWED_FILE_TYPES.documents.includes(file.type)) {
      maxSize = FILE_SIZE_LIMITS.document;
    } else {
      maxSize = FILE_SIZE_LIMITS.other;
    }
  }
  
  return file.size <= maxSize;
}

// 안전한 파일명 생성
export function generateSafeFileName(originalName: string, preserveExtension: boolean = true): string {
  const extension = preserveExtension ? originalName.split('.').pop() : '';
  const baseName = originalName.split('.').slice(0, -1).join('.');
  const safeName = baseName
    .replace(/[^a-zA-Z0-9가-힣]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
  
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0];
  
  return extension ? `${safeName}_${timestamp}_${uuid}.${extension}` : `${safeName}_${timestamp}_${uuid}`;
}

// 파일 업로드
export async function uploadFile(
  file: File, 
  options: FileUploadOptions
): Promise<FileUploadResult> {
  try {
    // 파일 검증
    if (!validateFileType(file)) {
      return {
        success: false,
        error: '허용되지 않는 파일 타입입니다.'
      };
    }

    if (!validateFileSize(file)) {
      return {
        success: false,
        error: '파일 크기가 너무 큽니다.'
      };
    }

    // 파일명 생성
    const fileName = options.fileName || generateSafeFileName(file.name);
    const filePath = options.path ? `${options.path}/${fileName}` : fileName;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: options.upsert || false
      });

    if (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(data.path);

    // 메타데이터 생성 및 저장
    const metadata: FileMetadata = {
      id: uuidv4(),
      name: file.name,
      size: file.size,
      type: file.type,
      path: data.path,
      bucket: options.bucket,
      uploadedAt: new Date().toISOString(),
      category: options.metadata?.category,
      tags: options.metadata?.tags || [],
      description: options.metadata?.description,
      uploadedBy: options.metadata?.uploadedBy
    };

    // 메타데이터를 데이터베이스에 저장
    const { error: metadataError } = await supabase
      .from('file_metadata')
      .insert(metadata);

    if (metadataError) {
      console.error('Metadata save error:', metadataError);
      // 파일은 업로드됐지만 메타데이터 저장 실패
    }

    return {
      success: true,
      data: {
        id: metadata.id,
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
        metadata
      }
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    };
  }
}

// 다중 파일 업로드
export async function uploadMultipleFiles(
  files: File[],
  options: FileUploadOptions,
  onProgress?: (progress: { completed: number; total: number; currentFile: string }) => void
): Promise<{
  successful: FileUploadResult[];
  failed: { file: File; error: string }[];
}> {
  const successful: FileUploadResult[] = [];
  const failed: { file: File; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    onProgress?.({
      completed: i,
      total: files.length,
      currentFile: file.name
    });

    const result = await uploadFile(file, {
      ...options,
      fileName: generateSafeFileName(file.name)
    });

    if (result.success) {
      successful.push(result);
    } else {
      failed.push({
        file,
        error: result.error || '업로드 실패'
      });
    }
  }

  onProgress?.({
    completed: files.length,
    total: files.length,
    currentFile: ''
  });

  return { successful, failed };
}

// 파일 삭제
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('File delete error:', error);
      return false;
    }

    // 메타데이터도 삭제
    const { error: metadataError } = await supabase
      .from('file_metadata')
      .delete()
      .eq('path', path)
      .eq('bucket', bucket);

    if (metadataError) {
      console.error('Metadata delete error:', metadataError);
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

// 파일 메타데이터 조회
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      console.error('Get metadata error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get metadata error:', error);
    return null;
  }
}

// 파일 검색
export async function searchFiles(options: FileSearchOptions): Promise<{
  files: FileMetadata[];
  total: number;
}> {
  try {
    let query = supabase
      .from('file_metadata')
      .select('*', { count: 'exact' });

    // 필터 적용
    if (options.bucket) {
      query = query.eq('bucket', options.bucket);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.uploadedBy) {
      query = query.eq('uploadedBy', options.uploadedBy);
    }

    if (options.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }

    if (options.dateFrom) {
      query = query.gte('uploadedAt', options.dateFrom.toISOString());
    }

    if (options.dateTo) {
      query = query.lte('uploadedAt', options.dateTo.toISOString());
    }

    // 정렬
    const sortBy = options.sortBy || 'uploadedAt';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 페이징
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Search files error:', error);
      return { files: [], total: 0 };
    }

    return {
      files: data || [],
      total: count || 0
    };

  } catch (error) {
    console.error('Search files error:', error);
    return { files: [], total: 0 };
  }
}

// 파일 공개 URL 생성
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// 서명된 URL 생성 (임시 액세스용)
export async function getSignedUrl(
  bucket: string, 
  path: string, 
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Create signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Create signed URL error:', error);
    return null;
  }
}

// 파일 다운로드
export async function downloadFile(bucket: string, path: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Download file error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Download file error:', error);
    return null;
  }
}

// 이미지 리사이징 (Supabase Transform 사용)
export function getResizedImageUrl(
  bucket: string,
  path: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }
): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path, {
      transform: {
        width: options.width,
        height: options.height,
        quality: options.quality,
        format: options.format
      }
    });
  
  return data.publicUrl;
}

// 스토리지 사용량 통계
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  byCategory: Record<string, { count: number; size: number }>;
  byBucket: Record<string, { count: number; size: number }>;
}> {
  try {
    const { data: files, error } = await supabase
      .from('file_metadata')
      .select('size, category, bucket');

    if (error) {
      console.error('Get storage stats error:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byCategory: {},
        byBucket: {}
      };
    }

    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    const byCategory: Record<string, { count: number; size: number }> = {};
    const byBucket: Record<string, { count: number; size: number }> = {};

    files.forEach(file => {
      // 카테고리별
      if (file.category) {
        if (!byCategory[file.category]) {
          byCategory[file.category] = { count: 0, size: 0 };
        }
        byCategory[file.category].count++;
        byCategory[file.category].size += file.size;
      }

      // 버킷별
      if (!byBucket[file.bucket]) {
        byBucket[file.bucket] = { count: 0, size: 0 };
      }
      byBucket[file.bucket].count++;
      byBucket[file.bucket].size += file.size;
    });

    return {
      totalFiles,
      totalSize,
      byCategory,
      byBucket
    };

  } catch (error) {
    console.error('Get storage stats error:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      byCategory: {},
      byBucket: {}
    };
  }
}

// 파일 메타데이터 업데이트
export async function updateFileMetadata(
  fileId: string,
  updates: Partial<Pick<FileMetadata, 'name' | 'category' | 'tags' | 'description'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('file_metadata')
      .update(updates)
      .eq('id', fileId);

    if (error) {
      console.error('Update metadata error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Update metadata error:', error);
    return false;
  }
}

// 임시 파일 정리 (cron job용)
export async function cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    // 임시 버킷의 오래된 파일들 조회
    const { data: tempFiles, error } = await supabase
      .from('file_metadata')
      .select('path')
      .eq('bucket', STORAGE_BUCKETS.temp)
      .lt('uploadedAt', cutoffDate.toISOString());

    if (error) {
      console.error('Get temp files error:', error);
      return 0;
    }

    if (!tempFiles || tempFiles.length === 0) {
      return 0;
    }

    // 파일들 삭제
    const filePaths = tempFiles.map(f => f.path);
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKETS.temp)
      .remove(filePaths);

    if (deleteError) {
      console.error('Delete temp files error:', deleteError);
      return 0;
    }

    // 메타데이터 삭제
    const { error: metadataError } = await supabase
      .from('file_metadata')
      .delete()
      .eq('bucket', STORAGE_BUCKETS.temp)
      .lt('uploadedAt', cutoffDate.toISOString());

    if (metadataError) {
      console.error('Delete temp metadata error:', metadataError);
    }

    return tempFiles.length;
  } catch (error) {
    console.error('Cleanup temp files error:', error);
    return 0;
  }
}

// 파일 크기를 사람이 읽기 쉬운 형태로 변환
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}