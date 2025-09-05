import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShipmentPhotoUpload } from '../ShipmentPhotoUpload';
import { StorageService } from '@/lib/domain/services/storage.service';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}));

// Mock StorageService
jest.mock('@/lib/domain/services/storage.service');

describe('ShipmentPhotoUpload Component', () => {
  const mockSupabaseClient = {
    storage: {
      from: jest.fn()
    }
  };

  const mockStorageService = {
    uploadShipmentPhoto: jest.fn(),
    uploadShipmentPhotos: jest.fn(),
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
    orderId: 'ORD-240823-001',
    onUploadComplete: mockOnUploadComplete,
    onError: mockOnError
  };

  describe('Rendering', () => {
    it('should render upload button', () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      expect(screen.getByText(/사진 업로드/)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<ShipmentPhotoUpload {...defaultProps} label="송장 사진 추가" />);
      
      expect(screen.getByText('송장 사진 추가')).toBeInTheDocument();
    });

    it('should show accepted file types hint', () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      expect(screen.getByText(/jpg, png, pdf/i)).toBeInTheDocument();
    });

    it('should render multiple file input when multiple is true', () => {
      render(<ShipmentPhotoUpload {...defaultProps} multiple={true} />);
      
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      expect(input.multiple).toBe(true);
    });
  });

  describe('File Selection', () => {
    it('should handle single file selection', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      expect(screen.getByText('shipment.jpg')).toBeInTheDocument();
      expect(screen.getByText('선택된 파일: 1개')).toBeInTheDocument();
    });

    it('should handle multiple file selection', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} multiple={true} />);
      
      const files = [
        new File(['test1'], 'shipment1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'shipment2.jpg', { type: 'image/jpeg' }),
        new File(['test3'], 'shipment3.pdf', { type: 'application/pdf' })
      ];
      
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      expect(screen.getByText('shipment1.jpg')).toBeInTheDocument();
      expect(screen.getByText('shipment2.jpg')).toBeInTheDocument();
      expect(screen.getByText('shipment3.pdf')).toBeInTheDocument();
      expect(screen.getByText('선택된 파일: 3개')).toBeInTheDocument();
    });

    it('should validate file types', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const invalidFile = new File(['test'], 'document.doc', { type: 'application/msword' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, invalidFile);
      
      expect(screen.getByText(/지원하지 않는 파일 형식/)).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('지원하지 않는 파일 형식'));
    });

    it('should validate file size', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      // Create a 25MB file (exceeds 20MB limit)
      const largeFile = new File(['x'.repeat(25 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, largeFile);
      
      expect(screen.getByText(/파일 크기는 20MB를 초과할 수 없습니다/)).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('20MB'));
    });
  });

  describe('Photo Type Selection', () => {
    it('should show photo type selector', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      expect(screen.getByLabelText(/사진 유형/)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have correct photo type options', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveTextContent('송장');
      expect(select).toHaveTextContent('포장');
      expect(select).toHaveTextContent('영수증');
    });
  });

  describe('Metadata Input', () => {
    it('should show tracking number input when enabled', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} includeTrackingInfo={true} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      expect(screen.getByLabelText(/운송장 번호/)).toBeInTheDocument();
      expect(screen.getByLabelText(/택배사/)).toBeInTheDocument();
    });

    it('should allow entering tracking metadata', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} includeTrackingInfo={true} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const trackingInput = screen.getByLabelText(/운송장 번호/);
      const courierSelect = screen.getByLabelText(/택배사/);
      
      await userEvent.type(trackingInput, '123456789');
      await userEvent.selectOptions(courierSelect, 'CJ대한통운');
      
      expect(trackingInput).toHaveValue('123456789');
      expect(courierSelect).toHaveValue('CJ대한통운');
    });
  });

  describe('Upload Process', () => {
    it('should upload single file successfully', async () => {
      mockStorageService.uploadShipmentPhoto.mockResolvedValue({
        success: true,
        path: 'shipments/ORD-240823-001/shipment.jpg',
        url: 'https://example.com/shipment.jpg',
        metadata: {
          orderId: 'ORD-240823-001',
          photoType: 'tracking'
        }
      });

      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockStorageService.uploadShipmentPhoto).toHaveBeenCalledWith(
          'ORD-240823-001',
          file,
          expect.objectContaining({
            orderId: 'ORD-240823-001',
            photoType: 'tracking'
          })
        );
      });
      
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledWith([
          expect.objectContaining({
            success: true,
            url: 'https://example.com/shipment.jpg'
          })
        ]);
      });
    });

    it('should upload multiple files successfully', async () => {
      mockStorageService.uploadShipmentPhotos.mockResolvedValue([
        {
          success: true,
          path: 'shipments/ORD-240823-001/shipment1.jpg',
          url: 'https://example.com/shipment1.jpg'
        },
        {
          success: true,
          path: 'shipments/ORD-240823-001/shipment2.jpg',
          url: 'https://example.com/shipment2.jpg'
        }
      ]);

      render(<ShipmentPhotoUpload {...defaultProps} multiple={true} />);
      
      const files = [
        new File(['test1'], 'shipment1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'shipment2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      await userEvent.upload(input, files);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockStorageService.uploadShipmentPhotos).toHaveBeenCalled();
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

    it('should show loading state during upload', async () => {
      mockStorageService.uploadShipmentPhoto.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      expect(screen.getByText('업로드 중...')).toBeInTheDocument();
      expect(uploadButton).toBeDisabled();
    });

    it('should handle upload errors', async () => {
      mockStorageService.uploadShipmentPhoto.mockResolvedValue({
        success: false,
        error: '업로드 실패'
      });

      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('업로드 실패');
      });
      
      expect(screen.getByText(/업로드 실패/)).toBeInTheDocument();
    });
  });

  describe('Preview', () => {
    it('should show image preview for image files', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} showPreview={true} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      await userEvent.upload(input, file);
      
      await waitFor(() => {
        const preview = screen.getByAltText('shipment.jpg');
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', expect.stringContaining('blob:'));
      });
    });

    it('should show PDF icon for PDF files', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} showPreview={true} />);
      
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      expect(screen.getByText('📄')).toBeInTheDocument();
      expect(screen.getByText('PDF 문서')).toBeInTheDocument();
    });

    it('should allow removing selected files', async () => {
      render(<ShipmentPhotoUpload {...defaultProps} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      expect(screen.getByText('shipment.jpg')).toBeInTheDocument();
      
      const removeButton = screen.getByLabelText(/제거/);
      fireEvent.click(removeButton);
      
      expect(screen.queryByText('shipment.jpg')).not.toBeInTheDocument();
    });
  });

  describe('Reset', () => {
    it('should reset after successful upload', async () => {
      mockStorageService.uploadShipmentPhoto.mockResolvedValue({
        success: true,
        path: 'shipments/ORD-240823-001/shipment.jpg',
        url: 'https://example.com/shipment.jpg'
      });

      render(<ShipmentPhotoUpload {...defaultProps} resetAfterUpload={true} />);
      
      const file = new File(['test'], 'shipment.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/사진 업로드/) as HTMLInputElement;
      
      await userEvent.upload(input, file);
      
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalled();
      });
      
      expect(screen.queryByText('shipment.jpg')).not.toBeInTheDocument();
      expect(screen.getByText(/사진 업로드/)).toBeInTheDocument();
    });
  });
});