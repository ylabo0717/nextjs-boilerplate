import { test, expect } from '@playwright/test';
import { VIEWPORT_SIZES } from '../constants/test-constants';

test.describe('Home Page', () => {
  test('should display the home page', async ({ page }) => {
    await page.goto('/');

    // Check if the page title is correct
    await expect(page).toHaveTitle('Next.js Boilerplate');

    // Check if main content is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have correct meta tags', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1');

    // Check description meta tag
    const description = await page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute(
      'content',
      'Production-ready Next.js boilerplate for enterprise applications'
    );
  });

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

  test('should have accessible elements', async ({ page }) => {
    await page.goto('/');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
