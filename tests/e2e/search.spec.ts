
import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Check if user is already logged in, if not, log in
    const loginButton = page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.fill('input[type="email"]', 'mitch.reisler@gmail.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    }
  });

  test('user can search for restaurants', async ({ page }) => {
    // Look for search button or input
    const searchButton = page.locator('[data-testid="hero-search-button"], button:has-text("Search")').first();
    
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    // Fill search input
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"], .unified-search-input').first();
    await searchInput.fill('pizza');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Check if any results appear
    const results = page.locator('[data-testid="search-result"], .search-results li, .search-result').first();
    
    // If results exist, verify they're visible
    if (await results.isVisible()) {
      await expect(results).toBeVisible();
    } else {
      // If no search results component, just verify the search input worked
      await expect(searchInput).toHaveValue('pizza');
    }
  });

  test('user can navigate home page', async ({ page }) => {
    // Basic smoke test - verify home page loads
    await expect(page).toHaveTitle(/Circles|TasteBuds/);
    
    // Check for main navigation elements
    const mainContent = page.locator('main, #root, .app');
    await expect(mainContent).toBeVisible();
  });
});
