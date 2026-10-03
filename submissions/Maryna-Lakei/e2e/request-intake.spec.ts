/**
 * Request intake on the public desktop page (Chromium).
 * @trace FR-1
 * @trace FR-2
 * @trace FR-7
 * @trace FR-13
 */
import { expect, test, type Page, type Request } from "@playwright/test";

const RAW_REQUEST_NAME = "Raw business request";
const GENERATE_NAME = "Generate";
const EMPTY_MESSAGE = "Enter a business request.";
const GENERATION_FAILURE_MESSAGE = "Generation failed. You can try Generate again.";

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

test.describe("request intake", () => {
  test("shows an editable raw business request field and Generate without login", async ({
    page,
  }) => {
    // @trace FR-1 @trace FR-2
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    const field = page.getByRole("textbox", { name: RAW_REQUEST_NAME });
    const generate = page.getByRole("button", { name: GENERATE_NAME, exact: true });
    await expect(field).toBeVisible();
    await expect(field).toBeEditable();
    await field.fill("reports");
    await expect(field).toHaveValue("reports");
    await expect(generate).toBeVisible();
    await expect(generate).toBeEnabled();
  });

  test("empty Generate shows the inline message and does not start generation", async ({
    page,
  }) => {
    // @trace FR-7
    const { field, generate } = await openIntake(page);
    await field.fill("");
    const requests = trackGeneration(page);
    await generate.click();
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
    await expect(
      page.getByText(GENERATION_FAILURE_MESSAGE, { exact: true }),
    ).toHaveCount(0);
    await expect(field).toBeVisible();
    await page.waitForTimeout(1000);
    expect(requests).toEqual([]);
    await expect(page.getByRole("heading", { name: "User Story" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Acceptance Criteria" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Clarifying Questions" }),
    ).toHaveCount(0);
  });

  test("whitespace-only Generate shows the inline message and does not start generation", async ({
    page,
  }) => {
    // @trace FR-7
    const { field, generate } = await openIntake(page);
    await field.fill(" \t ");
    const requests = trackGeneration(page);
    await generate.click();
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
    await expect(
      page.getByText(GENERATION_FAILURE_MESSAGE, { exact: true }),
    ).toHaveCount(0);
    await expect(field).toHaveValue(" \t ");
    await page.waitForTimeout(1000);
    expect(requests).toEqual([]);
    await expect(page.getByRole("heading", { name: "User Story" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Acceptance Criteria" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Clarifying Questions" }),
    ).toHaveCount(0);
  });

  test("a single word is not rejected as empty", async ({ page }) => {
    // @trace FR-7
    const { field, generate } = await openIntake(page);
    await field.fill("reports");
    await generate.click();
    await expect(generate).toBeDisabled();
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toHaveCount(0);
  });

  test("disables Generate while a request is in flight and ignores a second run", async ({
    page,
  }) => {
    // @trace FR-13
    const { field, generate } = await openIntake(page);
    await field.fill("Need a weekly sales report for the regional team");
    const requests = trackGeneration(page);
    await generate.click();
    await expect(generate).toBeDisabled();
    await expect.poll(() => requests.length).toBe(1);
    await generate.click({ force: true });
    await page.waitForTimeout(400);
    expect(requests).toHaveLength(1);
    await expect(generate).toBeEnabled({ timeout: 5_000 });
    expect(requests).toHaveLength(1);
    await expect(field).toHaveValue(
      "Need a weekly sales report for the regional team",
    );
    await expect(page.getByRole("heading", { name: "User Story" })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Acceptance Criteria" }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Clarifying Questions" }),
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Copy" })).toHaveCount(0);
  });
});
