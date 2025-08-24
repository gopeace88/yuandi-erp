/**
 * File Upload Security Module for YUANDI
 * 
 * Provides comprehensive security for file uploads including
 * validation, sanitization, virus scanning simulation, and storage
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { InputValidator } from './input-validation'

/**
 * File upload configuration
 */
export const UPLOAD_CONFIG = {
  // Maximum file sizes by type (in bytes)
  maxSizes: {
    image: 5 * 1024 * 1024,        // 5MB
    document: 10 * 1024 * 1024,    // 10MB
    excel: 15 * 1024 * 1024,       // 15MB
    default: 5 * 1024 * 1024,      // 5MB
  },

  // Allowed MIME types
  allowedMimeTypes: {
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    excel: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },

  // Allowed file extensions
  allowedExtensions: {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    document: ['.pdf', '.doc', '.docx'],
    excel: ['.xls', '.xlsx', '.csv'],
  },

  // Image processing options
  imageProcessing: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
    formats: ['jpeg', 'webp'] as const,
  },

  // Storage paths
  storagePaths: {
    products: 'products',
    orders: 'orders',
    tracking: 'tracking',
    temp: 'temp',
  },
}

/**
 * File type detection based on magic numbers
 */
const FILE_SIGNATURES = {
  // Images
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47], // PNG
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38], // GIF
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP)
  ],
  
  // Documents
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
  
  // Microsoft Office
  'application/vnd.ms-excel': [
    [0xD0, 0xCF, 0x11, 0xE0], // OLE header
  ],
  'application/zip': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP (used by modern Office formats)
  ],
}

/**
 * Malicious content patterns
 */
const MALICIOUS_PATTERNS = {
  // Script injections
  scripts: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ],
  
  // Executable content
  executables: [
    /\.exe$/i,
    /\.dll$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.sh$/i,
    /\.app$/i,
  ],
  
  // PHP/Server-side scripts
  serverScripts: [
    /\.php\d?$/i,
    /\.asp(x)?$/i,
    /\.jsp$/i,
    /\.cgi$/i,
  ],
}

/**
 * File upload security manager
 */
export class FileUploadSecurity {
  private supabase: any
  private validationErrors: string[] = []

  constructor(
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Comprehensive file validation
   */
  async validateFile(
    file: File | Buffer,
    options: {
      type?: 'image' | 'document' | 'excel'
      maxSize?: number
      allowedMimeTypes?: string[]
      allowedExtensions?: string[]
      validateContent?: boolean
    } = {}
  ): Promise<{
    valid: boolean
    errors: string[]
    sanitizedFileName?: string
    fileInfo?: {
      size: number
      mimeType: string
      extension: string
    }
  }> {
    this.validationErrors = []
    
    const fileBuffer = file instanceof File ? 
      Buffer.from(await file.arrayBuffer()) : file
    
    const fileName = file instanceof File ? file.name : 'unknown'
    const fileSize = file instanceof File ? file.size : fileBuffer.length
    const fileMimeType = file instanceof File ? file.type : 'application/octet-stream'

    // 1. Check file size
    const maxSize = options.maxSize || 
      (options.type ? UPLOAD_CONFIG.maxSizes[options.type] : UPLOAD_CONFIG.maxSizes.default)
    
    if (fileSize > maxSize) {
      this.validationErrors.push(
        `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`
      )
    }

    // 2. Validate file extension
    const extension = this.getFileExtension(fileName)
    const allowedExtensions = options.allowedExtensions || 
      (options.type ? UPLOAD_CONFIG.allowedExtensions[options.type] : [])
    
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
      this.validationErrors.push(`File extension ${extension} is not allowed`)
    }

    // 3. Validate MIME type
    const allowedMimeTypes = options.allowedMimeTypes || 
      (options.type ? UPLOAD_CONFIG.allowedMimeTypes[options.type] : [])
    
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(fileMimeType)) {
      this.validationErrors.push(`File type ${fileMimeType} is not allowed`)
    }

    // 4. Verify file signature (magic numbers)
    if (options.validateContent !== false) {
      const actualMimeType = this.detectMimeType(fileBuffer)
      if (actualMimeType && actualMimeType !== fileMimeType) {
        this.validationErrors.push(
          `File content does not match declared type (declared: ${fileMimeType}, actual: ${actualMimeType})`
        )
      }
    }

