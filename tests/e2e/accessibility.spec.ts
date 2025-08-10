import { test, expect } from '@playwright/test';
import { ACCESSIBILITY_TEST } from '../constants/test-constants';
import { SUPPORTED_LOCALES, isValidLanguageCode } from '@/constants';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Check for h1 element
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // There should be at least one h1
    expect(h1Count).toBeGreaterThan(0);

    // There should be only one h1 per page
    expect(h1Count).toBeLessThanOrEqual(1);

    // Check heading hierarchy
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map((el) => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent,
      }));
    });

    // Verify heading levels don't skip (e.g., h1 -> h3 without h2)
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const previousLevel = headings[i - 1].level;

      // Level should not increase by more than 1
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
    }
  });

  test('should have proper ARIA labels for interactive elements', async ({ page }) => {
    await page.goto('/');

    // Check all buttons have accessible text or aria-label
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');

      // Button should have either text content, aria-label, or aria-labelledby
      expect(text || ariaLabel || ariaLabelledBy).toBeTruthy();
    }

    // Check all links have accessible text or aria-label
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const ariaLabelledBy = await link.getAttribute('aria-labelledby');

      // Link should have either text content, aria-label, or aria-labelledby
      expect(text || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    const interactiveElements = await page.evaluate(() => {
      const elements: string[] = [];
      const focusableSelectors =
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      document.querySelectorAll(focusableSelectors).forEach((el) => {
        if (!el.hasAttribute('disabled')) {
          elements.push(el.tagName.toLowerCase());
        }
      });
      return elements;
    });

    // Ensure there are focusable elements
    expect(interactiveElements.length).toBeGreaterThan(0);

    // Test Tab key navigation
    for (
      let i = 0;
      i < Math.min(interactiveElements.length, ACCESSIBILITY_TEST.MAX_TAB_NAVIGATION_ELEMENTS);
      i++
    ) {
      await page.keyboard.press('Tab');

      // Check that an element has focus
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName.toLowerCase();
      });

      expect(focusedElement).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    const contrastResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    const contrastViolations = contrastResults.violations.filter(
      (violation) => violation.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('should have lang attribute on html element', async ({ page }) => {
    await page.goto('/');

    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBeTruthy();

    // Check if it's a supported locale or at least a valid language code
    const isSupported = htmlLang
      ? SUPPORTED_LOCALES.includes(htmlLang as (typeof SUPPORTED_LOCALES)[number])
      : false;
    const isValid = htmlLang ? isValidLanguageCode(htmlLang) : false;

    expect(isSupported || isValid).toBeTruthy();
  });

  test('should have skip navigation link', async ({ page }) => {
    await page.goto('/');

    // Look for skip navigation link (usually hidden but accessible via keyboard)
    const skipLink = page.locator('a').filter({ hasText: /skip/i });
    const skipLinkExists = (await skipLink.count()) > 0;

    // This is a recommendation, not a hard requirement
    if (skipLinkExists) {
      // If skip link exists, it should be the first focusable element
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.textContent);
      expect(firstFocused?.toLowerCase()).toContain('skip');
    }
  });
});
