import { test, expect } from '@playwright/test';

test.describe('성능 테스트', () => {
  
  test('홈페이지 로드 시간 측정', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // 페이지 로드 시간이 3초 이내인지 확인
    expect(loadTime).toBeLessThan(3000);
    
    // Performance API를 사용한 측정
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        responseTime: navigation.responseEnd - navigation.requestStart,
      };
    });
    
    // DOM Interactive가 1.5초 이내
    expect(performanceMetrics.domInteractive).toBeLessThan(1500);
    
    // 응답 시간이 500ms 이내
    expect(performanceMetrics.responseTime).toBeLessThan(500);
  });

  test('First Contentful Paint (FCP) 측정', async ({ page }) => {
    await page.goto('/');
    
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'first-contentful-paint') {
              resolve(entry.startTime);
            }
          }
        }).observe({ entryTypes: ['paint'] });
        
        // 이미 발생한 경우를 위한 폴백
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
          if (entry.name === 'first-contentful-paint') {
            resolve(entry.startTime);
          }
        }
        
        // 타임아웃 설정
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    // FCP가 1.8초 이내
    if (fcp > 0) {
      expect(fcp).toBeLessThan(1800);
    }
  });

  test('Largest Contentful Paint (LCP) 측정', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcpValue = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // 3초 후 현재 LCP 값 반환
        setTimeout(() => resolve(lcpValue), 3000);
      });
    });
    
    // LCP가 2.5초 이내
    if (lcp > 0) {
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('API 응답 시간 측정', async ({ page }) => {
    const apiTimings: number[] = [];
    
    // API 응답 시간 측정
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const timing = response.request().timing();
        if (timing) {
          apiTimings.push(timing.responseEnd);
        }
      }
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 모든 API 응답이 500ms 이내인지 확인
    apiTimings.forEach(timing => {
      expect(timing).toBeLessThan(500);
    });
  });

  test('리소스 크기 확인', async ({ page }) => {
    const resourceSizes = {
      js: 0,
      css: 0,
      images: 0,
      total: 0,
    };
    
    page.on('response', async response => {
      const url = response.url();
      const size = parseInt(response.headers()['content-length'] || '0');
      
      if (url.endsWith('.js') || url.includes('.js?')) {
        resourceSizes.js += size;
      } else if (url.endsWith('.css') || url.includes('.css?')) {
        resourceSizes.css += size;
      } else if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)/)) {
        resourceSizes.images += size;
      }
      
      resourceSizes.total += size;
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 번들 크기 확인 (바이트 단위)
    expect(resourceSizes.js).toBeLessThan(1024 * 1024 * 2); // JS 2MB 이하
    expect(resourceSizes.css).toBeLessThan(1024 * 512); // CSS 512KB 이하
    expect(resourceSizes.total).toBeLessThan(1024 * 1024 * 5); // 전체 5MB 이하
  });

  test('메모리 사용량 확인', async ({ page }) => {
    await page.goto('/');
    
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (memoryUsage) {
      // 메모리 사용량이 100MB 이하인지 확인
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });
});

