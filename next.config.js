/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Multiple GoTrueClient 경고 방지
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // WSL과 Windows 브라우저 간 개발 지원
  webpackDevMiddleware: config => {
    // WSL에서 파일 변경 감지를 위한 polling 설정
    config.watchOptions = {
      poll: 1000, // 1초마다 체크
      aggregateTimeout: 300, // 300ms 동안 변경사항 수집
      ignored: /node_modules/,
    }
    return config
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Exclude test files from production build
  typescript: {
    // Skip type checking during production build for faster deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during production build for faster deployment
    ignoreDuringBuilds: true,
    dirs: ['app', 'components', 'lib'],
  },
  // PWA optimization
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  // Compression
  compress: true,
  // Bundle analyzer
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },
}

module.exports = nextConfig