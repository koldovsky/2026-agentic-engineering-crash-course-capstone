/**
 * Generation failure on the public desktop page (Chromium).
 * The Playwright server uses fake mode. These checks cover the browser.
 * Trace annotations for FR-8, NFR-3, and NFR-4 live in
 * lib/requirements/generation-failure.test.ts.
 */
import { expect, test, type Page } from "@playwright/test";

const RAW_REQUEST_NAME = "Raw business request";
const GENERATE_NAME = "Generate";
const FAILURE_MESSAGE = "Generation failed. You can try Generate again.";
const PROVIDER_REQUEST = "Need a weekly sales report [[provider-error]]";
const TIMEOUT_REQUEST = "Need a weekly sales report [[timeout]]";
const WEEKLY_REQUEST = "Need a weekly sales report for the regional team";
const WEEKLY_STORY =
  "As a regional manager, I want a weekly sales report, so that I can review team performance.";

function trackOpenAi(page: Page): string[] {
  const openaiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.openai.com")) {
      openaiRequests.push(request.url());
    }
  });
  return openaiRequests;
}

async function openIntake(page: Page) {
  await page.goto("/");
  const field = page.getByRole("textbox", { name: RAW_REQUEST_NAME });
  const generate = page.getByRole("button", { name: GENERATE_NAME, exact: true });
  await expect(field).toBeVisible();
  await expect(field).toBeEditable();
  await expect(generate).toBeVisible();
  await expect(generate).toBeEnabled();
  return { field, generate };
}

function failureAlert(page: Page) {
  return page.getByRole("alert", { name: FAILURE_MESSAGE, exact: true });
}

test.describe("generation failure", () => {
  test("provider-error shows the failure sentence, keeps the field, and does not call OpenAI", async ({
    page,
  }) => {
    const openaiRequests = trackOpenAi(page);
    const { field, generate } = await openIntake(page);
    await field.fill(PROVIDER_REQUEST);
    await generate.click();

    await expect(field).toHaveValue(PROVIDER_REQUEST);
    await expect(failureAlert(page)).toBeVisible();
    await expect(generate).toBeEnabled();
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    expect(openaiRequests).toEqual([]);
  });

  test("timeout shows the failure sentence within 10 seconds and does not call OpenAI", async ({
    page,
  }) => {
    // A 30s product hang must fail. The alert wait is capped at 10s, and the
    // test itself cannot outlast that wait.
    test.setTimeout(10_000);
    const openaiRequests = trackOpenAi(page);
    const { field, generate } = await openIntake(page);
    await field.fill(TIMEOUT_REQUEST);
    await generate.click();

    await expect(field).toHaveValue(TIMEOUT_REQUEST);
    await expect(failureAlert(page)).toBeVisible({ timeout: 10_000 });
    await expect(generate).toBeEnabled();
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    expect(openaiRequests).toEqual([]);
  });

  test("keeps the weekly story visible after a later provider-error", async ({ page }) => {
    const openaiRequests = trackOpenAi(page);
    const { field, generate } = await openIntake(page);

    await field.fill(WEEKLY_REQUEST);
    await generate.click();
    await expect(page.getByTestId("user-story")).toContainText(WEEKLY_STORY);
    await expect(failureAlert(page)).toHaveCount(0);

    await field.fill(PROVIDER_REQUEST);
    await generate.click();

    await expect(page.getByTestId("user-story")).toContainText(WEEKLY_STORY);
    await expect(field).toHaveValue(PROVIDER_REQUEST);
    await expect(failureAlert(page)).toBeVisible();
    await expect(generate).toBeEnabled();
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    expect(openaiRequests).toEqual([]);
  });
});
