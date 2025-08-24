# YUANDI Vercel Deployment Guide

## 📋 Prerequisites

- Vercel account
- GitHub repository
- Supabase project
- Custom domain (optional)

## 🚀 Quick Deploy

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup-vercel-env.sh
./scripts/setup-vercel-env.sh
```

### 3. Deploy

```bash
# Development preview
vercel

# Production deployment
vercel --prod
```

## 🔧 Manual Setup

### Step 1: Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select "Next.js" as framework preset

### Step 2: Configure Environment Variables

Add these variables in Vercel Dashboard > Settings > Environment Variables:

#### Required Variables

| Variable | Environment | Description |
|----------|------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_API_KEY` | All | Supabase anon key |
| `SUPABASE_API_KEY` | Production, Preview | Supabase service key |
| `SUPABASE_JWT_SECRET` | Production, Preview | JWT secret from Supabase |
| `NEXT_PUBLIC_APP_URL` | All | Your domain (https://yuandi.com) |
| `NODE_ENV` | Production | Set to "production" |
| `CSRF_SECRET` | Production | 32+ character random string |
| `ENCRYPTION_KEY` | Production | 64 character hex string |

#### Optional Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | Sentry deployment integration |
| `DAUM_POSTCODE_KEY` | Korean address API |
| `CRON_SECRET` | Secure cron endpoints |

### Step 3: Configure Custom Domain

1. Go to Vercel Dashboard > Settings > Domains
2. Add your domain: `yuandi.com`
3. Configure DNS records:

```
Type  Name    Value
A     @       76.76.21.21
CNAME www     cname.vercel-dns.com
```

### Step 4: SSL Certificate

Vercel automatically provisions SSL certificates via Let's Encrypt:

- Automatic HTTPS redirect
- Auto-renewal
- HSTS enabled
- SSL/TLS score: A+

## 📊 Monitoring Setup

### Vercel Analytics

Automatically enabled for Pro accounts:

```typescript
// Already configured in app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Sentry Error Tracking

1. Create account at [sentry.io](https://sentry.io)
2. Create new project (Next.js)
3. Get DSN from Project Settings
4. Install Sentry:

```bash
npx @sentry/wizard@latest -i nextjs
```

5. Configure `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

### Performance Monitoring

Web Vitals are automatically tracked:

```typescript
// app/layout.tsx or pages/_app.tsx
export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    // Send to analytics
    console.log(metric);
  }
}
```

## 🔄 Deployment Process

### GitHub Integration

1. **Automatic Deployments**
   - Production: Push to `main` branch
   - Preview: Push to any other branch
   - Pull Request: Automatic preview deployment

2. **Manual Deployment**
   ```bash
   vercel --prod
   ```

### Build Optimization

Run before deployment:

```bash
node scripts/optimize-build.js
npm run build
```

### Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback

# Rollback to specific deployment
vercel rollback [deployment-url]
```

## 📝 Production Checklist

### Before Deployment

- [ ] All environment variables set in Vercel
- [ ] Database migrations completed
- [ ] RLS policies enabled in Supabase
- [ ] TypeScript errors resolved
- [ ] ESLint warnings fixed
- [ ] Bundle size < 500KB
- [ ] Images optimized
- [ ] Security headers configured

### After Deployment

- [ ] Test all critical paths
- [ ] Verify SSL certificate
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Test on mobile devices
- [ ] Verify SEO meta tags
- [ ] Test payment flow (if applicable)
- [ ] Check email notifications

## 🛠️ Troubleshooting

### Build Failures

```bash
# Check build logs
vercel logs [deployment-url]

# Local build test
npm run build
```

### Environment Variables

```bash
# List all env vars
vercel env ls

# Pull env vars locally
vercel env pull .env.local
```

### Performance Issues

1. Check bundle size:
   ```bash
   npm run analyze
   ```

2. Enable caching headers in `vercel.json`

3. Use ISR for dynamic pages:
   ```typescript
   export const revalidate = 60; // seconds
   ```

### Domain Issues

1. Verify DNS propagation:
   ```bash
   nslookup yuandi.com
   ```

2. Check SSL status:
   ```bash
   curl -I https://yuandi.com
   ```

## 🔒 Security

### Headers

Already configured in `vercel.json`:
- CSP (Content Security Policy)
- HSTS (Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

### Secrets Rotation

```bash
# Generate new secrets
openssl rand -hex 32

# Update in Vercel Dashboard
# Redeploy
vercel --prod --force
```

## 📈 Monitoring

### Key Metrics

Monitor in Vercel Dashboard:

- **Performance**
  - First Contentful Paint < 1.8s
  - Time to Interactive < 3.9s
  - Cumulative Layout Shift < 0.1

- **Availability**
  - Uptime > 99.9%
  - Error rate < 1%

- **Usage**
  - Bandwidth usage
  - Function invocations
  - Edge requests

### Alerts

Set up in Vercel Dashboard > Settings > Integrations:

1. Slack notifications
2. Email alerts
3. PagerDuty integration
4. Custom webhooks

## 🚨 Emergency Procedures

### High Error Rate

1. Check Sentry for errors
2. Rollback if critical:
   ```bash
   vercel rollback --prod
   ```
3. Fix and redeploy

### Performance Degradation

1. Check Vercel Analytics
2. Review recent changes
3. Scale functions if needed:
   ```json
   // vercel.json
   {
     "functions": {
       "app/api/*/route.ts": {
         "maxDuration": 60,
         "memory": 3008
       }
     }
   }
   ```

### Security Incident

1. Rotate all secrets immediately
2. Review audit logs
3. Enable maintenance mode:
   ```bash
   vercel env add NEXT_PUBLIC_MAINTENANCE_MODE true production
   ```

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase + Vercel Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

## 💡 Best Practices

1. **Use Preview Deployments**: Test every PR before merging
2. **Monitor Bundle Size**: Keep under 500KB for optimal performance
3. **Cache Aggressively**: Use ISR and static generation where possible
4. **Optimize Images**: Use next/image with Vercel's image optimization
5. **Set Resource Limits**: Configure function memory and timeout
6. **Use Edge Functions**: For geo-distributed logic
7. **Enable Analytics**: Monitor real user metrics
8. **Regular Updates**: Keep dependencies updated
9. **Backup Strategy**: Regular database backups
10. **Documentation**: Keep deployment docs updated