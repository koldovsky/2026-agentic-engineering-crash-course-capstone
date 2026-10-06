import { expect, test } from "@playwright/test";

test("app is served and fits the viewport width", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
