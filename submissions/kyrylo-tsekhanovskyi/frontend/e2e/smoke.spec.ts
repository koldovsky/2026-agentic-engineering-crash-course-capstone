import { expect, test } from '@playwright/test';

// Task 1.8: the Api started by the AppHost serves the Angular shell on its own URL (ADR 0005).
test('skeleton: app loads', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('BOMKeeper');
  await expect(page.getByRole('link', { name: 'BOMKeeper' })).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
});
