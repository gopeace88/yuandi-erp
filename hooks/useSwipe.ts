import { useState, useEffect, useRef } from 'react'

interface SwipeOptions {
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    onSwipeUp?: () => void
    onSwipeDown?: () => void
    threshold?: number
    preventDefaultTouchmoveEvent?: boolean
}

export function useSwipe(options: SwipeOptions = {}) {
    const {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        threshold = 50,
        preventDefaultTouchmoveEvent = false
    } = options

    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
    const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
    const elementRef = useRef<HTMLElement>(null)

    const minSwipeDistance = threshold

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null)
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        })
    }

    const onTouchMove = (e: TouchEvent) => {
        if (preventDefaultTouchmoveEvent) {
            e.preventDefault()
        }
        setTouchEnd({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        })
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distanceX = touchStart.x - touchEnd.x
        const distanceY = touchStart.y - touchEnd.y
        const isLeftSwipe = distanceX > minSwipeDistance
        const isRightSwipe = distanceX < -minSwipeDistance
        const isUpSwipe = distanceY > minSwipeDistance
        const isDownSwipe = distanceY < -minSwipeDistance

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft()
        }
        if (isRightSwipe && onSwipeRight) {
            onSwipeRight()
        }
        if (isUpSwipe && onSwipeUp) {
            onSwipeUp()
        }
        if (isDownSwipe && onSwipeDown) {
            onSwipeDown()
        }
    }

    useEffect(() => {
        const element = elementRef.current
        if (!element) return

        element.addEventListener('touchstart', onTouchStart, { passive: false })
        element.addEventListener('touchmove', onTouchMove, { passive: false })
        element.addEventListener('touchend', onTouchEnd, { passive: false })

        return () => {
            element.removeEventListener('touchstart', onTouchStart)
            element.removeEventListener('touchmove', onTouchMove)
            element.removeEventListener('touchend', onTouchEnd)
        }
    }, [touchStart, touchEnd])

    return elementRef
}

// Pull to refresh hook
export function usePullToRefresh(onRefresh: () => void, threshold = 80) {
    const [isPulling, setIsPulling] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const elementRef = useRef<HTMLElement>(null)

    const onTouchStart = (e: TouchEvent) => {
        if (window.scrollY === 0) {
            setIsPulling(true)
        }
    }

    const onTouchMove = (e: TouchEvent) => {
        if (!isPulling) return

        const touchY = e.touches[0].clientY
        const startY = e.touches[0].clientY - e.touches[0].clientY
        const distance = Math.max(0, touchY - startY)

        if (distance > 0) {
            setPullDistance(distance)
            e.preventDefault()
        }
    }

    const onTouchEnd = () => {
        if (pullDistance > threshold) {
            onRefresh()
        }
        setIsPulling(false)
        setPullDistance(0)
    }

    useEffect(() => {
        const element = elementRef.current
        if (!element) return

        element.addEventListener('touchstart', onTouchStart, { passive: false })
        element.addEventListener('touchmove', onTouchMove, { passive: false })
        element.addEventListener('touchend', onTouchEnd, { passive: false })

        return () => {
            element.removeEventListener('touchstart', onTouchStart)
            element.removeEventListener('touchmove', onTouchMove)
            element.removeEventListener('touchend', onTouchEnd)
        }
    }, [isPulling, pullDistance])

    return { elementRef, isPulling, pullDistance }
}
