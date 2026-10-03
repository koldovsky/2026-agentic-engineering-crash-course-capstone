/**
 * Result review on the public desktop page (Chromium).
 * The server is started with REQUIREMENTS_MODEL_MODE=fake and no live key.
 * These checks cover the browser. Trace annotations for FR-6 and FR-12
 * live in lib/requirements/result-review.test.ts.
 */
import { expect, test, type Page } from "@playwright/test";

const RAW_REQUEST_NAME = "Raw business request";
const GENERATE_NAME = "Generate";
const WEEKLY_REQUEST = "Need a weekly sales report for the regional team";
const MONTHLY_REQUEST = "Need a monthly budget for the finance team";
const WEEKLY_STORY =
  "As a regional manager, I want a weekly sales report, so that I can review team performance.";
const WEEKLY_CRITERIA = [
  "The report lists sales by region.",
  "The report covers the previous week.",
];
const WEEKLY_QUESTIONS = [
  "Which regions are included?",
  "Who receives the report?",
  "What counts as a sale?",
];
const MONTHLY_STORY =
  "As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.";
const MONTHLY_CRITERIA = [
  "The summary lists planned spend by category.",
  "The summary lists actual spend for the month.",
];
const MONTHLY_QUESTIONS = [
  "Which month does the budget cover?",
  "Which categories are in scope?",
  "Who approves a variance?",
];

const SECTION_HEADINGS = [
  "User Story",
  "Acceptance Criteria",
  "Clarifying Questions",
] as const;

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

async function expectEachHeadingOnce(page: Page) {
  for (const name of SECTION_HEADINGS) {
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(1);
  }
}

test.describe("result review", () => {
  test("shows the weekly fixture under three headings and selects the story natively", async ({
    page,
  }) => {
    const openaiRequests = trackOpenAi(page);
    const { field, generate } = await openIntake(page);
    await field.fill(WEEKLY_REQUEST);
    await generate.click();

    const story = page.getByTestId("user-story");
    await expect(story).toContainText(WEEKLY_STORY);
    await expect(page.getByTestId("acceptance-criteria").getByRole("listitem")).toHaveText(
      WEEKLY_CRITERIA,
    );

    const questions = page.getByTestId("clarifying-questions").getByRole("listitem");
    const count = await questions.count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(5);
    await expect(questions).toHaveText(WEEKLY_QUESTIONS);

    await expectEachHeadingOnce(page);

    await story.click({ clickCount: 3 });
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    expect(selected).toContain(WEEKLY_STORY);

    const userSelect = await story.evaluate(
      (element) => getComputedStyle(element).userSelect,
    );
    expect(userSelect).not.toBe("none");
    expect(openaiRequests).toEqual([]);
  });

  test("replaces the weekly result with the monthly budget fixture", async ({ page }) => {
    const openaiRequests = trackOpenAi(page);
    const { field, generate } = await openIntake(page);
    await field.fill(WEEKLY_REQUEST);
    await generate.click();
    await expect(page.getByTestId("user-story")).toContainText(WEEKLY_STORY);
    await expect(generate).toBeEnabled();

    await field.fill(MONTHLY_REQUEST);
    await generate.click();

    await expect(page.getByText(WEEKLY_STORY, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("user-story")).toHaveText(MONTHLY_STORY);
    await expect(page.getByTestId("acceptance-criteria").getByRole("listitem")).toHaveText(
      MONTHLY_CRITERIA,
    );
    await expect(page.getByTestId("clarifying-questions").getByRole("listitem")).toHaveText(
      MONTHLY_QUESTIONS,
    );
    expect(openaiRequests).toEqual([]);
  });

  test("has no Copy control, contenteditable editor, or Regenerate button", async ({
    page,
  }) => {
    const openaiRequests = trackOpenAi(page);
    const { field, generate } = await openIntake(page);
    await field.fill(WEEKLY_REQUEST);
    await generate.click();
    await expect(page.getByTestId("user-story")).toContainText(WEEKLY_STORY);

    await expect(page.getByRole("button", { name: "Copy" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Regenerate", exact: true })).toHaveCount(0);
    await expect(page.locator("[contenteditable]")).toHaveCount(0);
    await expect(generate).toBeVisible();
    expect(openaiRequests).toEqual([]);
  });
});
