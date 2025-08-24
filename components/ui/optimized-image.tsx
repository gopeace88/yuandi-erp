'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  sizes?: string
}

/**
 * Optimized Image Component with lazy loading and blur placeholder
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  objectFit = 'cover',
  sizes,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Generate blur data URL if not provided
  const shimmer = (w: number, h: number) => `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f6f7f8" offset="20%" />
          <stop stop-color="#edeef1" offset="50%" />
          <stop stop-color="#f6f7f8" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f6f7f8" />
      <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
    </svg>`

  const toBase64 = (str: string) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str)

  const defaultBlurDataURL = `data:image/svg+xml;base64,${toBase64(
    shimmer(width || 700, height || 475)
  )}`

  // Handle image error with fallback
  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  // Handle image load
  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  // Fallback image for errors
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={{ width, height }}
      >
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        style={{
          objectFit,
          width: width ? undefined : '100%',
          height: height ? undefined : 'auto',
        }}
        className={cn(
          'duration-700 ease-in-out',
          isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'
        )}
      />
    </div>
  )
}

/**
 * Product Image Component with Supabase Storage integration
 */
export function ProductImage({
  productId,
  imageUrl,
  alt,
  size = 'medium',
  ...props
}: {
  productId: string
  imageUrl?: string
  alt: string
  size?: 'small' | 'medium' | 'large' | 'thumbnail'
} & Omit<OptimizedImageProps, 'src' | 'width' | 'height'>) {
  const sizeConfig = {
    thumbnail: { width: 80, height: 80 },
    small: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 },
  }

  const { width, height } = sizeConfig[size]
  
  // Use placeholder if no image URL
  const src = imageUrl || `/api/placeholder/${width}/${height}`

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      {...props}
    />
  )
}

/**
 * Avatar Image Component with fallback
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  fallback,
  ...props
}: {
  src?: string
  alt: string
  size?: number
  fallback?: string
} & Omit<OptimizedImageProps, 'src' | 'width' | 'height'>) {
  const [showFallback, setShowFallback] = useState(!src)

  if (showFallback || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-blue-500 text-white font-semibold rounded-full',
          props.className
        )}
        style={{ width: size, height: size }}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setShowFallback(true)}
      className={cn('rounded-full', props.className)}
      {...props}
    />
  )
}