/**
 * Supabase Storage 연동 서비스
 * 상품 이미지, 송장 사진 등 파일 업로드 및 관리
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface FileUploadOptions {
  directory?: string;
  generateUniqueName?: boolean;
  metadata?: Record<string, any>;
  contentType?: string;
  upsert?: boolean;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BatchUploadOptions {
  directory?: string;
  parallel?: boolean;
  maxConcurrent?: number;
}

export interface StorageUsage {
  totalSize: number;
  fileCount: number;
  formattedSize: string;
}

export interface ImageCompressionOptions {
  maxSizeKB: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ShipmentPhotoMetadata {
  orderId: string;
  trackingNo?: string;
  courier?: string;
  photoType?: 'tracking' | 'package' | 'receipt';
  timestamp?: string;
}

/**
 * Storage 서비스
 */
export class StorageService {
  private readonly PRODUCT_IMAGES_BUCKET = 'product-images';
  private readonly SHIPMENT_PHOTOS_BUCKET = 'shipment-photos';
  private readonly DOCUMENTS_BUCKET = 'documents';
  
  constructor(private supabase: SupabaseClient) {}

  /**
   * 파일 타입 검증
   */
  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  /**
   * 파일 크기 검증 (MB 단위)
   */
  validateFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * 이미지 치수 검증
   */
  async validateImageDimensions(
    image: HTMLImageElement | { width: number; height: number },
    options: { maxWidth?: number; maxHeight?: number; minWidth?: number; minHeight?: number }
  ): Promise<boolean> {
    const { width, height } = image;
    
    if (options.maxWidth && width > options.maxWidth) return false;
    if (options.maxHeight && height > options.maxHeight) return false;
    if (options.minWidth && width < options.minWidth) return false;
    if (options.minHeight && height < options.minHeight) return false;
    
    return true;
  }

  /**
   * 유니크한 파일 이름 생성
   */
  generateUniqueFileName(file: File): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(file.name);
    const baseName = this.sanitizeFileName(file.name).replace(`.${extension}`, '');
    
