import { expect, test, type Page } from "@playwright/test";

const SECTION_IDS = ["navbar", "hero", "features", "how-it-works", "pricing", "faq", "waitlist", "footer"];

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("all eight sections render in order", async ({ page }) => {
  const ids = await page.evaluate((expected) => {
    const found = expected.map((id) => document.getElementById(id));
    const positions = found.map((el) => el?.getBoundingClientRect().top ?? NaN);
    return { present: found.map(Boolean), positions };
  }, SECTION_IDS);
  expect(ids.present).toEqual(SECTION_IDS.map(() => true));
  const sorted = [...ids.positions].sort((a, b) => a - b);
  expect(ids.positions).toEqual(sorted);
});

test("page is Ukrainian and replaces the scaffold", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page).toHaveTitle(/AgentFlow/);
  await expect(page.getByText("To get started")).toHaveCount(0);
});

test("navbar shows the brand and links reach their sections", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Основна навігація" });
  await expect(nav.getByText("AgentFlow")).toBeVisible();
  const targets: Record<string, string> = {
    Можливості: "features",
    "Як це працює": "how-it-works",
    Тарифи: "pricing",
    Питання: "faq",
    "Список очікування": "waitlist",
  };
  for (const [label, id] of Object.entries(targets)) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("signup calls to action point at the waitlist section", async ({ page }) => {
  const hero = page.locator("#hero").getByRole("link", { name: /очікування/ });
  await expect(hero).toHaveAttribute("href", "#waitlist");
  const plans = page.getByTestId("plan");
  const planCount = await plans.count();
  expect(planCount).toBeGreaterThanOrEqual(1);
  const planLinks = await plans.getByRole("link").all();
  expect(planLinks).toHaveLength(planCount);
  for (const link of planLinks) {
    await expect(link).toHaveAttribute("href", "#waitlist");
  }
  await hero.click();
  await expect(page.locator("#waitlist")).toBeInViewport();
});

test("informational sections have the specified content", async ({ page }) => {
  expect(await page.locator("#features li").count()).toBeGreaterThanOrEqual(3);
  const steps = page.locator("#how-it-works ol > li h3");
  await expect(steps).toHaveText(["Специфікація", "Реалізація", "Перевірка"]);
  const faq = await page.locator("#faq details").all();
  expect(faq.length).toBeGreaterThanOrEqual(3);
  for (const item of faq) {
    await expect(item.locator("summary")).not.toHaveText("");
    expect(((await item.locator("p").textContent()) ?? "").trim().length).toBeGreaterThan(0);
  }
  await expect(page.locator("#footer")).toContainText("AgentFlow");
  expect(((await page.locator("#footer p").nth(1).textContent()) ?? "").trim().length).toBeGreaterThan(0);
});

test("pricing has no payment controls", async ({ page }) => {
  const pricing = page.locator("#pricing");
  await expect(pricing).toContainText("приклад");
  await expect(pricing.locator("button, form, input, [type=submit]")).toHaveCount(0);
  await expect(pricing.getByText(/купити|оплат|checkout/i)).toHaveCount(0);
});

test("page has no horizontal overflow", async ({ page }) => {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

type Motion = { pseudo: string | null; property: string; duration: number };

async function toggleAndCollectMotion(page: Page, index: number): Promise<Motion[]> {
  return page.evaluate(async (i) => {
    const details = document.querySelectorAll<HTMLDetailsElement>("#faq details")[i];
    details.querySelector("summary")!.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return document.getAnimations().flatMap((a) => {
      const t = a as CSSTransition;
      const effect = a.effect as KeyframeEffect | null;
      if (!effect || !("transitionProperty" in t)) return [];
      return [{
        pseudo: effect.pseudoElement,
        property: t.transitionProperty,
        duration: Number(effect.getTiming().duration),
      }];
    });
  }, index);
}

test("FAQ marker rotates and the answer area transitions within 250 ms", async ({ page }) => {
  const summary = page.locator("#faq summary").first();
  const closed = await summary.evaluate((el) => getComputedStyle(el, "::before").transform);
  const motion = await toggleAndCollectMotion(page, 0);
  const marker = motion.find((m) => m.pseudo === "::before" && m.property === "transform");
  expect(marker, "marker transform transition").toBeTruthy();
  expect(marker!.duration).toBeGreaterThan(0);
  expect(marker!.duration).toBeLessThanOrEqual(250);
  // Chromium does not expose ::details-content transitions via getAnimations(), so assert the
  // computed transition and that the height was caught mid-way (animating, not jumping).
  const content = await page.locator("#faq details").first().evaluate((el) => {
    const cs = getComputedStyle(el, "::details-content");
    return {
      property: cs.transitionProperty,
      duration: cs.transitionDuration,
      delay: cs.transitionDelay,
    };
  });
  expect(content.property).toContain("block-size");
  const durations = content.duration.split(",").map((d) => parseFloat(d));
  const delays = content.delay.split(",").map((d) => parseFloat(d));
  expect(Math.max(...durations)).toBeGreaterThan(0);
  durations.forEach((d, i) => expect(d + delays[i % delays.length]).toBeLessThanOrEqual(0.25));
  const heights = await page.locator("#faq details").nth(1).evaluate(async (el) => {
    const read = () => parseFloat(getComputedStyle(el, "::details-content").blockSize);
    el.querySelector("summary")!.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const mid = read();
    const answerRendered = el.querySelector("p")!.checkVisibility();
    await new Promise((r) => setTimeout(r, 500));
    return { mid, end: read(), answerRendered };
  });
  expect(heights.answerRendered).toBe(true);
  expect(heights.end).toBeGreaterThan(0);
  expect(heights.mid).toBeLessThan(heights.end);
  await expect(page.locator("#faq details").first()).toHaveAttribute("open", "");
  await expect(page.locator("#faq details").first().locator("p")).toBeVisible();
  await expect
    .poll(() => summary.evaluate((el) => getComputedStyle(el, "::before").transform))
    .not.toBe(closed);
});

test("FAQ closing animates the marker back and the answer height down to zero", async ({ page }) => {
  await page.locator("#faq summary").first().click();
  await expect(page.locator("#faq details").first()).toHaveAttribute("open", "");
  await page.waitForTimeout(400);
  const closing = await page.locator("#faq details").first().evaluate(async (el) => {
    const read = () => parseFloat(getComputedStyle(el, "::details-content").blockSize);
    const full = read();
    el.querySelector("summary")!.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const mid = read();
    const answerStillRendered = el.querySelector("p")!.checkVisibility();
    await new Promise((r) => setTimeout(r, 500));
    return { full, mid, answerStillRendered, end: read(), hidden: !el.querySelector("p")!.checkVisibility() };
  });
  expect(closing.mid).toBeGreaterThan(0);
  expect(closing.mid).toBeLessThan(closing.full);
  expect(closing.answerStillRendered).toBe(true);
  expect(closing.end).toBe(0);
  expect(closing.hidden).toBe(true);
  const motion = await toggleAndCollectMotion(page, 0);
  expect(motion.some((m) => m.pseudo === "::before" && m.property === "transform")).toBe(true);
});

test("FAQ items toggle from the keyboard", async ({ page }) => {
  const first = page.locator("#faq details").first();
  await page.locator("#faq summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("p")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(first).not.toHaveAttribute("open", "");
});

test("reduced motion disables the FAQ animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const motion = await toggleAndCollectMotion(page, 0);
  expect(motion.filter((m) => m.duration > 0)).toEqual([]);
  const durations = await page.locator("#faq details").first().evaluate((el) => [
    getComputedStyle(el, "::details-content").transitionDuration,
    getComputedStyle(el.querySelector("summary")!, "::before").transitionDuration,
  ]);
  for (const d of durations) expect(d.split(",").every((x) => parseFloat(x) === 0)).toBe(true);
  await expect(page.locator("#faq details").first()).toHaveAttribute("open", "");
});

test("nothing outside the FAQ marker and answer area has motion", async ({ page }) => {
  const offenders = await page.evaluate(() => {
    const nonZero = (v: string) => v.split(",").some((x) => parseFloat(x) > 0);
    const found: string[] = [];
    for (const el of document.querySelectorAll("*")) {
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        if (!nonZero(cs.transitionDuration) && !nonZero(cs.animationDuration)) continue;
        const allowed = pseudo === "::before" && el.matches("#faq summary");
        if (!allowed) found.push(`${el.tagName.toLowerCase()}${pseudo ?? ""}`);
      }
      const content = getComputedStyle(el, "::details-content");
      if (el.matches("#faq details")) continue;
      if (nonZero(content.transitionDuration)) found.push(`${el.tagName.toLowerCase()}::details-content`);
    }
    return found;
  });
  expect(offenders).toEqual([]);
});
