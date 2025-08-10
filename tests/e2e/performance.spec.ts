import { test, expect } from '@playwright/test';
import { NETWORK_WAIT_TIMES } from '../constants/timeouts';

test.describe('Performance', () => {
  test('should load the home page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load within acceptable time
    expect(loadTime).toBeLessThan(NETWORK_WAIT_TIMES.API_RESPONSE);
  });

  test('should have good Web Vitals metrics', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Measure First Contentful Paint (FCP)
    const fcpMetric = await page.evaluate(
      () =>
        new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find((entry) => entry.name === 'first-contentful-paint');
            if (fcp) {
              resolve(fcp.startTime);
            }
          }).observe({ entryTypes: ['paint'] });

          // Fallback if FCP already happened
          const existingFCP = performance.getEntriesByName('first-contentful-paint')[0];
          if (existingFCP) {
            resolve(existingFCP.startTime);
          }
        })
    );

    // FCP should be less than 1.8 seconds (good threshold)
    expect(Number(fcpMetric)).toBeLessThan(1800);
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('/');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (
          performance as Performance & {
            memory: { usedJSHeapSize: number };
          }
        ).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (
          performance as Performance & {
            memory: { usedJSHeapSize: number };
          }
        ).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory increase should be reasonable (not more than 50MB)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB
      expect(memoryIncrease).toBeLessThan(50);
    }
  });

  test('should have optimized images', async ({ page }) => {
    await page.goto('/');

    // Check if Next.js Image component is used
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);

      // Check for lazy loading
      const loading = await img.getAttribute('loading');
      if (loading) {
        expect(['lazy', 'eager']).toContain(loading);
      }

      // Check for alt text (accessibility)
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
