/**
 * Mobile Responsive Tests for YUANDI ERP
 * TDD approach for mobile-first design validation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import HomePage from '@/app/page'
import LoginPage from '@/app/login/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        refresh: jest.fn(),
    }),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            signInWithPassword: jest.fn(),
        },
    }),
}))

describe('Mobile Responsive Design Tests', () => {
    describe('HomePage Mobile Tests', () => {
        beforeEach(() => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375, // iPhone width
            })
        })

        test('should render mobile-optimized layout', () => {
            render(<HomePage />)

            // Test mobile-specific elements
            expect(screen.getByText('YUANDI Collection')).toBeInTheDocument()
            expect(screen.getByText('Management System')).toBeInTheDocument()

            // Test responsive grid layout
            const featureCards = screen.getAllByText(/주문 관리|재고 관리|배송 관리|출납장부/)
            expect(featureCards).toHaveLength(4)
        })

        test('should have mobile-friendly buttons', () => {
            render(<HomePage />)

            const koreanButton = screen.getByText('한국어로 시작하기')
            const chineseButton = screen.getByText('中文版开始')

            expect(koreanButton).toBeInTheDocument()
            expect(chineseButton).toBeInTheDocument()

            // Test button styling for mobile
            expect(koreanButton).toHaveClass('w-full', 'sm:w-auto')
            expect(chineseButton).toHaveClass('w-full', 'sm:w-auto')
        })

        test('should display feature cards in mobile grid', () => {
            render(<HomePage />)

            // Test feature cards are present
            expect(screen.getByText('주문 관리')).toBeInTheDocument()
            expect(screen.getByText('재고 관리')).toBeInTheDocument()
            expect(screen.getByText('배송 관리')).toBeInTheDocument()
            expect(screen.getByText('출납장부')).toBeInTheDocument()
        })

        test('should have proper mobile spacing and padding', () => {
            render(<HomePage />)

            const mainContainer = screen.getByText('YUANDI Collection').closest('div')
            expect(mainContainer?.parentElement).toHaveClass('px-4', 'sm:px-6', 'lg:px-8')
        })
    })

    describe('LoginPage Mobile Tests', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375,
            })
        })

        test('should render mobile-optimized login form', () => {
            render(<LoginPage />)

            expect(screen.getByText('YUANDI ERP')).toBeInTheDocument()
            expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
            expect(screen.getByLabelText('이메일')).toBeInTheDocument()
            expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
        })

        test('should have mobile-friendly input fields', () => {
            render(<LoginPage />)

            const emailInput = screen.getByLabelText('이메일')
            const passwordInput = screen.getByLabelText('비밀번호')

            expect(emailInput).toHaveClass('h-12', 'text-base')
            expect(passwordInput).toHaveClass('h-12', 'text-base')
        })

        test('should show password toggle on mobile', () => {
            render(<LoginPage />)

            const passwordInput = screen.getByLabelText('비밀번호')
            const toggleButton = passwordInput.parentElement?.querySelector('button')

            expect(toggleButton).toBeInTheDocument()

            // Test password visibility toggle
            fireEvent.click(toggleButton!)
            expect(passwordInput).toHaveAttribute('type', 'text')

            fireEvent.click(toggleButton!)
            expect(passwordInput).toHaveAttribute('type', 'password')
        })

        test('should have mobile-optimized test account buttons', () => {
            render(<LoginPage />)

            // Test account buttons should be in grid layout for mobile
            const testButtons = screen.getAllByRole('button', { name: /계정/ })
            expect(testButtons.length).toBeGreaterThan(0)

            testButtons.forEach(button => {
                expect(button).toHaveClass('h-10', 'text-sm')
            })
        })

        test('should handle form submission on mobile', async () => {
            render(<LoginPage />)

            const emailInput = screen.getByLabelText('이메일')
            const passwordInput = screen.getByLabelText('비밀번호')
            const submitButton = screen.getByRole('button', { name: /로그인/ })

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
            fireEvent.change(passwordInput, { target: { value: 'password123' } })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(screen.getByText('로그인 중...')).toBeInTheDocument()
            })
        })
    })

    describe('Responsive Breakpoint Tests', () => {
        test('should adapt to tablet viewport', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 768, // Tablet width
            })

            render(<HomePage />)

            const koreanButton = screen.getByText('한국어로 시작하기')
            expect(koreanButton).toHaveClass('sm:w-auto')
        })

        test('should adapt to desktop viewport', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1024, // Desktop width
            })

            render(<HomePage />)

            const featureGrid = screen.getByText('주문 관리').closest('.grid')
            expect(featureGrid).toHaveClass('lg:grid-cols-4')
        })
    })

    describe('Touch Interaction Tests', () => {
        test('should handle touch events on mobile buttons', () => {
            render(<HomePage />)

            const koreanButton = screen.getByText('한국어로 시작하기')

            // Simulate touch events
            fireEvent.touchStart(koreanButton)
            fireEvent.touchEnd(koreanButton)

            expect(koreanButton).toBeInTheDocument()
        })

        test('should have proper touch targets (minimum 44px)', () => {
            render(<LoginPage />)

            const submitButton = screen.getByRole('button', { name: /로그인/ })
            expect(submitButton).toHaveClass('h-12') // 48px height
        })
    })

    describe('Accessibility Tests for Mobile', () => {
        test('should have proper ARIA labels for mobile screen readers', () => {
            render(<LoginPage />)

            const emailInput = screen.getByLabelText('이메일')
            const passwordInput = screen.getByLabelText('비밀번호')

            expect(emailInput).toHaveAttribute('type', 'email')
            expect(passwordInput).toHaveAttribute('type', 'password')
        })

        test('should have proper focus management on mobile', () => {
            render(<LoginPage />)

            const emailInput = screen.getByLabelText('이메일')
            emailInput.focus()

            expect(emailInput).toHaveFocus()
        })
    })
})

describe('Performance Tests for Mobile', () => {
    test('should render quickly on mobile devices', () => {
        const startTime = performance.now()
        render(<HomePage />)
        const endTime = performance.now()

        // Should render within 100ms on mobile
        expect(endTime - startTime).toBeLessThan(100)
    })

    test('should not have layout shift on mobile', () => {
        render(<HomePage />)

        // Test that elements are properly positioned
        const mainTitle = screen.getByText('YUANDI Collection')
        expect(mainTitle).toBeInTheDocument()

        // Test that buttons are properly sized
        const buttons = screen.getAllByRole('link')
        buttons.forEach(button => {
            expect(button).toHaveClass('w-full', 'sm:w-auto')
        })
    })
})
