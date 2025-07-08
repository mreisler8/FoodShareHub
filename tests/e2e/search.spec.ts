
import { test, expect } from '@playwright/test';

test('Tracker Taylor can search & create post', async ({ page }) => {
  // Simulate login by storing token in localStorage
  await page.goto('/');
  await page.evaluate(() => window.localStorage.setItem('token', '<YOUR_TEST_TOKEN>'));

  // 1. Click Search button and type "pizza"
  await page.click('.hero-search-btn');
  await page.fill('.unified-search-input', 'pizza');

  // 2. Assert at least one result appears
  await expect(page.locator('.search-results li')).toHaveCountGreaterThan(0);

  // 3. Select "Best Pizza Place"
  await page.locator('.search-results li', { hasText: 'Best Pizza Place' }).click();

  // 4. Click "Share Experience" to open Post modal
  await page.click('.hero-cta');

  // 5. Fill in the post form
  await page.fill('textarea[name="liked"]', 'Great crust');
  await page.click('.star-rating >> text=4');
  await page.click('button:has-text("Save")');

  // 6. Verify the new post appears in the feed
  await expect(page.locator('.feed-item').first()).toContainText('Great crust');
});
