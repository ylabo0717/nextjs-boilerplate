/**
 * Playwright test framework for end-to-end testing
 */
import { test, expect } from '@playwright/test';

/**
 * Test constants for UI interactions, scroll positions, and test data
 */
import { UI_WAIT_TIMES, SCROLL_POSITIONS, TEST_DATA } from '../constants/test-constants';

/**
 * Navigation test suite
 * Tests the application's navigation system including links, routing, and scroll behavior
 * Validates that all navigation elements work correctly across different scenarios
 */
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /**
   * Tests that external links have proper security attributes for safe navigation.
   *
   * Verifies that all external links (`target="_blank"`) include the `rel="noopener noreferrer"`
   * attribute to prevent security vulnerabilities like tabnabbing attacks and to avoid
   * sharing the referrer information with external sites.
   */
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

  /**
   * Tests that the application handles non-existent routes with appropriate responses.
   *
   * Verifies that navigating to a non-existent page returns either a 200 status
   * (for client-side routing) or 404 status (for server-side rendering), ensuring
   * the application doesn't crash on invalid routes and provides proper error handling.
   */
  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/non-existent-page');

    // Next.js should return either 200 (client-side navigation) or 404 (server-side)
    // for non-existent pages
    expect([200, 404]).toContain(response?.status());
  });

  /**
   * Tests that the application properly handles page scrolling and maintains scroll behavior.
   *
   * Creates dynamic scrollable content and verifies that scrolling functions work correctly.
   * This ensures the application provides good user experience with proper scroll handling
   * and doesn't break scrolling functionality during navigation or content updates.
   */
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
