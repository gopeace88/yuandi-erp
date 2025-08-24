import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Locale } from '@/lib/i18n/config';

describe('LanguageSwitcher Component', () => {
  const mockOnLocaleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with Korean locale selected', () => {
    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('🇰🇷');
    expect(button).toHaveTextContent('한국어');
  });

  it('should render with Chinese locale selected', () => {
    render(
      <LanguageSwitcher 
        currentLocale="zh-CN" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('🇨🇳');
    expect(button).toHaveTextContent('中文');
  });

  it('should show dropdown menu when clicked', async () => {
    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('🇰🇷 한국어')).toBeInTheDocument();
      expect(screen.getByText('🇨🇳 中文')).toBeInTheDocument();
    });
  });

  it('should call onLocaleChange when selecting a different language', async () => {
    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const chineseOption = screen.getByText('🇨🇳 中文');
      fireEvent.click(chineseOption);
    });

    expect(mockOnLocaleChange).toHaveBeenCalledWith('zh-CN');
  });

  it('should not call onLocaleChange when selecting the same language', async () => {
    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const koreanOption = screen.getByText('🇰🇷 한국어');
      fireEvent.click(koreanOption);
    });

    expect(mockOnLocaleChange).not.toHaveBeenCalled();
  });

  it('should close dropdown when clicking outside', async () => {
    const { container } = render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('🇨🇳 中文')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.click(container);

    await waitFor(() => {
      expect(screen.queryByText('🇨🇳 中文')).not.toBeInTheDocument();
    });
  });

  it('should save locale preference to localStorage', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const chineseOption = screen.getByText('🇨🇳 中文');
      fireEvent.click(chineseOption);
    });

    expect(setItemSpy).toHaveBeenCalledWith('locale', 'zh-CN');
    setItemSpy.mockRestore();
  });

  it('should handle keyboard navigation', async () => {
    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    
    // Open dropdown with Enter key
    fireEvent.keyDown(button, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('🇨🇳 中文')).toBeInTheDocument();
    });

    // Close dropdown with Escape key
    fireEvent.keyDown(button, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('🇨🇳 中文')).not.toBeInTheDocument();
    });
  });

  it('should apply active styles to current locale', async () => {
    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const koreanOption = screen.getByText('🇰🇷 한국어').closest('button');
      const chineseOption = screen.getByText('🇨🇳 中文').closest('button');
      
      expect(koreanOption).toHaveClass('bg-blue-50');
      expect(chineseOption).not.toHaveClass('bg-blue-50');
    });
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <LanguageSwitcher 
        currentLocale="ko" 
        onLocaleChange={mockOnLocaleChange} 
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Select language');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});