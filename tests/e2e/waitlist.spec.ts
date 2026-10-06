import { expect, test, type Page } from "@playwright/test";

const REQUIRED = "Введіть електронну пошту.";
const INVALID = "Введіть коректну адресу електронної пошти.";
const SUCCESS = "Дякуємо! Це демо: вас не додано до списку, лист не надсилається.";

function form(page: Page) {
  return page.locator("#waitlist form");
}
function emailInput(page: Page) {
  return page.getByLabel("Електронна пошта");
}
async function submit(page: Page, value: string) {
  await emailInput(page).fill(value);
  await form(page).getByRole("button").click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("exactly one form exists, inside the waitlist section, with a demo note", async ({ page }) => {
  await expect(page.locator("form")).toHaveCount(1);
  await expect(form(page)).toHaveCount(1);
  await expect(page.locator("#waitlist")).toContainText("демо");
  await expect(page.locator("#waitlist")).toContainText("Це демо");
});

test("hero and plan calls to action scroll to the form", async ({ page }) => {
  await page.locator("#hero").getByRole("link", { name: /очікування/ }).click();
  await expect(form(page)).toBeInViewport();
  await page.goto("/#pricing");
  await page.getByTestId("plan").first().getByRole("link").click();
  await expect(form(page)).toBeInViewport();
  await expect(page.locator("#pricing").locator("form, input")).toHaveCount(0);
});

test("empty submission shows the required error and no success", async ({ page }) => {
  await submit(page, "");
  await expect(page.locator("#waitlist").getByRole("alert")).toHaveText(REQUIRED);
  await expect(page.getByText(SUCCESS)).toHaveCount(0);
});

test("whitespace-only submission shows the required error", async ({ page }) => {
  await submit(page, "     ");
  await expect(page.locator("#waitlist").getByRole("alert")).toHaveText(REQUIRED);
  await expect(page.getByText(SUCCESS)).toHaveCount(0);
});

test("invalid email shows the format error and no success", async ({ page }) => {
  await submit(page, "not-an-email");
  await expect(page.locator("#waitlist").getByRole("alert")).toHaveText(INVALID);
  await expect(page.getByText(SUCCESS)).toHaveCount(0);
});

test("valid email (padded) shows the demo success and no error", async ({ page }) => {
  await submit(page, "  user@example.com  ");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
  await expect(page.locator("#waitlist").getByRole("alert")).toBeEmpty();
});

test("correcting an invalid email then resubmitting succeeds", async ({ page }) => {
  await submit(page, "user@");
  await expect(page.locator("#waitlist").getByRole("alert")).toHaveText(INVALID);
  await submit(page, "user@example.com");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
  await expect(page.locator("#waitlist").getByRole("alert")).toBeEmpty();
});

test("an empty submission after success shows the error and hides success", async ({ page }) => {
  await submit(page, "user@example.com");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
  await submit(page, "");
  await expect(page.locator("#waitlist").getByRole("alert")).toHaveText(REQUIRED);
  await expect(page.getByText(SUCCESS)).toHaveCount(0);
});

test("form is keyboard operable and the input is labeled and linked to its error", async ({ page }) => {
  const input = emailInput(page);
  await expect(page.locator("#waitlist label")).toBeVisible();
  await page.locator("#waitlist-title").click();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await page.keyboard.type("user@");
  await page.keyboard.press("Enter");
  await expect(page.locator("#waitlist").getByRole("alert")).toHaveText(INVALID);
  await expect(input).toHaveAttribute("aria-invalid", "true");
  const describedBy = await input.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy!.split(" ")[0]}`)).toHaveText(INVALID);
  await input.fill("user@example.com");
  await page.keyboard.press("Enter");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
});

test("submitting sends no network request", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await submit(page, "user@example.com");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
  expect(requests.filter((u) => !u.startsWith("data:"))).toEqual([]);
  expect(requests.some((u) => u.includes("example.com"))).toBe(false);
});

test("nothing persists across a reload", async ({ page }) => {
  await submit(page, "user@example.com");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
  await page.reload();
  await expect(emailInput(page)).toHaveValue("");
  await expect(page.getByText(SUCCESS)).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookie: document.cookie,
  }));
  expect(stored).toEqual({ local: 0, session: 0, cookie: "" });
});

test("the error disappears as soon as the edited value becomes valid", async ({ page }) => {
  const alert = page.locator("#waitlist").getByRole("alert");
  await submit(page, "user@");
  await expect(alert).toHaveText(INVALID);
  await emailInput(page).fill("user@example.com");
  await expect(alert).toBeEmpty();
  await expect(emailInput(page)).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(SUCCESS)).toHaveCount(0);
});

test("the shown error follows the current value while it is invalid", async ({ page }) => {
  const alert = page.locator("#waitlist").getByRole("alert");
  await submit(page, "");
  await expect(alert).toHaveText(REQUIRED);
  await emailInput(page).fill("a");
  await expect(alert).toHaveText(INVALID);
});

test("typing before the first submit shows no error", async ({ page }) => {
  await emailInput(page).fill("user@");
  await expect(page.locator("#waitlist").getByRole("alert")).toBeEmpty();
});

test("a cleared error does not return while typing", async ({ page }) => {
  const alert = page.locator("#waitlist").getByRole("alert");
  await submit(page, "user@");
  await emailInput(page).fill("user@example.com");
  await expect(alert).toBeEmpty();
  await emailInput(page).fill("user@");
  await expect(alert).toBeEmpty();
});

test("editing after success keeps the success state", async ({ page }) => {
  await submit(page, "user@example.com");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
  await emailInput(page).fill("user@");
  await expect(page.locator("#waitlist").getByRole("status")).toHaveText(SUCCESS);
  await expect(page.locator("#waitlist").getByRole("alert")).toBeEmpty();
});
