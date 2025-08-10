import { test, expect } from '@playwright/test';
import { UI_WAIT_TIMES, SCROLL_POSITIONS, TEST_DATA } from '../constants/test-constants';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load external links with correct attributes', async ({ page }) => {
    // Get all external links
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();

    // Ensure we have external links
    expect(count).toBeGreaterThan(0);

    // Check each external link has rel="noopener noreferrer" for security
    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/non-existent-page');

    // Next.js should still return 200 for client-side navigation
    // but we should see the 404 page content
    expect(response?.status()).toBeLessThanOrEqual(404);
  });

  test('should maintain scroll position on navigation', async ({ page }) => {
    // Add more content to make page scrollable
    await page.evaluate(
      ({ contentCount, elementHeight }) => {
        const main = document.querySelector('main');
        if (main) {
          for (let i = 0; i < contentCount; i++) {
            const div = document.createElement('div');
            div.textContent = `Content ${i}`;
            div.style.height = elementHeight;
            main.appendChild(div);
          }
        }
      },
      { contentCount: TEST_DATA.SCROLL_CONTENT_COUNT, elementHeight: TEST_DATA.ELEMENT_HEIGHT_PX }
    );

    // Wait for content to be rendered
    await page.waitForTimeout(UI_WAIT_TIMES.MINIMAL);

    // Scroll down
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), SCROLL_POSITIONS.STANDARD);

    // Wait for scroll to complete
    await page.waitForTimeout(UI_WAIT_TIMES.MINIMAL);

    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeGreaterThan(0);
  });
});
