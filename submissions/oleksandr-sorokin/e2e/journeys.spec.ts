import { test, expect } from "@playwright/test";

/**
 * J1 — Filter → open details → Back to list preserves filter state
 *
 * Covers: verification.md J1 and the `ref` round-trip spec from
 * openspec/changes/04-etf-details/specs/etf-list/spec.md
 */
test("J1: filter by asset class → open details → back link returns to filtered list", async ({
  page,
}) => {
  await page.goto("/etfs?assetClass=equity");

  // Wait for at least one result row
  const firstNameLink = page.locator("table tbody tr td a").first();
  await expect(firstNameLink).toBeVisible();

  // Navigate into the details page via the name link
  await firstNameLink.click();
  await expect(page).toHaveURL(/\/etfs\/[A-Z]+/);

  // The "Back to list" link should point back to the filtered list
  const backLink = page.getByRole("link", { name: /back to list/i });
  await expect(backLink).toBeVisible();
  const backHref = await backLink.getAttribute("href");
  expect(backHref).toContain("assetClass=equity");

  // Click it and confirm we land on the filtered list
  await backLink.click();
  await expect(page).toHaveURL(/assetClass=equity/);
});

/**
 * J2 — URL with filters opened in a new page shows the same results
 *
 * Covers: verification.md J2 — every view is a shareable link
 */
test("J2: sharing a filtered URL produces the same results in a fresh page", async ({
  page,
  context,
}) => {
  const filteredUrl = "/etfs?assetClass=equity&sortBy=ter&sortDir=asc";

  await page.goto(filteredUrl);
  await page.waitForSelector("table tbody tr");

  // Collect visible ETF names in the first page
  const names = await page.locator("table tbody tr td").nth(1).allTextContents();

  // Open the same URL in a second tab
  const page2 = await context.newPage();
  await page2.goto(filteredUrl);
  await page2.waitForSelector("table tbody tr");

  const names2 = await page2.locator("table tbody tr td").nth(1).allTextContents();

  expect(names2).toEqual(names);
  await page2.close();
});

/**
 * J3 — Unknown ticker shows the styled 404 page, not a crash
 *
 * Covers: verification.md J3 and
 * openspec/changes/04-etf-details/specs/etf-details/spec.md
 * "Unknown ticker shows 404 page"
 */
test("J3: navigating to an unknown ticker shows the ETF not-found page", async ({ page }) => {
  await page.goto("/etfs/UNKNOWN");

  await expect(page.getByText(/ETF not found/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /back to list/i })).toBeVisible();
});
