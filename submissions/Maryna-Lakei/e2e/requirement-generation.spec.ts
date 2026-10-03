/**
 * Requirement generation on the public desktop page (Chromium).
 * The server is started with REQUIREMENTS_MODEL_MODE=fake and no live key.
 * These checks cover the browser. Trace annotations for FR-3 through FR-11
 * live in lib/requirements/parse-generation.test.ts.
 */
import { expect, test, type Page, type Request } from "@playwright/test";

const RAW_REQUEST_NAME = "Raw business request";
const GENERATE_NAME = "Generate";
const EMPTY_MESSAGE = "Enter a business request.";
const GENERATION_FAILURE_MESSAGE = "Generation failed. You can try Generate again.";
const RAW_REQUEST = "Need a weekly sales report for the regional team";
const STORY =
  "As a regional manager, I want a weekly sales report, so that I can review team performance.";
const CRITERIA = [
  "The report lists sales by region.",
  "The report covers the previous week.",
];

/**
 * A generation attempt is a request whose URL contains "generate", or a POST
 * whose body is a server action for generation (Next-Action header, or a body
 * that names generate). Static /_next assets are not generation.
 */
function isGenerationRequest(request: Request): boolean {
  const url = request.url().toLowerCase();
  if (url.includes("/_next/")) {
    return false;
  }
  if (url.includes("generate")) {
    return true;
  }
  if (request.method() !== "POST") {
    return false;
  }
  if (request.headers()["next-action"]) {
    return true;
  }
  const body = request.postData() ?? "";
  return body.toLowerCase().includes("generate");
}

function trackGeneration(page: Page): Request[] {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (isGenerationRequest(request)) {
      requests.push(request);
    }
  });
  return requests;
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

test.describe("requirement generation", () => {
  test("shows the fixture story, criteria, and 3 to 5 questions without calling OpenAI", async ({
    page,
  }) => {
    const openaiRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("api.openai.com")) {
        openaiRequests.push(request.url());
      }
    });

    const { field, generate } = await openIntake(page);
    await field.fill(RAW_REQUEST);
    await generate.click();
    await expect(generate).toBeDisabled();

    const story = page.getByTestId("user-story");
    await expect(story).toContainText(STORY);
    await expect(page.getByTestId("acceptance-criteria").getByRole("listitem")).toHaveText(
      CRITERIA,
    );

    const questions = page.getByTestId("clarifying-questions").getByRole("listitem");
    const count = await questions.count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(5);
    const questionText = await questions.allTextContents();
    for (const question of questionText) {
      expect(question.trim().length).toBeGreaterThan(0);
      expect(question).toContain("?");
    }

    await expect(page.getByRole("heading", { name: "User Story" })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Acceptance Criteria" }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Clarifying Questions" }),
    ).toHaveCount(1);
    expect(openaiRequests).toEqual([]);
  });

  test("empty Generate shows the inline message, stays enabled, and does not generate", async ({
    page,
  }) => {
    const { field, generate } = await openIntake(page);
    await field.fill("");
    const requests = trackGeneration(page);
    await generate.click();
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
    await expect(
      page.getByText(GENERATION_FAILURE_MESSAGE, { exact: true }),
    ).toHaveCount(0);
    await expect(generate).toBeEnabled();
    await page.waitForTimeout(1000);
    expect(requests).toEqual([]);
    await expect(page.getByTestId("user-story")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "User Story" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Acceptance Criteria" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Clarifying Questions" }),
    ).toHaveCount(0);
  });

  test("whitespace-only Generate shows the inline message, stays enabled, and does not generate", async ({
    page,
  }) => {
    const { field, generate } = await openIntake(page);
    await field.fill("   ");
    const requests = trackGeneration(page);
    await generate.click();
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
    await expect(
      page.getByText(GENERATION_FAILURE_MESSAGE, { exact: true }),
    ).toHaveCount(0);
    await expect(generate).toBeEnabled();
    await expect(field).toHaveValue("   ");
    await page.waitForTimeout(1000);
    expect(requests).toEqual([]);
    await expect(page.getByTestId("user-story")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "User Story" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Acceptance Criteria" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Clarifying Questions" }),
    ).toHaveCount(0);
  });
});
