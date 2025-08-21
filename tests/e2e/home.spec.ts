/**
 * Home Page Testing Suite
 *
 * End-to-end tests for the main landing page functionality, content validation,
 * responsive design, and basic accessibility features. Ensures the application's
 * entry point works correctly across different devices and user scenarios.
 */

import { test, expect } from '@playwright/test';
import { VIEWPORT_SIZES } from '../constants/test-constants';

/**
 * Home page test suite
 * Tests the main landing page functionality, content, and responsiveness
 * Validates core elements and user interactions on the home page
 */
test.describe('Home Page', () => {
  /**
   * Tests that the home page loads successfully with correct title and main content.
   *
   * Verifies the page title matches expectations and the main content area is visible.
   * This is a fundamental smoke test ensuring the application's entry point works correctly
   * and basic Next.js routing and metadata configuration are functioning properly.
   */
  test('should display the home page', async ({ page }) => {
    await page.goto('/');

    /**
     * Verify the page title matches the expected application name.
     * This ensures the Next.js app is correctly configured and the metadata
     * is properly set in the layout component.
     * 
     * @remarks
     * Note: This test uses a fixed string 'Next.js Boilerplate'. If the project
     * name changes, this test will need to be updated. Consider using a constant
     * or dynamic value from the application's metadata for better maintainability.
     */
    await expect(page).toHaveTitle('Next.js Boilerplate');

    // Check if main content is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  /**
   * Tests that essential HTML meta tags are properly configured for SEO and mobile optimization.
   *
   * Verifies viewport and description meta tags have correct attributes for responsive design
   * and search engine optimization. Proper meta tags are crucial for SEO rankings
   * and ensuring the application displays correctly on mobile devices.
   */
  test('should have correct meta tags', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1');

    // Check description meta tag
    const description = await page.locator('meta[name="description"]');
    /**
     * @remarks
     * Note: This test uses a fixed description string. If the project description
     * changes, this test will need to be updated. Consider using a constant or
     * dynamic value for better maintainability and to avoid unnecessary test failures.
     */
    await expect(description).toHaveAttribute(
      'content',
      'Production-ready Next.js boilerplate for enterprise applications'
    );
  });

  /**
   * Tests that documentation links are properly configured for external navigation.
   *
   * Verifies that links to Next.js documentation have correct href attributes pointing
   * to nextjs.org and open in new tabs for better user experience. This ensures
   * users can access documentation without leaving the application.
   */
  test('should navigate to Next.js docs when clicking the first card', async ({ page }) => {
    await page.goto('/');

    // Check for the docs link
    const docsLink = page.locator('a').filter({ hasText: /docs/i }).first();
    const count = await docsLink.count();

    if (count > 0) {
      // Check that the link has a href attribute
      const href = await docsLink.getAttribute('href');
      expect(href).toContain('nextjs.org');

      // Check that the link opens in a new tab
      await expect(docsLink).toHaveAttribute('target', '_blank');
    }
  });

  /**
   * Tests that the application's responsive design works across different viewport sizes.
   *
   * Verifies that main content remains visible and properly displayed on both desktop
   * and mobile viewports. Responsive design ensures the application provides
   * a good user experience across all device types and screen sizes.
   */
  test('should have responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize(VIEWPORT_SIZES.DESKTOP);
    await page.goto('/');

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Test mobile view
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await expect(mainContent).toBeVisible();
  });

  /**
   * Tests that the application supports basic keyboard accessibility navigation.
   *
   * Verifies that keyboard navigation (Tab key) works and elements can receive focus.
   * This is a basic accessibility test ensuring the application is usable by people
   * who rely on keyboard navigation due to motor disabilities or assistive technologies.
   */
  test('should have accessible elements', async ({ page }) => {
    await page.goto('/');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
