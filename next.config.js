/** @type {import('next').NextConfig} */
const nextConfig = {
  // React strict mode for better development
  reactStrictMode: true,
  
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // TypeScript and ESLint configuration for Vercel deployment
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // TODO: Fix Supabase type generation and remove this
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Image optimization configuration
  images: {
    domains: ['localhost', 'supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache images for 1 year
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  
  // App Router에서는 i18n 설정을 직접 지원하지 않음
  // middleware.ts와 custom implementation 사용
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production (except errors and warnings)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Experimental features for better performance
  experimental: {
    // Optimize package imports for tree-shaking
    optimizePackageImports: [
      '@supabase/supabase-js',
      'lucide-react',
      'xlsx',
      'file-saver',
    ],
    
    // Server Actions configuration
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Security and caching headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Cache static assets for 1 year
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Next.js images for 1 year
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache fonts for 1 year
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // ISR pages - cache for 1 hour, revalidate in background
        source: '/(dashboard|orders|inventory)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Fix for isomorphic-dompurify and other browser-only modules
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    // Bundle analyzer in production build
    if (!dev && !isServer && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: false,
        })
      );
    }
    
    // Optimize chunks in production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Supabase SDK chunk
            supabase: {
              name: 'supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // UI libraries chunk
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/](react-dom|lucide-react)[\\/]/,
              chunks: 'all',
              priority: 25,
            },
            // Excel libraries chunk (heavy)
            excel: {
              name: 'excel',
              test: /[\\/]node_modules[\\/](xlsx|file-saver)[\\/]/,
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Enable compression
  compress: true,
  
  // Generate ETags for caching
  generateEtags: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: 'YUANDI Collection Management',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
};

module.exports = nextConfig;