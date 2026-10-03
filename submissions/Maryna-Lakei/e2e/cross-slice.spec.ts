/**
 * One Chromium pass across intake, generation, review, and failure.
 * The Playwright server uses the factory fake model. No live API key.
 */
import { expect, test } from "@playwright/test";

const RAW_REQUEST_NAME = "Raw business request";
const GENERATE_NAME = "Generate";
const VALIDATION_MESSAGE = "Enter a business request.";
const FAILURE_MESSAGE = "Generation failed. You can try Generate again.";
const WEEKLY_REQUEST = "Need a weekly sales report for the regional team";
const WEEKLY_STORY =
  "As a regional manager, I want a weekly sales report, so that I can review team performance.";
const PROVIDER_REQUEST = "Need a weekly sales report [[provider-error]]";
const MONTHLY_REQUEST = "Need a monthly budget for the finance team";
const MONTHLY_STORY =
  "As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.";

test("cross-slice flow: validate, succeed, fail without losing the result, then replace it", async ({
  page,
}) => {
  const openaiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.openai.com")) {
      openaiRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.getByText(/sign in|log in|sign up/i)).toHaveCount(0);
  const field = page.getByRole("textbox", { name: RAW_REQUEST_NAME });
  const generate = page.getByRole("button", { name: GENERATE_NAME, exact: true });
  await expect(field).toBeEditable();
  await expect(generate).toBeEnabled();

  await field.fill("");
  await generate.click();
  await expect(page.getByText(VALIDATION_MESSAGE, { exact: true })).toBeVisible();
  await expect(page.getByText(FAILURE_MESSAGE, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "User Story" })).toHaveCount(0);
  await expect(generate).toBeEnabled();

  await field.fill(WEEKLY_REQUEST);
  await generate.click();
  await expect(page.getByRole("heading", { name: "User Story" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acceptance Criteria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clarifying Questions" })).toBeVisible();
  await expect(page.getByTestId("user-story")).toContainText(WEEKLY_STORY);
  await expect(page.getByRole("alert", { name: FAILURE_MESSAGE, exact: true })).toHaveCount(0);
  await expect(generate).toBeEnabled();

  await field.fill(PROVIDER_REQUEST);
  await generate.click();
  await expect(page.getByRole("alert", { name: FAILURE_MESSAGE, exact: true })).toBeVisible();
  await expect(field).toHaveValue(PROVIDER_REQUEST);
  await expect(page.getByTestId("user-story")).toContainText(WEEKLY_STORY);
  await expect(generate).toBeEnabled();
  await expect(page.locator("body")).not.toContainText("Internal Server Error");

  await field.fill(MONTHLY_REQUEST);
  await generate.click();
  await expect(page.getByTestId("user-story")).toContainText(MONTHLY_STORY);
  await expect(page.getByTestId("user-story")).not.toContainText(WEEKLY_STORY);
  await expect(page.getByRole("alert", { name: FAILURE_MESSAGE, exact: true })).toHaveCount(0);
  await expect(generate).toBeEnabled();
  expect(openaiRequests).toEqual([]);
});