    // 5. Check for malicious patterns in filename
    this.checkMaliciousFileName(fileName)

    // 6. Scan for malicious content
    if (options.validateContent !== false) {
      await this.scanForMaliciousContent(fileBuffer, fileMimeType)
    }

    // 7. Generate sanitized filename
    const sanitizedFileName = this.sanitizeFileName(fileName)

    return {
      valid: this.validationErrors.length === 0,
      errors: this.validationErrors,
      sanitizedFileName,
      fileInfo: {
        size: fileSize,
        mimeType: fileMimeType,
        extension,
      },
    }
  }

  /**
   * Detect actual MIME type from file content
   */
  private detectMimeType(buffer: Buffer): string | null {
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (this.checkSignature(buffer, signature)) {
          return mimeType
        }
      }
    }
    return null
  }

  /**
   * Check if buffer starts with signature
   */
  private checkSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) {
      return false
    }
    
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false
      }
    }
    
    return true
  }

  /**
   * Check for malicious patterns in filename
   */
  private checkMaliciousFileName(fileName: string): void {
    // Check for double extensions
    const doubleExtPattern = /\.\w+\.\w+$/
    if (doubleExtPattern.test(fileName)) {
      this.validationErrors.push('Suspicious double extension detected')
    }

    // Check for executable extensions
    for (const pattern of MALICIOUS_PATTERNS.executables) {
      if (pattern.test(fileName)) {
        this.validationErrors.push('Executable files are not allowed')
        break
      }
    }

    // Check for server script extensions
    for (const pattern of MALICIOUS_PATTERNS.serverScripts) {
      if (pattern.test(fileName)) {
        this.validationErrors.push('Server script files are not allowed')
        break
      }
    }

    // Check for path traversal attempts
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      this.validationErrors.push('Path traversal attempts detected')
    }

    // Check for null bytes
    if (fileName.includes('\0')) {
      this.validationErrors.push('Null bytes detected in filename')
    }
  }

  /**
   * Scan file content for malicious patterns
   */
  private async scanForMaliciousContent(
    buffer: Buffer,
    mimeType: string
  ): Promise<void> {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024))
    
    // Check for script injections in text-based files
    if (mimeType.startsWith('text/') || mimeType.includes('xml') || mimeType.includes('svg')) {
      for (const pattern of MALICIOUS_PATTERNS.scripts) {
        if (pattern.test(content)) {
          this.validationErrors.push('Potentially malicious script content detected')
          break
        }
      }
    }

    // Simulate virus scan (in production, integrate with actual antivirus API)
    const virusScanResult = await this.simulateVirusScan(buffer)
    if (!virusScanResult.clean) {
      this.validationErrors.push(`Virus scan failed: ${virusScanResult.threat}`)
    }
  }

  /**
   * Simulate virus scanning (replace with actual AV integration)
   */
  private async simulateVirusScan(
    buffer: Buffer
  ): Promise<{ clean: boolean; threat?: string }> {
    // Simulate async virus scan
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check for EICAR test string (standard AV test pattern)
    const eicarTestString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    if (buffer.toString().includes(eicarTestString)) {
      return { clean: false, threat: 'EICAR-Test-File' }
    }
    
    // In production, integrate with:
    // - ClamAV
    // - Windows Defender API
    // - VirusTotal API
    // - Cloud-based AV services
    
    return { clean: true }
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(fileName: string): string {
    // Remove path components
    let sanitized = fileName.split(/[\/\\]/).pop() || 'file'
    
    // Remove special characters except dots, hyphens, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')
    
    // Remove multiple dots (keep only last one for extension)
    const parts = sanitized.split('.')
    if (parts.length > 2) {
      const extension = parts.pop()
      const name = parts.join('_')
      sanitized = `${name}.${extension}`
    }
    
    // Limit length
    if (sanitized.length > 255) {
      const extension = this.getFileExtension(sanitized)
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
      sanitized = nameWithoutExt.substring(0, 250 - extension.length) + extension
    }
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now()
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
    const extension = this.getFileExtension(sanitized)
    
    return `${nameWithoutExt}_${timestamp}${extension}`
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    if (lastDot === -1) return ''
    return fileName.substring(lastDot).toLowerCase()
  }

  /**
   * Process and optimize image
   */
  async processImage(
    buffer: Buffer,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'jpeg' | 'webp' | 'png'
    } = {}
  ): Promise<{
    buffer: Buffer
    metadata: {
      width: number
      height: number
      format: string
      size: number
    }
  }> {
    const {
      maxWidth = UPLOAD_CONFIG.imageProcessing.maxWidth,
      maxHeight = UPLOAD_CONFIG.imageProcessing.maxHeight,
      quality = UPLOAD_CONFIG.imageProcessing.quality,
      format = 'jpeg',
    } = options

    try {
      // Process image with sharp
      let processor = sharp(buffer)
      
      // Get metadata
      const metadata = await processor.metadata()
      
      // Resize if needed
      if (metadata.width && metadata.width > maxWidth || 
          metadata.height && metadata.height > maxHeight) {
        processor = processor.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
      }
      
      // Remove metadata (EXIF, etc.) for privacy
      processor = processor.rotate() // Auto-rotate based on EXIF
        .removeMetadata()
      
      // Convert to specified format
      if (format === 'jpeg') {
        processor = processor.jpeg({ quality, progressive: true })
      } else if (format === 'webp') {
        processor = processor.webp({ quality })
      } else if (format === 'png') {
        processor = processor.png({ quality, compressionLevel: 9 })
      }
      
      const processedBuffer = await processor.toBuffer()
      const processedMetadata = await sharp(processedBuffer).metadata()
      
      return {
        buffer: processedBuffer,
        metadata: {
          width: processedMetadata.width || 0,
          height: processedMetadata.height || 0,
          format: processedMetadata.format || format,
          size: processedBuffer.length,
        },
      }
    } catch (error) {
      throw new Error(`Image processing failed: ${error}`)
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadToStorage(
    buffer: Buffer,
    fileName: string,
    bucket: string,
    path?: string
  ): Promise<{
    success: boolean
    url?: string
    error?: string
  }> {
    try {
      const fullPath = path ? `${path}/${fileName}` : fileName
      
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(fullPath, buffer, {
          contentType: this.getMimeType(fileName),
          upsert: false,
        })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(fullPath)
      
      return { success: true, url: publicUrl }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFromStorage(
    fileName: string,
    bucket: string,
    path?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fullPath = path ? `${path}/${fileName}` : fileName
      
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([fullPath])
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get MIME type from extension
   */
  private getMimeType(fileName: string): string {
    const ext = this.getFileExtension(fileName).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
    }
    
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Generate secure download URL with expiry
   */
  async generateSecureUrl(
    fileName: string,
    bucket: string,
    path?: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<{
    success: boolean
    url?: string
    error?: string
  }> {
    try {
      const fullPath = path ? `${path}/${fileName}` : fileName
      
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(fullPath, expiresIn)
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true, url: data.signedUrl }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

/**
 * File upload handler for API routes
 */
export async function handleFileUpload(
  file: File,
  options: {
    type?: 'image' | 'document' | 'excel'
    bucket: string
    path?: string
    processImage?: boolean
    supabaseUrl: string
    supabaseKey: string
  }
): Promise<{
  success: boolean
  url?: string
  metadata?: any
  errors?: string[]
}> {
  const security = new FileUploadSecurity(
    options.supabaseUrl,
    options.supabaseKey
  )

  // Validate file
  const validation = await security.validateFile(file, {
    type: options.type,
    validateContent: true,
  })

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let processedBuffer = buffer
  let metadata: any = {}

  // Process image if needed
  if (options.type === 'image' && options.processImage) {
    const processed = await security.processImage(buffer)
    processedBuffer = processed.buffer
    metadata = processed.metadata
  }

  // Upload to storage
  const uploadResult = await security.uploadToStorage(
    processedBuffer,
    validation.sanitizedFileName!,
    options.bucket,
    options.path
  )

  if (!uploadResult.success) {
    return {
      success: false,
      errors: [uploadResult.error || 'Upload failed'],
    }
  }

  return {
    success: true,
    url: uploadResult.url,
    metadata,
  }
}