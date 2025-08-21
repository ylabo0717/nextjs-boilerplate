/**
 * Playwright test framework for end-to-end testing
 */
import { test, expect } from '@playwright/test';

/**
 * Performance testing constants including network timing, thresholds, and memory conversion utilities
 */
import {
  NETWORK_WAIT_TIMES,
  PERFORMANCE_THRESHOLDS,
  MEMORY_CONVERSION,
} from '../constants/test-constants';

/**
 * Performance test suite
 * Tests application performance metrics including load times, Web Vitals, memory usage, and resource optimization
 * Ensures the application meets performance standards and provides a fast user experience
 */
test.describe('Performance', () => {
  /**
   * Tests that the home page loads within acceptable performance thresholds.
   * 
   * Measures the time from navigation start to page load completion and ensures
   * it meets performance standards. Fast page load times are crucial for user
   * experience, SEO rankings, and reducing bounce rates.
   */
  test('should load the home page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load within acceptable time
    expect(loadTime).toBeLessThan(NETWORK_WAIT_TIMES.API_RESPONSE);
  });

  /**
   * Tests that the application meets Core Web Vitals performance standards.
   * 
   * Measures First Contentful Paint (FCP) and ensures it meets Google's "good" threshold.
   * Core Web Vitals are essential for SEO and user experience, directly impacting
   * search rankings and user satisfaction with page load performance.
   */
  test('should have good Web Vitals metrics', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Measure First Contentful Paint (FCP)
    const fcpMetric = await page.evaluate(
      (timeout) =>
        new Promise<number | null>((resolve) => {
          // Set a timeout to prevent infinite waiting
          const timeoutId = setTimeout(() => {
            resolve(null);
          }, timeout);

          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find((entry) => entry.name === 'first-contentful-paint');
            if (fcp) {
              clearTimeout(timeoutId);
              resolve(fcp.startTime);
            }
          }).observe({ entryTypes: ['paint'] });

          // Fallback if FCP already happened
          const existingFCP = performance.getEntriesByName('first-contentful-paint')[0];
          if (existingFCP) {
            clearTimeout(timeoutId);
            resolve(existingFCP.startTime);
          }
        }),
      NETWORK_WAIT_TIMES.PAGE_LOAD
    );

    // Ensure FCP metric was captured
    expect(fcpMetric).not.toBeNull();
    expect(fcpMetric).toBeDefined();

    // FCP should be less than 1.8 seconds (good threshold)
    expect(fcpMetric as number).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP_GOOD);
  });

  /**
   * Tests that the application doesn't have memory leaks during normal usage.
   * 
   * Performs multiple page reloads and monitors JavaScript heap usage to ensure
   * memory consumption doesn't grow excessively. Memory leaks can cause performance
   * degradation and application crashes in long-running sessions.
   */
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

    // Memory increase should be reasonable (not more than PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_MAX MB)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = (finalMemory - initialMemory) / MEMORY_CONVERSION.BYTES_TO_MB;
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_MAX);
    }
  });

  /**
   * Tests that images are properly optimized for performance and accessibility.
   * 
   * Verifies that images use appropriate loading strategies (lazy/eager) and have
   * alt text for accessibility. Proper image optimization reduces bandwidth usage,
   * improves load times, and ensures the application is accessible to all users.
   */
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
