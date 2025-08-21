/**
 * Accessibility Testing Suite
 *
 * End-to-end tests for WCAG compliance and accessibility standards.
 * Uses Playwright and Axe-core for automated accessibility testing across
 * all application pages and components.
 */

import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { SUPPORTED_LOCALES, isValidLanguageCode } from '@/constants';
import { ACCESSIBILITY_TEST } from '../constants/test-constants';

/**
 * Accessibility test suite
 * Tests WCAG compliance and accessibility standards across all pages
 * Ensures the application is usable by people with disabilities
 */
test.describe('Accessibility', () => {
  /**
   * Tests that the application meets WCAG 2.0 and 2.1 accessibility standards.
   *
   * Uses Axe accessibility testing library to automatically detect violations
   * of WCAG 2A and 2AA guidelines. This ensures the application is usable
   * by people with disabilities and meets legal accessibility requirements.
   *
   * @remarks
   * Automated accessibility testing catches approximately 30-40% of accessibility
   * issues. Manual testing and screen reader testing are still necessary for
   * comprehensive accessibility validation.
   */
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  /**
   * Tests that the page has a logical and accessible heading hierarchy.
   *
   * Verifies there is exactly one H1 element per page and that heading levels
   * don't skip (e.g., H1 → H3 without H2). Proper heading structure is essential
   * for screen readers and helps users navigate content effectively.
   *
   * @remarks
   * Heading structure is one of the most important accessibility features.
   * Screen reader users often navigate by headings, making proper hierarchy
   * critical for content comprehension and efficient navigation.
   */
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
    headings.forEach((current, index) => {
      if (index === 0) return; // Skip first heading

      const previous = headings[index - 1];
      if (!current || !previous) return;

      const currentLevel = current.level;
      const previousLevel = previous.level;

      // Level should not increase by more than 1
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
    });
  });

  /**
   * Tests that all interactive elements have accessible text or ARIA labels.
   *
   * Verifies that buttons and links have either visible text content, aria-label,
   * or aria-labelledby attributes. This ensures screen readers can properly
   * announce the purpose of interactive elements to users with visual impairments.
   *
   * @remarks
   * Interactive elements without accessible names are unusable for screen reader
   * users. This is a WCAG 2.1 Level A requirement and failure to implement
   * can result in legal accessibility violations.
   */
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

  /**
   * Tests that the application supports full keyboard navigation functionality.
   *
   * Verifies that users can navigate through all focusable elements using the Tab key,
   * ensuring the application is accessible to users who cannot use a mouse
   * or other pointing devices. This is a critical accessibility requirement.
   *
   * @remarks
   * Keyboard navigation is essential for users with motor disabilities and
   * screen reader users. WCAG 2.1 requires all functionality to be operable
   * through a keyboard interface.
   */
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

  /**
   * Tests that text and background colors meet WCAG 2AA contrast requirements.
   *
   * Uses Axe to check color contrast ratios, ensuring text is readable for users
   * with visual impairments including color blindness and low vision.
   * Sufficient contrast is required for WCAG compliance.
   *
   * @remarks
   * WCAG 2.1 Level AA requires a contrast ratio of at least 4.5:1 for normal text
   * and 3:1 for large text. This affects approximately 8% of men and 0.5% of women
   * who have some form of color vision deficiency.
   */
  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    const contrastResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    const contrastViolations = contrastResults.violations.filter(
      (violation) => violation.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  /**
   * Tests that the HTML element has a proper language attribute for internationalization.
   *
   * Verifies the lang attribute is present and contains a valid language code.
   * This helps screen readers pronounce content correctly and supports
   * browser translation features and search engine optimization.
   *
   * @remarks
   * The lang attribute is required for WCAG 2.1 Level A compliance.
   * It enables screen readers to switch to the appropriate pronunciation rules
   * and helps translation tools work more effectively.
   */
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

  /**
   * Tests for the presence and functionality of skip navigation links.
   *
   * Checks if a skip link exists and is the first focusable element when using Tab.
   * Skip links allow keyboard users to bypass repetitive navigation content
   * and jump directly to main content, improving navigation efficiency.
   *
   * @remarks
   * Skip links are particularly important for screen reader users who would
   * otherwise have to navigate through all navigation elements on every page.
   * This is a WCAG 2.1 Level A requirement for multiple ways to locate content.
   */
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