    return `${baseName}-${timestamp}-${randomString}.${extension}`.toLowerCase();
  }

  /**
   * 파일 이름 정리
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 파일 확장자 추출
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * 상품 이미지 업로드
   */
  async uploadProductImage(
    productId: string,
    file: File,
    options?: FileUploadOptions
  ): Promise<UploadResult> {
    try {
      // 파일 검증
      if (!this.validateFileType(file, ['image/jpeg', 'image/png', 'image/webp'])) {
        return { success: false, error: '지원하지 않는 파일 형식입니다' };
      }

      if (!this.validateFileSize(file, 10)) {
        return { success: false, error: '파일 크기는 10MB를 초과할 수 없습니다' };
      }

      // 파일 경로 생성
      const fileName = options?.generateUniqueName !== false 
        ? this.generateUniqueFileName(file)
        : this.sanitizeFileName(file.name);
      
      const path = `products/${productId}/${fileName}`;

      // 업로드
      const { data, error } = await this.supabase.storage
        .from(this.PRODUCT_IMAGES_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: options?.upsert ?? false,
          metadata: options?.metadata
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Public URL 생성
      const url = this.getPublicUrl(this.PRODUCT_IMAGES_BUCKET, path);

      return {
        success: true,
        path: data.path,
        url,
        metadata: options?.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '업로드 실패'
      };
    }
  }

  /**
   * 여러 상품 이미지 업로드
   */
  async uploadMultipleProductImages(
    productId: string,
    files: File[]
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => 
      this.uploadProductImage(productId, file)
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * 송장 사진 업로드
   */
  async uploadShipmentPhoto(
    orderId: string,
    file: File,
    metadata: ShipmentPhotoMetadata
  ): Promise<UploadResult> {
    try {
      // 파일 검증
      if (!this.validateFileType(file, ['image/jpeg', 'image/png', 'application/pdf'])) {
        return { success: false, error: '지원하지 않는 파일 형식입니다' };
      }

      if (!this.validateFileSize(file, 20)) {
        return { success: false, error: '파일 크기는 20MB를 초과할 수 없습니다' };
      }

      // 파일 경로 생성
      const fileName = this.generateUniqueFileName(file);
      const path = `shipments/${orderId}/${fileName}`;

      // 업로드
      const { data, error } = await this.supabase.storage
        .from(this.SHIPMENT_PHOTOS_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          metadata: {
            ...metadata,
            timestamp: metadata.timestamp || new Date().toISOString()
          }
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        path: data.path,
        url: this.getPublicUrl(this.SHIPMENT_PHOTOS_BUCKET, path),
        metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '업로드 실패'
      };
    }
  }

  /**
   * 여러 송장 사진 업로드
   */
  async uploadShipmentPhotos(
    orderId: string,
    photos: Array<{ file: File; type?: string; metadata?: Record<string, any> }>
  ): Promise<UploadResult[]> {
    const uploadPromises = photos.map(({ file, type, metadata }) =>
      this.uploadShipmentPhoto(orderId, file, {
        orderId,
        photoType: type as any,
        ...metadata
      })
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * Public URL 생성
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * Signed URL 생성 (프라이빗 파일)
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  }

  /**
   * 파일 삭제
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);
    
    return !error;
  }

  /**
   * 디렉토리 파일 목록
   */
  async listFiles(bucket: string, directory: string): Promise<any[]> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(directory);
    
    if (error) {
      console.error('Failed to list files:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * 이미지 압축
   */
  async compressImage(
    file: File,
    options: ImageCompressionOptions
  ): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // 크기 계산
          let { width, height } = img;
          
          if (options.maxWidth && width > options.maxWidth) {
            height = (options.maxWidth / width) * height;
            width = options.maxWidth;
          }
          
          if (options.maxHeight && height > options.maxHeight) {
            width = (options.maxHeight / height) * width;
            height = options.maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 이미지 그리기
          ctx.drawImage(img, 0, 0, width, height);
          
          // Blob으로 변환
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name,
                  { type: file.type }
                );
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            options.quality || 0.8
          );
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * 썸네일 생성
   */
  async createThumbnail(
    file: File,
    options: { width: number; height: number }
  ): Promise<File> {
    return this.compressImage(file, {
      maxSizeKB: 200,
      maxWidth: options.width,
      maxHeight: options.height,
      quality: 0.8
    }).then(compressed => {
      return new File(
        [compressed],
        `thumb-${file.name}`,
        { type: file.type }
      );
    });
  }

  /**
   * 웹 최적화 이미지
   */
  async optimizeImageForWeb(file: File): Promise<File> {
    return this.compressImage(file, {
      maxSizeKB: 1024,
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85
    });
  }

  /**
   * 이미지 포맷 변환
   */
  async convertImageFormat(
    file: File,
    targetFormat: 'jpeg' | 'png' | 'webp'
  ): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const mimeType = `image/${targetFormat}`;
          const extension = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
          const newFileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const convertedFile = new File(
                  [blob],
                  newFileName,
                  { type: mimeType }
                );
                resolve(convertedFile);
              } else {
                resolve(file);
              }
            },
            mimeType,
            0.9
          );
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * 배치 업로드
   */
  async batchUpload(
    bucket: string,
    files: File[],
    options?: BatchUploadOptions
  ): Promise<UploadResult[]> {
    const uploadFile = async (file: File): Promise<UploadResult> => {
      try {
        const fileName = this.generateUniqueFileName(file);
        const path = options?.directory 
          ? `${options.directory}/${fileName}`
          : fileName;

        const { data, error } = await this.supabase.storage
          .from(bucket)
          .upload(path, file, {
            contentType: file.type
          });

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          path: data.path,
          url: this.getPublicUrl(bucket, path)
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '업로드 실패'
        };
      }
    };

    if (options?.parallel) {
      // 병렬 업로드
      const maxConcurrent = options.maxConcurrent || 3;
      const results: UploadResult[] = [];
      
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(batch.map(uploadFile));
        results.push(...batchResults);
      }
      
      return results;
    } else {
      // 순차 업로드
      const results: UploadResult[] = [];
      
      for (const file of files) {
        const result = await uploadFile(file);
        results.push(result);
      }
      
      return results;
    }
  }

  /**
   * Storage 사용량 확인
   */
  async getStorageUsage(bucket: string): Promise<StorageUsage> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list('', { limit: 1000 });
    
    if (error || !data) {
      return {
        totalSize: 0,
        fileCount: 0,
        formattedSize: '0 MB'
      };
    }

    const totalSize = data.reduce((sum, file) => sum + (file.size || 0), 0);
    const fileCount = data.length;
    const formattedSize = this.formatFileSize(totalSize);

    return {
      totalSize,
      fileCount,
      formattedSize
    };
  }

  /**
   * 할당량 초과 확인
   */
  async isQuotaExceeded(bucket: string, limitMB: number): Promise<boolean> {
    const usage = await this.getStorageUsage(bucket);
    const limitBytes = limitMB * 1024 * 1024;
    return usage.totalSize > limitBytes;
  }

  /**
   * 파일 크기 포맷팅
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}