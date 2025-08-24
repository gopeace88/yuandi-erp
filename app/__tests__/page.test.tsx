import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import HomePage from '../page'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock next/link
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => {
      return <a href={href}>{children}</a>
    },
  }
})

describe('HomePage', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  const originalReload = window.location.reload

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Mock window.location.reload
    window.location.reload = jest.fn()
    
    // Clear localStorage and cookies
    localStorage.clear()
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
    
    // Reset navigator.language
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'en-US',
    })
  })

  afterEach(() => {
    // Restore original reload
    window.location.reload = originalReload
  })

  describe('Language Detection', () => {
    it('should detect Korean as default for non-Chinese browsers', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'en-US',
      })

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('YUANDI Collection Management')).toBeInTheDocument()
        expect(screen.getByText('YUANDI Collection 주문/재고/배송 관리 시스템')).toBeInTheDocument()
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
        expect(screen.getByText('주문 조회')).toBeInTheDocument()
      })
    })

    it('should detect Chinese for Chinese browser language', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'zh-CN',
      })

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('YUANDI Collection Management')).toBeInTheDocument()
        expect(screen.getByText('YUANDI Collection 订单/库存/配送管理系统')).toBeInTheDocument()
        expect(screen.getByText('进入仪表板')).toBeInTheDocument()
        expect(screen.getByText('订单查询')).toBeInTheDocument()
      })
    })

    it('should detect Chinese for zh-TW browser language', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'zh-TW',
      })

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('YUANDI Collection 订单/库存/配送管理系统')).toBeInTheDocument()
      })
    })

    it('should detect Korean for ko-KR browser language', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'ko-KR',
      })

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('YUANDI Collection 주문/재고/배송 관리 시스템')).toBeInTheDocument()
      })
    })
  })

  describe('Language Persistence', () => {
    it('should save language preference to localStorage', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
      })

      // Click language toggle
      const toggleButton = screen.getByText('中文')
      fireEvent.click(toggleButton)

      // Check localStorage
      expect(localStorage.getItem('locale')).toBe('zh-CN')
    })

    it('should save language preference to cookie', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
      })

      // Initial state should set cookie
      await waitFor(() => {
        expect(document.cookie).toContain('locale=ko')
      })
    })

    it('should load language preference from localStorage', async () => {
      localStorage.setItem('locale', 'zh-CN')

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('进入仪表板')).toBeInTheDocument()
        expect(screen.getByText('订单查询')).toBeInTheDocument()
      })
    })

    it('should load language preference from cookie if localStorage is empty', async () => {
      document.cookie = 'locale=zh-CN; path=/; max-age=31536000'

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('进入仪表板')).toBeInTheDocument()
      })
    })

    it('should prioritize localStorage over cookie', async () => {
      localStorage.setItem('locale', 'ko')
      document.cookie = 'locale=zh-CN; path=/; max-age=31536000'

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
      })
    })
  })

  describe('Language Toggle', () => {
    it('should toggle from Korean to Chinese', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
      })

      const toggleButton = screen.getByText('中文')
      expect(toggleButton).toBeInTheDocument()
      
      // In Korean mode, Chinese flag is displayed (to switch to Chinese)
      expect(screen.getByText('🇨🇳')).toBeInTheDocument()

      fireEvent.click(toggleButton)

      expect(localStorage.getItem('locale')).toBe('zh-CN')
      expect(window.location.reload).toHaveBeenCalled()
    })

    it('should toggle from Chinese to Korean', async () => {
      localStorage.setItem('locale', 'zh-CN')

      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('进入仪表板')).toBeInTheDocument()
      })

      const toggleButton = screen.getByText('한국어')
      expect(toggleButton).toBeInTheDocument()
      
      // In Chinese mode, Korean flag is displayed (to switch to Korean)
      expect(screen.getByText('🇰🇷')).toBeInTheDocument()

      fireEvent.click(toggleButton)

      expect(localStorage.getItem('locale')).toBe('ko')
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  describe('Navigation Links', () => {
    it('should have correct links for dashboard and track pages in Korean', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        const dashboardLink = screen.getByText('대시보드로 이동').closest('a')
        const trackLink = screen.getByText('주문 조회').closest('a')
        
        expect(dashboardLink).toHaveAttribute('href', '/dashboard')
        expect(trackLink).toHaveAttribute('href', '/track')
      })
    })

    it('should have correct links for dashboard and track pages in Chinese', async () => {
      localStorage.setItem('locale', 'zh-CN')

      render(<HomePage />)
      
      await waitFor(() => {
        const dashboardLink = screen.getByText('进入仪表板').closest('a')
        const trackLink = screen.getByText('订单查询').closest('a')
        
        expect(dashboardLink).toHaveAttribute('href', '/dashboard')
        expect(trackLink).toHaveAttribute('href', '/track')
      })
    })
  })

  describe('UI Elements', () => {
    it('should display title in both languages', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('YUANDI Collection Management')).toBeInTheDocument()
      })
    })

    it('should have proper styling classes', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        const dashboardLink = screen.getByText('대시보드로 이동').closest('a')
        const trackLink = screen.getByText('주문 조회').closest('a')
        
        expect(dashboardLink).toHaveClass('bg-blue-600')
        expect(trackLink).toHaveClass('bg-gray-600')
      })
    })

    it('should display language toggle button with flag', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        const toggleButton = screen.getByRole('button')
        expect(toggleButton).toBeInTheDocument()
        expect(toggleButton).toHaveClass('bg-white')
        // Korean mode shows Chinese flag
        expect(screen.getByText('🇨🇳')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid locale in localStorage', async () => {
      localStorage.setItem('locale', 'invalid-locale')

      render(<HomePage />)
      
      await waitFor(() => {
        // Should default to browser language detection
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
      })
    })

    it('should handle invalid locale in cookie', async () => {
      document.cookie = 'locale=invalid; path=/; max-age=31536000'

      render(<HomePage />)
      
      await waitFor(() => {
        // Should default to browser language detection
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
      })
    })

    it('should handle missing navigator.language gracefully', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: undefined,
      })

      render(<HomePage />)
      
      await waitFor(() => {
        // Should default to Korean
        expect(screen.getByText('대시보드로 이동')).toBeInTheDocument()
      })
    })
  })
})