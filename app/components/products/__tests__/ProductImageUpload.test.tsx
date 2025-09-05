import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductImageUpload } from '../ProductImageUpload';
import { StorageService } from '@/lib/domain/services/storage.service';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}));

// Mock StorageService
jest.mock('@/lib/domain/services/storage.service');

describe('ProductImageUpload Component', () => {
  const mockSupabaseClient = {
    storage: {
      from: jest.fn()
    }
  };

  const mockStorageService = {
    uploadProductImage: jest.fn(),
    uploadMultipleProductImages: jest.fn(),
    compressImage: jest.fn(),
    createThumbnail: jest.fn(),
    optimizeImageForWeb: jest.fn(),
    getPublicUrl: jest.fn()
  };

  const mockOnUploadComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (createClientComponentClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    (StorageService as jest.Mock).mockImplementation(() => mockStorageService);
  });

  const defaultProps = {
    productId: 'PROD-123',
    onUploadComplete: mockOnUploadComplete,
    onError: mockOnError
  };

  describe('Rendering', () => {
    it('should render upload area', () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      expect(screen.getByText(/이미지 업로드/)).toBeInTheDocument();
      expect(screen.getByText(/클릭하거나 파일을 드래그/)).toBeInTheDocument();
    });

    it('should show accepted file types', () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      expect(screen.getByText(/jpg, png, webp/i)).toBeInTheDocument();
    });

    it('should render with custom max images', () => {
      render(<ProductImageUpload {...defaultProps} maxImages={5} />);
      
      expect(screen.getByText(/최대 5개/)).toBeInTheDocument();
    });

    it('should show current image count', () => {
      render(<ProductImageUpload {...defaultProps} currentImageCount={2} maxImages={5} />);
      
      expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    });
  });

  describe('Image Selection', () => {
    it('should handle single image selection', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      expect(screen.getByText('product.jpg')).toBeInTheDocument();
    });

    it('should handle multiple image selection', async () => {
      render(<ProductImageUpload {...defaultProps} maxImages={3} />);
      
      const files = [
        new File(['test1'], 'product1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'product2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      expect(screen.getByText('product1.jpg')).toBeInTheDocument();
      expect(screen.getByText('product2.jpg')).toBeInTheDocument();
    });

    it('should validate file types', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, invalidFile);
      
      expect(screen.getByText(/지원하지 않는 이미지 형식/)).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('지원하지 않는 이미지 형식'));
    });

    it('should validate file size', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      // Create a 11MB file (exceeds 10MB limit)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, largeFile);
      
      expect(screen.getByText(/파일 크기는 10MB를 초과할 수 없습니다/)).toBeInTheDocument();
    });

    it('should enforce max image limit', async () => {
      render(<ProductImageUpload {...defaultProps} maxImages={2} currentImageCount={1} />);
      
      const files = [
        new File(['test1'], 'product1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'product2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      expect(screen.getByText(/최대 2개까지/)).toBeInTheDocument();
    });
  });

  describe('Image Preview', () => {
    it('should show image previews', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      await userEvent.upload(input, file);
      
      await waitFor(() => {
        const preview = screen.getByAltText('product.jpg');
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', expect.stringContaining('blob:'));
      });
    });

    it('should allow setting main image', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const files = [
        new File(['test1'], 'product1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'product2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      const setMainButton = screen.getAllByLabelText(/대표 이미지로 설정/)[1];
      fireEvent.click(setMainButton);
      
      expect(screen.getByText('대표')).toBeInTheDocument();
    });

    it('should allow removing images', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      expect(screen.getByText('product.jpg')).toBeInTheDocument();
      
      const removeButton = screen.getByLabelText(/제거/);
      fireEvent.click(removeButton);
      
      expect(screen.queryByText('product.jpg')).not.toBeInTheDocument();
    });

    it('should allow reordering images', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const files = [
        new File(['test1'], 'product1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'product2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      const moveUpButtons = screen.getAllByLabelText(/앞으로 이동/);
      fireEvent.click(moveUpButtons[1]); // Move second image up
      
      const images = screen.getAllByText(/product\d\.jpg/);
      expect(images[0]).toHaveTextContent('product2.jpg');
      expect(images[1]).toHaveTextContent('product1.jpg');
    });
  });

  describe('Image Processing', () => {
    it('should compress images when enabled', async () => {
      mockStorageService.compressImage.mockResolvedValue(
        new File(['compressed'], 'product.jpg', { type: 'image/jpeg' })
      );

      render(<ProductImageUpload {...defaultProps} compressImages={true} />);
      
      const file = new File(['test'.repeat(1000)], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      // Trigger upload
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockStorageService.compressImage).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            maxSizeKB: 1024
          })
        );
      });
    });

    it('should optimize for web when enabled', async () => {
      mockStorageService.optimizeImageForWeb.mockResolvedValue(
        new File(['optimized'], 'product.jpg', { type: 'image/jpeg' })
      );

      render(<ProductImageUpload {...defaultProps} optimizeForWeb={true} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockStorageService.optimizeImageForWeb).toHaveBeenCalled();
      });
    });

    it('should create thumbnails when enabled', async () => {
      mockStorageService.createThumbnail.mockResolvedValue(
        new File(['thumb'], 'thumb-product.jpg', { type: 'image/jpeg' })
      );

      render(<ProductImageUpload {...defaultProps} createThumbnails={true} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockStorageService.createThumbnail).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            width: 200,
            height: 200
          })
        );
      });
    });
  });

  describe('Upload Process', () => {
    it('should upload single image successfully', async () => {
      mockStorageService.uploadProductImage.mockResolvedValue({
        success: true,
        path: 'products/PROD-123/product.jpg',
        url: 'https://example.com/product.jpg',
        metadata: { isMain: true }
      });

      render(<ProductImageUpload {...defaultProps} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockStorageService.uploadProductImage).toHaveBeenCalledWith(
          'PROD-123',
          expect.any(File),
          expect.objectContaining({
            metadata: expect.objectContaining({
              isMain: true
            })
          })
        );
      });
      
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledWith([
          expect.objectContaining({
            success: true,
            url: 'https://example.com/product.jpg'
          })
        ]);
      });
    });

    it('should upload multiple images successfully', async () => {
      mockStorageService.uploadMultipleProductImages.mockResolvedValue([
        {
          success: true,
          path: 'products/PROD-123/product1.jpg',
          url: 'https://example.com/product1.jpg'
        },
        {
          success: true,
          path: 'products/PROD-123/product2.jpg',
          url: 'https://example.com/product2.jpg'
        }
      ]);

      render(<ProductImageUpload {...defaultProps} />);
      
      const files = [
        new File(['test1'], 'product1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'product2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockStorageService.uploadMultipleProductImages).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ success: true }),
            expect.objectContaining({ success: true })
          ])
        );
      });
    });

    it('should show progress during upload', async () => {
      mockStorageService.uploadProductImage.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<ProductImageUpload {...defaultProps} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      expect(screen.getByText('업로드 중...')).toBeInTheDocument();
      expect(uploadButton).toBeDisabled();
    });

    it('should show individual progress for multiple files', async () => {
      let resolveFirst: any;
      let resolveSecond: any;

      const uploadPromises = [
        new Promise(resolve => { resolveFirst = resolve; }),
        new Promise(resolve => { resolveSecond = resolve; })
      ];

      mockStorageService.uploadMultipleProductImages.mockReturnValue(uploadPromises);

      render(<ProductImageUpload {...defaultProps} />);
      
      const files = [
        new File(['test1'], 'product1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'product2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      expect(screen.getByText(/0\/2/)).toBeInTheDocument();
      
      // Complete first upload
      resolveFirst({ success: true });
      await waitFor(() => {
        expect(screen.getByText(/1\/2/)).toBeInTheDocument();
      });
    });

    it('should handle upload errors', async () => {
      mockStorageService.uploadProductImage.mockResolvedValue({
        success: false,
        error: '업로드 실패'
      });

      render(<ProductImageUpload {...defaultProps} />);
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/이미지 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('업로드 실패');
      });
      
      expect(screen.getByText(/업로드 실패/)).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over', () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const dropZone = screen.getByText(/클릭하거나 파일을 드래그/).parentElement!;
      
      fireEvent.dragOver(dropZone);
      
      expect(dropZone).toHaveClass('border-indigo-500');
    });

    it('should handle drop', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const dropZone = screen.getByText(/클릭하거나 파일을 드래그/).parentElement!;
      
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });
      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', getAsFile: () => file }]
      };
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      await waitFor(() => {
        expect(screen.getByText('product.jpg')).toBeInTheDocument();
      });
    });

    it('should reject non-image files on drop', async () => {
      render(<ProductImageUpload {...defaultProps} />);
      
      const dropZone = screen.getByText(/클릭하거나 파일을 드래그/).parentElement!;
      
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', getAsFile: () => file }]
      };
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      await waitFor(() => {
        expect(screen.getByText(/지원하지 않는 이미지 형식/)).toBeInTheDocument();
      });
    });
  });
});