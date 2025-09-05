import { StorageService, FileUploadOptions, ImageProcessingOptions } from '../storage.service';

// Mock Supabase Client
const mockSupabaseClient = {
  storage: {
    from: jest.fn()
  }
};

describe('Storage Service', () => {
  let storageService: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    storageService = new StorageService(mockSupabaseClient as any);
  });

  describe('File Validation', () => {
    it('should validate allowed file types', () => {
      const validImage = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const validPDF = new File([''], 'document.pdf', { type: 'application/pdf' });
      const invalidFile = new File([''], 'script.exe', { type: 'application/exe' });

      expect(storageService.validateFileType(validImage, ['image/jpeg', 'image/png'])).toBe(true);
      expect(storageService.validateFileType(validPDF, ['application/pdf'])).toBe(true);
      expect(storageService.validateFileType(invalidFile, ['image/jpeg'])).toBe(false);
    });

    it('should validate file size', () => {
      const smallFile = new File(['a'.repeat(1024 * 1024)], 'small.jpg'); // 1MB
      const largeFile = new File(['a'.repeat(11 * 1024 * 1024)], 'large.jpg'); // 11MB

      expect(storageService.validateFileSize(smallFile, 10)).toBe(true);
      expect(storageService.validateFileSize(largeFile, 10)).toBe(false);
    });

    it('should validate image dimensions', async () => {
      const mockImage = {
        width: 1920,
        height: 1080
      };

      const result = await storageService.validateImageDimensions(
        mockImage as any,
        { maxWidth: 2000, maxHeight: 2000 }
      );

      expect(result).toBe(true);

      const result2 = await storageService.validateImageDimensions(
        mockImage as any,
        { maxWidth: 1000, maxHeight: 1000 }
      );

      expect(result2).toBe(false);
    });
  });

  describe('File Naming', () => {
    it('should generate unique file names', () => {
      const file = new File([''], 'test image.jpg', { type: 'image/jpeg' });
      const uniqueName = storageService.generateUniqueFileName(file);

      expect(uniqueName).toMatch(/^[a-z0-9-]+\.jpg$/);
      expect(uniqueName).not.toContain(' ');
    });

    it('should preserve file extensions', () => {
      const jpgFile = new File([''], 'image.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'image.png', { type: 'image/png' });
      const pdfFile = new File([''], 'document.pdf', { type: 'application/pdf' });

      expect(storageService.generateUniqueFileName(jpgFile)).toMatch(/\.jpg$/);
      expect(storageService.generateUniqueFileName(pngFile)).toMatch(/\.png$/);
      expect(storageService.generateUniqueFileName(pdfFile)).toMatch(/\.pdf$/);
    });

    it('should sanitize file names', () => {
      const file = new File([''], '파일 이름@#$%.jpg', { type: 'image/jpeg' });
      const sanitized = storageService.sanitizeFileName(file.name);

      expect(sanitized).not.toContain('@');
      expect(sanitized).not.toContain('#');
      expect(sanitized).not.toContain('$');
      expect(sanitized).not.toContain('%');
    });
  });

  describe('Product Image Upload', () => {
    it('should upload product image with correct path', async () => {
      const mockFile = new File(['image data'], 'product.jpg', { type: 'image/jpeg' });
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'products/123/product.jpg' },
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const result = await storageService.uploadProductImage('123', mockFile);

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('product-images');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('products/123/'),
        expect.any(File),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.path).toContain('products/123/');
    });

    it('should handle multiple product images', async () => {
      const files = [
        new File([''], 'main.jpg', { type: 'image/jpeg' }),
        new File([''], 'detail1.jpg', { type: 'image/jpeg' }),
        new File([''], 'detail2.jpg', { type: 'image/jpeg' })
      ];

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const results = await storageService.uploadMultipleProductImages('123', files);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should compress large images before upload', async () => {
      const largeFile = new File(['a'.repeat(5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      const compressed = await storageService.compressImage(largeFile, {
        maxSizeKB: 1024,
        quality: 0.8
      });

      expect(compressed.size).toBeLessThan(largeFile.size);
    });
  });

  describe('Shipment Photo Upload', () => {
    it('should upload shipment photos with metadata', async () => {
      const mockFile = new File([''], 'shipment.jpg', { type: 'image/jpeg' });
      const metadata = {
        orderId: 'ORD-240823-001',
        trackingNo: '123456789',
        courier: 'CJ대한통운'
      };

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'shipments/ORD-240823-001/shipment.jpg' },
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const result = await storageService.uploadShipmentPhoto(
        metadata.orderId,
        mockFile,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.metadata).toEqual(metadata);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('shipments/ORD-240823-001'),
        expect.any(File),
        expect.objectContaining({
          metadata
        })
      );
    });

    it('should support multiple shipment photos per order', async () => {
      const photos = [
        { file: new File([''], 'tracking.jpg'), type: 'tracking' },
        { file: new File([''], 'package.jpg'), type: 'package' },
        { file: new File([''], 'receipt.jpg'), type: 'receipt' }
      ];

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const results = await storageService.uploadShipmentPhotos('ORD-001', photos);

      expect(results).toHaveLength(3);
      expect(mockUpload).toHaveBeenCalledTimes(3);
    });
  });

  describe('File Management', () => {
    it('should generate public URL for uploaded files', () => {
      const path = 'products/123/image.jpg';
      const publicUrl = storageService.getPublicUrl('product-images', path);

      expect(publicUrl).toContain('product-images');
      expect(publicUrl).toContain(path);
    });

    it('should generate signed URL for private files', async () => {
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed-url.com' },
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      });

      const signedUrl = await storageService.getSignedUrl(
        'private-documents',
        'document.pdf',
        3600
      );

      expect(signedUrl).toBe('https://signed-url.com');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('document.pdf', 3600);
    });

    it('should delete files', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockRemove
      });

      const result = await storageService.deleteFile('product-images', 'products/123/image.jpg');

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(['products/123/image.jpg']);
    });

    it('should list files in directory', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [
          { name: 'image1.jpg', size: 1024 },
          { name: 'image2.jpg', size: 2048 }
        ],
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        list: mockList
      });

      const files = await storageService.listFiles('product-images', 'products/123');

      expect(files).toHaveLength(2);
      expect(files[0].name).toBe('image1.jpg');
      expect(mockList).toHaveBeenCalledWith('products/123');
    });
  });

  describe('Image Processing', () => {
    it('should create thumbnail', async () => {
      const originalFile = new File(['image data'], 'image.jpg', { type: 'image/jpeg' });
      
      const thumbnail = await storageService.createThumbnail(originalFile, {
        width: 200,
        height: 200
      });

      expect(thumbnail.name).toContain('thumb');
      expect(thumbnail.type).toBe('image/jpeg');
    });

    it('should optimize image for web', async () => {
      const originalFile = new File(['a'.repeat(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      const optimized = await storageService.optimizeImageForWeb(originalFile);

      expect(optimized.size).toBeLessThan(originalFile.size);
    });

    it('should convert image format', async () => {
      const pngFile = new File([''], 'image.png', { type: 'image/png' });
      
      const converted = await storageService.convertImageFormat(pngFile, 'jpeg');

      expect(converted.type).toBe('image/jpeg');
      expect(converted.name).toMatch(/\.jpg$/);
    });
  });

  describe('Batch Operations', () => {
    it('should upload files in batch', async () => {
      const files = [
        new File([''], 'file1.jpg', { type: 'image/jpeg' }),
        new File([''], 'file2.jpg', { type: 'image/jpeg' }),
        new File([''], 'file3.jpg', { type: 'image/jpeg' })
      ];

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const results = await storageService.batchUpload('product-images', files, {
        directory: 'batch',
        parallel: true
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle batch upload errors gracefully', async () => {
      const files = [
        new File([''], 'file1.jpg', { type: 'image/jpeg' }),
        new File([''], 'file2.jpg', { type: 'image/jpeg' })
      ];

      const mockUpload = jest.fn()
        .mockResolvedValueOnce({ data: { path: 'path1' }, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('Upload failed') });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const results = await storageService.batchUpload('product-images', files);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Upload failed');
    });
  });

  describe('Storage Quota Management', () => {
    it('should check storage usage', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [
          { size: 1024 * 1024 },     // 1MB
          { size: 2 * 1024 * 1024 },  // 2MB
          { size: 512 * 1024 }        // 512KB
        ],
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        list: mockList
      });

      const usage = await storageService.getStorageUsage('product-images');

      expect(usage.totalSize).toBe(3670016); // 3.5MB in bytes
      expect(usage.fileCount).toBe(3);
      expect(usage.formattedSize).toBe('3.50 MB');
    });

    it('should check if quota exceeded', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: Array(100).fill({ size: 10 * 1024 * 1024 }), // 100 files of 10MB each
        error: null
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        list: mockList
      });

      const exceeded = await storageService.isQuotaExceeded('product-images', 500); // 500MB limit

      expect(exceeded).toBe(true);
    });
  });
});