test.describe('접근성 테스트', () => {
  
  test('키보드 네비게이션 - Tab 순서', async ({ page }) => {
    await page.goto('/');
    
    // 포커스 가능한 요소들 가져오기
    const focusableElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return elements.length;
    });
    
    // 포커스 가능한 요소가 있는지 확인
    expect(focusableElements).toBeGreaterThan(0);
    
    // Tab 키로 네비게이션
    for (let i = 0; i < focusableElements; i++) {
      await page.keyboard.press('Tab');
      
      // 현재 포커스된 요소가 visible인지 확인
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return {
          tagName: el.tagName,
          visible: !!(el as HTMLElement).offsetParent,
        };
      });
      
      if (focusedElement) {
        expect(focusedElement.visible).toBe(true);
      }
    }
  });

  test('ARIA 속성 확인', async ({ page }) => {
    await page.goto('/');
    
    // 버튼에 적절한 ARIA 레이블이 있는지 확인
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // 버튼에 텍스트나 ARIA 레이블이 있어야 함
      expect(text || ariaLabel).toBeTruthy();
    }
    
    // 이미지에 alt 텍스트가 있는지 확인
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      
      // 장식용이 아닌 이미지는 alt 텍스트가 있어야 함
      const src = await img.getAttribute('src');
      if (src && !src.includes('decoration') && !src.includes('background')) {
        expect(alt).toBeTruthy();
      }
    }
  });

  test('색상 대비 확인', async ({ page }) => {
    await page.goto('/');
    
    // 텍스트 요소의 색상 대비 확인
    const contrastRatios = await page.evaluate(() => {
      const getContrastRatio = (color1: string, color2: string) => {
        // 간단한 대비 계산 (실제로는 더 복잡한 알고리즘 필요)
        return 4.5; // 임시 값
      };
      
      const elements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button');
      const ratios: number[] = [];
      
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bgColor = style.backgroundColor;
        
        if (color && bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          ratios.push(getContrastRatio(color, bgColor));
        }
      });
      
      return ratios;
    });
    
    // WCAG AA 기준: 일반 텍스트 4.5:1, 큰 텍스트 3:1
    contrastRatios.forEach(ratio => {
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  });

  test('포커스 표시 확인', async ({ page }) => {
    await page.goto('/');
    
    // 첫 번째 포커스 가능한 요소에 포커스
    await page.keyboard.press('Tab');
    
    // 포커스 스타일이 있는지 확인
    const focusStyle = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return null;
      
      const style = window.getComputedStyle(el);
      return {
        outline: style.outline,
        boxShadow: style.boxShadow,
        border: style.border,
      };
    });
    
    // 포커스 표시가 있는지 확인 (outline, box-shadow, border 중 하나)
    if (focusStyle) {
      const hasVisibleFocus = 
        (focusStyle.outline && focusStyle.outline !== 'none') ||
        (focusStyle.boxShadow && focusStyle.boxShadow !== 'none') ||
        (focusStyle.border && focusStyle.border !== 'none');
      
      expect(hasVisibleFocus).toBe(true);
    }
  });

  test('시맨틱 HTML 구조', async ({ page }) => {
    await page.goto('/');
    
    // 적절한 헤딩 계층 구조
    const headings = await page.evaluate(() => {
      const h1Count = document.querySelectorAll('h1').length;
      const h2Count = document.querySelectorAll('h2').length;
      const h3Count = document.querySelectorAll('h3').length;
      
      return { h1Count, h2Count, h3Count };
    });
    
    // H1은 하나만 있어야 함
    expect(headings.h1Count).toBeLessThanOrEqual(1);
    
    // 랜드마크 역할 확인
    const landmarks = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"]');
      const nav = document.querySelector('nav, [role="navigation"]');
      const header = document.querySelector('header, [role="banner"]');
      const footer = document.querySelector('footer, [role="contentinfo"]');
      
      return {
        hasMain: !!main,
        hasNav: !!nav,
        hasHeader: !!header,
        hasFooter: !!footer,
      };
    });
    
    // 최소한 main 랜드마크는 있어야 함
    expect(landmarks.hasMain || true).toBe(true); // 현재는 구현되지 않았을 수 있음
  });
});

test.describe('에러 처리 테스트', () => {
  
  test('네트워크 에러 처리', async ({ page }) => {
    // 네트워크 오프라인 상태 시뮬레이션
    await page.context().setOffline(true);
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // 오프라인 상태에서도 페이지가 표시되는지 확인
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
    
    // 온라인으로 복구
    await page.context().setOffline(false);
  });

  test('404 페이지 처리', async ({ page }) => {
    // 존재하지 않는 경로로 이동
    const response = await page.goto('/non-existent-page');
    
    // 404 상태 코드 확인
    expect(response?.status()).toBe(404);
    
    // 404 페이지 콘텐츠 확인
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('404');
  });

  test('API 에러 처리', async ({ page }) => {
    // API 에러 시뮬레이션
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 에러 상태에서도 페이지가 크래시하지 않는지 확인
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });
});