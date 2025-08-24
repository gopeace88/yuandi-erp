import Head from 'next/head'
import { useRouter } from 'next/router'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  author?: string
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
  locale?: 'ko' | 'zh-CN'
  alternateLocales?: Array<{ locale: string; url: string }>
  noindex?: boolean
  nofollow?: boolean
  canonical?: string
  jsonLd?: Record<string, any>
}

const DEFAULT_TITLE = 'YUANDI Collection Management System'
const DEFAULT_DESCRIPTION = 'Professional order and inventory management system for YUANDI Collection'
const DEFAULT_KEYWORDS = 'YUANDI Collection, 재고관리, 주문관리, 库存管理, 订单管理'
const DEFAULT_IMAGE = '/images/og-image.png'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yuandi.com'

export function SEOHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  locale = 'ko',
  alternateLocales = [],
  noindex = false,
  nofollow = false,
  canonical,
  jsonLd,
}: SEOProps) {
  const router = useRouter()
  const currentUrl = url || `${SITE_URL}${router.asPath}`
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`

  // Generate page-specific title
  const pageTitle = title === DEFAULT_TITLE ? title : `${title} | ${DEFAULT_TITLE}`

  // Robots meta
  const robotsContent = `${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`

  // Default JSON-LD structured data
  const defaultJsonLd = {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : 'WebSite',
    name: pageTitle,
    description,
    url: currentUrl,
    image: imageUrl,
    inLanguage: locale === 'ko' ? 'ko-KR' : 'zh-CN',
    ...(author && { author: { '@type': 'Person', name: author } }),
    ...(publishedTime && { datePublished: publishedTime }),
    ...(modifiedTime && { dateModified: modifiedTime }),
  }

  const structuredData = jsonLd || defaultJsonLd

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author || 'YUANDI'} />
      <meta name="robots" content={robotsContent} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta charSet="utf-8" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical || currentUrl} />
      
      {/* Language Alternates */}
      {alternateLocales.map(({ locale, url }) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={url}
        />
      ))}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="YUANDI" />
      <meta property="og:locale" content={locale === 'ko' ? 'ko_KR' : 'zh_CN'} />
      
      {/* Article specific Open Graph tags */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Theme Color */}
      <meta name="theme-color" content="#2563eb" />
      
      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      {process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      )}
      
      {/* Preconnect */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </Head>
  )
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  }
}

/**
 * Generate product structured data
 */
export function generateProductJsonLd(product: {
  name: string
  description: string
  image: string
  sku: string
  price: number
  currency: string
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  brand?: string
  category?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image.startsWith('http') ? product.image : `${SITE_URL}${product.image}`,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability}`,
    },
    ...(product.brand && { brand: { '@type': 'Brand', name: product.brand } }),
    ...(product.category && { category: product.category }),
  }
}

/**
 * Generate organization structured data
 */
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'YUANDI',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean', 'Chinese'],
    },
    sameAs: [
      // Add social media URLs here
    ],
  }
}

/**
 * Generate FAQ structured data
 */
export function generateFAQJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}