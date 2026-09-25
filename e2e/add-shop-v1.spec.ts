import { expect, test, type Locator, type Page } from "@playwright/test";

// OpenSpec change add-shop-v1 — one describe per capability, one test per [e2e] scenario.
// Notation (design.md): FRESH, S({...}), V2(S(...)). Viewport 1280 × 720, Ukrainian by default.

const SAVE_KEY = "dopamine-clicker:save";
const LANG_KEY = "dopamine-clicker:lang";

type Position = { x: number; y: number };
type DecorEntry = { id: string; position: Position | null };
type SaveState = {
  balance: number;
  totalClicks: number;
  ownedSkins: string[];
  enabledSkins: string[];
  material: string;
  decor: DecorEntry[];
  upgrades: string[];
  helpers: { monkey: number };
};
type Box = { x: number; y: number; width: number; height: number };

/** FRESH with the listed top-level fields replaced (design.md notation). */
function S(overrides: Partial<SaveState> = {}): SaveState {
  return {
    balance: 0,
    totalClicks: 0,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    upgrades: [],
    helpers: { monkey: 0 },
    ...overrides,
  };
}

/**
 * Seeds localStorage before the first navigation. Same guard as e2e/add-foundation.spec.ts:
 * `addInitScript` re-runs on every reload, so a `sessionStorage` flag makes seeding one-shot.
 */
/**
 * The same state as the v3 save schema writes it (add-upgrades-v2 design D20): `helpers` gains
 * `robot` / `factory`, `levels` is new. Used only for expected save envelopes; seeding stays v2.
 */
function S3(overrides: Partial<SaveState> = {}) {
  const base = S(overrides);
  return {
    ...base,
    helpers: { monkey: base.helpers.monkey, robot: 0, factory: 0 },
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
  };
}

/**
 * The same state as the v4 save schema writes it (add-content-v3 design D11/D20): `videos` is new
 * (empty unless overridden), on top of the v3 shape. Used only for expected save envelopes; seeding
 * stays v2.
 */
function S4(overrides: Partial<SaveState> & { videos?: DecorEntry[] } = {}) {
  const { videos, ...rest } = overrides;
  return { ...S3(rest), videos: videos ?? [] };
}

async function seedStorage(page: Page, values: Record<string, string>) {
  await page.addInitScript((entries) => {
    if (window.sessionStorage.getItem("__seeded")) {
      return;
    }
    for (const [key, value] of entries) {
      window.localStorage.setItem(key, value);
    }
    window.sessionStorage.setItem("__seeded", "1");
  }, Object.entries(values));
}

/** Seeds `V2(state)` (plus optional extra keys) under the save key. */
async function seedV2(page: Page, state: SaveState, extra: Record<string, string> = {}) {
  await seedStorage(page, {
    [SAVE_KEY]: JSON.stringify({ version: 2, state }),
    ...extra,
  });
}

async function readSave(page: Page): Promise<unknown> {
  const raw = await page.evaluate((k) => window.localStorage.getItem(k), SAVE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

async function readSavedState(page: Page): Promise<SaveState | null> {
  const envelope = (await readSave(page)) as { state?: SaveState } | null;
  return envelope?.state ?? null;
}

async function normalizedText(locator: Locator): Promise<string> {
  const text = await locator.textContent();
  return (text ?? "").replace(/\s+/g, " ").trim();
}

async function balanceValue(page: Page): Promise<number> {
  const text = await normalizedText(page.getByTestId("balance"));
  return Number(text.replace(/\D/g, ""));
}

/** Strict overlap of two boxes (touching edges is not an overlap) — same rule as `rectsOverlap`. */
function strictlyOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Computed `animation-name` of the element and every descendant, root first. */
async function animationNames(locator: Locator): Promise<string[]> {
  return locator.evaluate((root) =>
    [root, ...Array.from(root.querySelectorAll("*"))].map(
      (el) => getComputedStyle(el).animationName,
    ),
  );
}

async function animationName(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).animationName);
}

async function boxOf(locator: Locator): Promise<Box> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no bounding box");
  return box;
}

async function expectNoOverlapWith(page: Page, box: Box, testIds: string[]) {
  for (const id of testIds) {
    const other = await boxOf(page.getByTestId(id));
    expect(strictlyOverlap(box, other), `overlaps ${id}`).toBe(false);
  }
}

async function clickMain(page: Page, times: number) {
  const mainButton = page.getByTestId("main-button");
  for (let i = 0; i < times; i++) {
    await mainButton.click();
  }
}

async function waitForLoaded(page: Page) {
  await expect(page.getByTestId("main-button")).toBeEnabled();
}

/**
 * Pauses the fake clock (design D20). `pauseAt` needs a time not in the past; the page's own
 * `Date.now()` plus a margin is used. The jump fires each pending timer at most once.
 */
async function pauseClock(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
}

const UI_TEST_IDS = ["main-button", "balance", "shop", "theme-toggle", "lang-toggle", "reset"];

const ALL_FX = S({
  balance: 0,
  totalClicks: 800,
  ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap"],
  enabledSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap"],
  decor: [
    { id: "sleeping-cat", position: { x: 0.3, y: 0.05 } },
    { id: "lava-lamp", position: { x: 0.8, y: 0.3 } },
    { id: "hydraulic-press", position: { x: 0.7, y: 0.7 } },
  ],
  helpers: { monkey: 1 },
});

const DECOR_IDS = ["decor-sleeping-cat", "decor-lava-lamp", "decor-hydraulic-press"];

test.use({ viewport: { width: 1280, height: 720 } });

test.describe("shop", () => {
  test("Shop appears on the 10th click", async ({ page }) => {
    await page.goto("/");
    await clickMain(page, 9);
    await expect(page.getByTestId("balance")).toHaveText("9");
    await expect(page.getByTestId("shop")).toBeHidden();

    await clickMain(page, 1);
    const shop = page.getByTestId("shop");
    await expect(shop).toBeVisible();
    await expect(shop.getByRole("heading", { name: "Магазин" })).toBeVisible();
  });

  test("Main button does not move when the shop appears", async ({ page }) => {
    await page.goto("/");
    await clickMain(page, 9);
    await expect(page.getByTestId("balance")).toHaveText("9");
    const mainButton = page.getByTestId("main-button");
    const before = await boxOf(mainButton);

    await mainButton.click();
    await expect(page.getByTestId("shop")).toBeVisible();
    const after = await boxOf(mainButton);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test("Seeded save shows the shop immediately", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 10 }));
    await page.goto("/");
    await expect(page.getByTestId("shop")).toBeVisible();
  });

  test("Items appear while clicking", async ({ page }) => {
    await page.goto("/");
    await clickMain(page, 10);
    await expect(page.getByTestId("shop-item-soft-shadow")).toBeVisible();
    await expect(page.getByTestId("shop-item-squish")).toHaveCount(0);
    await expect(page.getByTestId("shop-category-skins")).toBeVisible();
    await expect(page.getByTestId("shop-category-decor")).toHaveCount(0);
    await expect(page.getByTestId("shop-category-upgrades")).toHaveCount(0);

    await clickMain(page, 5);
    await expect(page.getByTestId("balance")).toHaveText("15");
    await expect(page.getByTestId("shop-item-squish")).toBeVisible();
    await expect(page.getByTestId("shop-item-floating-number")).toHaveCount(0);
  });

  test("All items at 750 clicks", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 750 }));
    await page.goto("/");
    await expect(page.getByTestId("shop")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('[data-testid^="shop-item-"]')
          .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid"))),
      )
      .toEqual([
        "shop-item-soft-shadow",
        "shop-item-squish",
        "shop-item-floating-number",
        "shop-item-jumping-cap",
        "shop-item-gold",
        "shop-item-sleeping-cat",
        "shop-item-lava-lamp",
        "shop-item-hydraulic-press",
        "shop-item-double-click",
        "shop-item-triple-click",
        "shop-item-crit",
        "shop-item-combo",
        "shop-item-golden-button",
        "shop-item-monkey",
        "shop-item-robot",
      ]);
  });

  test("One click short of the press", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 749 }));
    await page.goto("/");
    await expect(page.getByTestId("shop")).toBeVisible();
    await expect(page.locator('[data-testid^="shop-item-"]')).toHaveCount(14);
    await expect(page.getByTestId("shop-item-hydraulic-press")).toHaveCount(0);
  });

  test("Unaffordable item is disabled with its price", async ({ page }) => {
    await seedV2(page, S({ balance: 10, totalClicks: 10 }));
    await page.goto("/");
    const buy = page.getByTestId("shop-buy-soft-shadow");
    await expect(buy).toBeDisabled();
    await expect(buy).toHaveText("Купити за 15");

    await page.getByTestId("lang-toggle").click();
    await expect(buy).toHaveText("Buy for 15");
  });

  test("Buying a skin through the UI", async ({ page }) => {
    await page.goto("/");
    await clickMain(page, 14);
    const buy = page.getByTestId("shop-buy-soft-shadow");
    await expect(page.getByTestId("balance")).toHaveText("14");
    await expect(buy).toBeDisabled();

    await clickMain(page, 1);
    await expect(buy).toBeEnabled();

    await buy.click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(buy).toHaveCount(0);
    const toggle = page.getByTestId("skin-toggle-soft-shadow");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => readSave(page))
      .toEqual({
        version: 4,
        state: S4({
          balance: 0,
          totalClicks: 15,
          ownedSkins: ["soft-shadow"],
          enabledSkins: ["soft-shadow"],
        }),
      });
  });

  test("Prices use locale formatting", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 750 }));
    await page.goto("/");
    const buy = page.getByTestId("shop-buy-hydraulic-press");
    await expect(buy).toBeVisible();
    await expect.poll(() => normalizedText(buy)).toBe("Купити за 1 500");

    await page.getByTestId("lang-toggle").click();
    await expect(buy).toHaveText("Buy for 1,500");
  });

  test("Requirement is shown", async ({ page }) => {
    await seedV2(page, S({ balance: 500, totalClicks: 250 }));
    await page.goto("/");
    await expect(page.getByTestId("shop-buy-triple-click")).toBeDisabled();
    await expect(page.getByTestId("shop-requires-triple-click")).toHaveText(
      "Потрібно: Подвійний клік",
    );
  });

  test("Owned upgrade is labelled", async ({ page }) => {
    await seedV2(page, S({ balance: 100, totalClicks: 60 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-double-click").click();
    await expect(page.getByTestId("shop-buy-double-click")).toHaveCount(0);
    await expect(page.getByTestId("shop-owned-double-click")).toHaveText("Куплено");
  });

  test("Monkey keeps a buy button with the next price", async ({ page }) => {
    await seedV2(page, S({ balance: 200, totalClicks: 30 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-monkey").click();
    await expect(page.getByTestId("balance")).toHaveText("150");
    const buy = page.getByTestId("shop-buy-monkey");
    await expect(buy).toHaveText("Купити за 58");
    await expect(buy).toBeEnabled();
    await expect(page.getByTestId("shop-count-monkey")).toHaveText("Маєте: 1");
  });

  test("Item name and description are localized", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 10 }));
    await page.goto("/");
    const item = page.getByTestId("shop-item-soft-shadow");
    await expect(item).toContainText("М’яка тінь");
    await expect(item).toContainText("Тінь, що глибшає під курсором і при натисканні");

    await page.getByTestId("lang-toggle").click();
    await expect(item).toContainText("Soft shadow");
    await expect(item).toContainText("A shadow that deepens on hover and press");
  });

  test("Shop box geometry", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 750 }));
    await page.goto("/");
    const shop = page.getByTestId("shop");
    await expect(page.getByTestId("shop-item-monkey")).toBeAttached();
    const box = await boxOf(shop);
    expect(box.x).toBeLessThanOrEqual(24);
    expect(box.y).toBeLessThanOrEqual(24);
    expect(Math.abs(box.width - 288)).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(432 + 1);

    const scroll = await shop.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(scroll.scrollHeight).toBeGreaterThanOrEqual(scroll.clientHeight);
    expect(["auto", "scroll"]).toContain(scroll.overflowY);

    await expectNoOverlapWith(page, box, ["main-button", "balance", "theme-toggle", "lang-toggle"]);
  });
});

test.describe("button-skins", () => {
  test("Toggle a skin off and persist", async ({ page }) => {
    await seedV2(
      page,
      S({
        balance: 0,
        totalClicks: 20,
        ownedSkins: ["soft-shadow", "squish"],
        enabledSkins: ["soft-shadow", "squish"],
      }),
    );
    await page.goto("/");
    const toggle = page.getByTestId("skin-toggle-soft-shadow");
    const mainButton = page.getByTestId("main-button");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("Увімкнено");
    await expect(mainButton).toHaveAttribute("data-skins", "soft-shadow squish");
    await expect(mainButton).toHaveAttribute("data-material", "classic");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveText("Вимкнено");
    await expect(mainButton).toHaveAttribute("data-skins", "squish");
    await expect.poll(async () => (await readSavedState(page))?.enabledSkins).toEqual(["squish"]);

    await page.reload();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(mainButton).toHaveAttribute("data-skins", "squish");
  });

  test("Fresh button hooks", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await waitForLoaded(page);
    await expect(mainButton).toHaveAttribute("data-skins", "");
    await expect(mainButton).toHaveAttribute("data-material", "classic");
  });

  test("Soft shadow changes the shadow", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(
      page,
      S({ totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }),
    );
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await waitForLoaded(page);
    await expect(mainButton).toHaveAttribute("data-skins", "soft-shadow");
    await page.mouse.move(640, 700);
    const withSkin = await mainButton.evaluate((el) => getComputedStyle(el).boxShadow);

    await page.getByTestId("skin-toggle-soft-shadow").click();
    await expect(mainButton).toHaveAttribute("data-skins", "");
    await page.mouse.move(640, 700);
    await expect
      .poll(() => mainButton.evaluate((el) => getComputedStyle(el).boxShadow))
      .not.toBe(withSkin);
  });

  test("Squish plays on click", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(page, S({ totalClicks: 20, ownedSkins: ["squish"], enabledSkins: ["squish"] }));
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await mainButton.click();
    await expect.poll(() => animationName(mainButton)).toBe("squish");
  });

  test("Floating number shows the earned amount", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(
      page,
      S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"] }),
    );
    await page.goto("/");
    await page.getByTestId("main-button").click();
    const floating = page.getByTestId("floating-number").first();
    await expect(floating).toBeVisible();
    await expect(floating).toHaveText("+1");
    expect(await animationName(floating)).toBe("float-up");

    await page.waitForTimeout(1500);
    expect(await page.getByTestId("floating-number").count()).toBe(0);
  });

  test("Floating number with Double click", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(
      page,
      S({
        totalClicks: 60,
        ownedSkins: ["floating-number"],
        enabledSkins: ["floating-number"],
        upgrades: ["double-click"],
      }),
    );
    await page.goto("/");
    await page.getByTestId("main-button").click();
    const floating = page.getByTestId("floating-number").first();
    await expect(floating).toBeVisible();
    await expect(floating).toHaveText("+2");
  });

  test("No floating number when disabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(page, S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: [] }));
    await page.goto("/");
    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("1");
    expect(await page.getByTestId("floating-number").count()).toBe(0);
  });

  test("Jumping cap sits on the button and hops", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(
      page,
      S({ totalClicks: 40, ownedSkins: ["jumping-cap"], enabledSkins: ["jumping-cap"] }),
    );
    await page.goto("/");
    const cap = page.getByTestId("jumping-cap");
    const mainButton = page.getByTestId("main-button");
    const capBox = await boxOf(cap);
    const buttonBox = await boxOf(mainButton);
    const capCenterX = capBox.x + capBox.width / 2;
    const buttonCenterX = buttonBox.x + buttonBox.width / 2;
    expect(Math.abs(capCenterX - buttonCenterX)).toBeLessThanOrEqual(40);
    expect(capBox.y).toBeLessThan(buttonBox.y + buttonBox.height / 2);

    await mainButton.click();
    await expect.poll(() => animationName(cap)).toBe("cap-hop");

    await page.getByTestId("skin-toggle-jumping-cap").click();
    await expect(cap).toHaveCount(0);
  });

  test("Gold material", async ({ page }) => {
    await seedV2(page, S({ balance: 500, totalClicks: 300 }));
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await waitForLoaded(page);
    await page.mouse.move(640, 700);
    const background = () =>
      mainButton.evaluate((el) => {
        const style = getComputedStyle(el);
        return `${style.backgroundImage}|${style.backgroundColor}`;
      });
    const classic = await background();

    await page.getByTestId("shop-buy-gold").click();
    await expect(mainButton).toHaveAttribute("data-material", "gold");
    await expect.poll(background).not.toBe(classic);
    const toggle = page.getByTestId("skin-toggle-gold");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    await expect(mainButton).toHaveAttribute("data-material", "classic");
    await expect.poll(background).toBe(classic);
  });

  test("Skins do not move the main button", async ({ page }) => {
    await seedV2(
      page,
      S({
        totalClicks: 300,
        ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"],
        enabledSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap"],
        material: "gold",
      }),
    );
    await page.goto("/");
    await expect(page.getByTestId("main-button")).toHaveAttribute("data-material", "gold");
    const box = await boxOf(page.getByTestId("main-button"));
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(40);
    expect(Math.abs(box.y + box.height / 2 - 360)).toBeLessThanOrEqual(60);
  });
});

test.describe("page-decor", () => {
  async function buyCatAndCheck(page: Page): Promise<Box> {
    await seedV2(page, S({ balance: 100, totalClicks: 75 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-sleeping-cat").click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    const box = await boxOf(page.getByTestId("decor-sleeping-cat"));
    expect(Math.abs(box.width - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.height - 80)).toBeLessThanOrEqual(1);
    return box;
  }

  test("Buying the cat places it clear of the UI", async ({ page }) => {
    const box = await buyCatAndCheck(page);
    await expectNoOverlapWith(page, box, UI_TEST_IDS);

    await expect.poll(async () => (await readSavedState(page))?.decor.length).toBe(1);
    const saved = await readSavedState(page);
    const entry = saved?.decor[0];
    if (!entry?.position) throw new Error("saved decor entry has no position");
    expect(entry.id).toBe("sleeping-cat");
    const position = entry.position;
    expect(position.x).toBeGreaterThanOrEqual(0);
    expect(position.x).toBeLessThanOrEqual(1);
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.y).toBeLessThanOrEqual(1);
    expect(Math.abs(position.x * 1280 - box.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(position.y * 720 - box.y)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId("shop-owned-sleeping-cat")).toHaveText("Куплено");
  });

  test("Position survives reload", async ({ page }) => {
    const before = await buyCatAndCheck(page);
    await expect.poll(async () => (await readSavedState(page))?.decor.length).toBe(1);

    await page.reload();
    const after = await boxOf(page.getByTestId("decor-sleeping-cat"));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test("Three decor items never overlap", async ({ page }) => {
    await seedV2(page, S({ balance: 1800, totalClicks: 750 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-hydraulic-press").click();
    await expect(page.getByTestId("decor-hydraulic-press")).toBeVisible();
    await page.getByTestId("shop-buy-lava-lamp").click();
    await expect(page.getByTestId("decor-lava-lamp")).toBeVisible();
    await page.getByTestId("shop-buy-sleeping-cat").click();
    await expect(page.getByTestId("decor-sleeping-cat")).toBeVisible();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.locator('[data-testid^="decor-"]')).toHaveCount(3);

    const boxes = await Promise.all(DECOR_IDS.map((id) => boxOf(page.getByTestId(id))));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(strictlyOverlap(boxes[i], boxes[j]), `${DECOR_IDS[i]} × ${DECOR_IDS[j]}`).toBe(
          false,
        );
      }
      await expectNoOverlapWith(page, boxes[i], UI_TEST_IDS);
    }
  });

  test("Seeded position is rendered", async ({ page }) => {
    await seedV2(
      page,
      S({ totalClicks: 150, decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }] }),
    );
    await page.goto("/");
    const lamp = page.getByTestId("decor-lava-lamp");
    const box = await boxOf(lamp);
    expect(Math.abs(box.x - 1024)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - 72)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - 64)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.height - 144)).toBeLessThanOrEqual(1);
    await expect(lamp).toHaveAttribute("role", "img");
    await expect(lamp).toHaveAccessibleName("Лава-лампа");
  });

  test("Null position uses the fallback dock", async ({ page }) => {
    await seedV2(page, S({ totalClicks: 75, decor: [{ id: "sleeping-cat", position: null }] }));
    await page.goto("/");
    const box = await boxOf(page.getByTestId("decor-sleeping-cat"));
    expect(Math.abs(box.x + box.width - 1264)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height / 2 - 360)).toBeLessThanOrEqual(2);
  });

  test("Decor does not block the main button", async ({ page }) => {
    await seedV2(
      page,
      S({
        balance: 5,
        totalClicks: 150,
        decor: [{ id: "lava-lamp", position: { x: 0.45, y: 0.4 } }],
      }),
    );
    await page.goto("/");
    await expect(page.getByTestId("decor-lava-lamp")).toBeVisible();
    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("6");
  });
});

test.describe("click-upgrades", () => {
  test("Buy Double click and click", async ({ page }) => {
    await seedV2(page, S({ balance: 100, totalClicks: 60 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-double-click").click();
    await expect(page.getByTestId("balance")).toHaveText("0");

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("2");
    await expect
      .poll(() => readSavedState(page))
      .toMatchObject({ balance: 2, totalClicks: 61, upgrades: ["double-click"] });
  });

  test("Buy Triple click and click", async ({ page }) => {
    await seedV2(page, S({ balance: 500, totalClicks: 250, upgrades: ["double-click"] }));
    await page.goto("/");
    await page.getByTestId("shop-buy-triple-click").click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await clickMain(page, 2);
    await expect(page.getByTestId("balance")).toHaveText("6");
    await expect(page.getByTestId("shop-owned-double-click")).toHaveText("Куплено");
    await expect(page.getByTestId("shop-owned-triple-click")).toHaveText("Куплено");
  });

  test("Upgrade survives reload", async ({ page }) => {
    await seedV2(
      page,
      S({ balance: 0, totalClicks: 250, upgrades: ["double-click", "triple-click"] }),
    );
    await page.goto("/");
    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("3");
  });
});

test.describe("helpers", () => {
  test("One monkey earns one click per second", async ({ page }) => {
    await page.clock.install();
    await seedV2(page, S({ balance: 50, totalClicks: 30 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("shop-buy-monkey").click();
    await expect(page.getByTestId("balance")).toHaveText("0");

    await page.clock.runFor(3000);
    await expect(page.getByTestId("balance")).toHaveText("3");
    await expect
      .poll(() => readSavedState(page))
      .toMatchObject({ balance: 3, totalClicks: 33, helpers: { monkey: 1 } });
  });

  test("Helper earnings reveal items", async ({ page }) => {
    await page.clock.install();
    await seedV2(page, S({ balance: 337, totalClicks: 55 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    const buy = page.getByTestId("shop-buy-monkey");
    for (const [count, nextPrice] of [
      [1, "58"],
      [2, "66"],
      [3, "76"],
      [4, "87"],
    ] as const) {
      await buy.click();
      await expect(page.getByTestId("shop-count-monkey")).toHaveText(`Маєте: ${count}`);
      await expect(buy).toHaveText(`Купити за ${nextPrice}`);
    }
    await buy.click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.getByTestId("helper-monkey-count")).toHaveText("×5");
    await expect(page.getByTestId("shop-item-double-click")).toHaveCount(0);

    await page.clock.runFor(1000);
    await expect(page.getByTestId("balance")).toHaveText("5");
    await expect(page.getByTestId("shop-item-double-click")).toBeVisible();
  });

  test("No catch-up for closed time", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await seedV2(page, S({ balance: 0, totalClicks: 100, helpers: { monkey: 5 } }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);
    await expect(page.getByTestId("balance")).toBeVisible();
    const before = await balanceValue(page);

    const now = await page.evaluate(() => Date.now());
    await page.clock.setSystemTime(now + 60 * 60 * 1000);
    await page.reload();
    await waitForLoaded(page);
    await pauseClock(page);
    await expect(page.getByTestId("balance")).toBeVisible();
    expect(await balanceValue(page)).toBeLessThanOrEqual(before + 10);

    const envelope = (await readSave(page)) as Record<string, unknown> | null;
    if (!envelope) throw new Error("no save after helper income");
    expect(Object.keys(envelope).sort()).toEqual(["state", "version"]);
    expect(Object.keys(envelope.state as object).sort()).toEqual(
      [
        "balance",
        "totalClicks",
        "ownedSkins",
        "enabledSkins",
        "material",
        "decor",
        "videos",
        "upgrades",
        "helpers",
        "levels",
      ].sort(),
    );
  });

  test("Monkey appears after purchase", async ({ page }) => {
    await seedV2(page, S({ balance: 50, totalClicks: 30 }));
    await page.goto("/");
    await waitForLoaded(page);
    await expect(page.getByTestId("helper-monkey")).toHaveCount(0);

    await page.getByTestId("shop-buy-monkey").click();
    const monkey = page.getByTestId("helper-monkey");
    await expect(monkey).toBeVisible();
    await expect(page.getByTestId("helper-monkey-count")).toHaveText("×1");
    await expect(monkey).toHaveAttribute("role", "img");
    await expect(monkey).toHaveAccessibleName("Мавпочки: 1 (+1 за секунду)");
  });

  test("Count and English label", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 100, helpers: { monkey: 3 } }), {
      [LANG_KEY]: "en",
    });
    await page.goto("/");
    await expect(page.getByTestId("helper-monkey-count")).toHaveText("×3");
    await expect(page.getByTestId("helper-monkey")).toHaveAccessibleName(
      "Monkeys: 3 (+3 per second)",
    );
  });

  test("Helper zone placement", async ({ page }) => {
    await seedV2(page, S({ balance: 0, totalClicks: 750, helpers: { monkey: 1 } }));
    await page.goto("/");
    await expect(page.getByTestId("helper-monkey")).toBeVisible();
    const box = await boxOf(page.getByTestId("helpers"));
    expect(box.x).toBeLessThanOrEqual(24);
    expect(box.y + box.height).toBeGreaterThanOrEqual(720 - 24);
    await expectNoOverlapWith(page, box, ["main-button", "balance", "shop", "reset"]);
  });

  test("Clicking the monkey does nothing", async ({ page }) => {
    await page.clock.install();
    await seedV2(page, S({ balance: 10, totalClicks: 100, helpers: { monkey: 1 } }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);
    await expect(page.getByTestId("balance")).toBeVisible();
    const before = await normalizedText(page.getByTestId("balance"));

    await page.getByTestId("helper-monkey").click();
    await page.waitForTimeout(300);
    expect(await normalizedText(page.getByTestId("balance"))).toBe(before);
  });
});

test.describe("game-persistence", () => {
  test("Purchases and toggles survive reload", async ({ page }) => {
    await seedV2(page, S({ balance: 425, totalClicks: 150 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-squish").click();
    await expect(page.getByTestId("skin-toggle-squish")).toBeVisible();
    await page.getByTestId("shop-buy-double-click").click();
    await expect(page.getByTestId("shop-owned-double-click")).toBeVisible();
    await page.getByTestId("shop-buy-lava-lamp").click();
    await expect(page.getByTestId("decor-lava-lamp")).toBeVisible();
    await page.getByTestId("shop-buy-monkey").click();
    await expect(page.getByTestId("helper-monkey-count")).toHaveText("×1");

    await page.getByTestId("skin-toggle-squish").click();
    await expect(page.getByTestId("skin-toggle-squish")).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await readSavedState(page))?.enabledSkins).toEqual([]);

    await page.reload();
    await expect(page.getByTestId("skin-toggle-squish")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("shop-owned-double-click")).toHaveText("Куплено");
    await expect(page.getByTestId("shop-owned-lava-lamp")).toHaveText("Куплено");
    await expect(page.getByTestId("decor-lava-lamp")).toBeVisible();
    await expect(page.getByTestId("helper-monkey-count")).toHaveText("×1");

    const saved = await readSavedState(page);
    expect(saved).toMatchObject({
      ownedSkins: ["squish"],
      enabledSkins: [],
      upgrades: ["double-click"],
      helpers: { monkey: 1 },
    });
    expect(saved?.decor.map((d) => d.id)).toEqual(["lava-lamp"]);
    expect(saved?.totalClicks).toBeGreaterThanOrEqual(150);
  });

  test("Reset wipes purchases", async ({ page }) => {
    await seedV2(
      page,
      S({
        balance: 40,
        totalClicks: 800,
        ownedSkins: ["jumping-cap", "gold"],
        enabledSkins: ["jumping-cap"],
        material: "gold",
        decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }],
        upgrades: ["double-click"],
        helpers: { monkey: 2 },
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await expect(page.getByTestId("helper-monkey")).toBeVisible();

    await page.getByTestId("reset").click();
    await page.getByTestId("reset-confirm").click();

    const mainButton = page.getByTestId("main-button");
    await expect(page.getByTestId("shop")).toBeHidden();
    await expect(page.getByTestId("balance")).toBeHidden();
    await expect(page.getByTestId("decor-lava-lamp")).toHaveCount(0);
    await expect(page.getByTestId("helper-monkey")).toHaveCount(0);
    await expect(page.getByTestId("jumping-cap")).toHaveCount(0);
    await expect(mainButton).toHaveAttribute("data-skins", "");
    await expect(mainButton).toHaveAttribute("data-material", "classic");
    await expect.poll(() => readSave(page)).toBeNull();

    await mainButton.click();
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("balance")).toHaveText("1");
  });

  test("Stage 1 player continues in Stage 2", async ({ page }) => {
    await seedStorage(page, {
      [SAVE_KEY]: '{"version":1,"state":{"balance":40,"totalClicks":12}}',
    });
    await page.goto("/");
    await expect(page.getByTestId("balance")).toHaveText("40");
    await expect(page.getByTestId("shop")).toBeVisible();
    await expect(page.getByTestId("shop-buy-soft-shadow")).toBeEnabled();

    await page.getByTestId("main-button").click();
    await expect
      .poll(() => readSave(page))
      .toEqual({ version: 4, state: S4({ balance: 41, totalClicks: 13 }) });
  });
});

test.describe("reduced-motion", () => {
  test("Full motion plays the Stage 2 effects", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(page, ALL_FX);
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await mainButton.click();

    const floating = page.getByTestId("floating-number").first();
    await expect(floating).toBeVisible();
    await expect(floating).toHaveText("+1");
    await expect.poll(() => animationName(mainButton)).toBe("squish");
    await expect.poll(() => animationName(page.getByTestId("jumping-cap"))).toBe("cap-hop");

    for (const id of DECOR_IDS) {
      await expect(page.getByTestId(id)).toBeVisible();
      await expect
        .poll(async () => (await animationNames(page.getByTestId(id))).some((n) => n !== "none"), {
          message: `${id} has an animated element`,
        })
        .toBe(true);
    }

    await page.waitForTimeout(1100);
    await expect
      .poll(async () => animationNames(page.getByTestId("helper-monkey")))
      .toContain("monkey-press");
  });

  test("Reduced motion disables Stage 2 effects", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedV2(page, ALL_FX);
    await page.goto("/");
    await page.getByTestId("main-button").click();
    await page.waitForTimeout(1100);

    await expect(page.getByTestId("balance")).toBeVisible();
    expect(await balanceValue(page)).toBeGreaterThanOrEqual(1);
    expect(await page.getByTestId("floating-number").count()).toBe(0);
    expect(await animationName(page.getByTestId("main-button"))).toBe("none");
    await expect(page.getByTestId("jumping-cap")).toBeVisible();
    expect(await animationName(page.getByTestId("jumping-cap"))).toBe("none");

    for (const id of DECOR_IDS) {
      await expect(page.getByTestId(id)).toBeVisible();
      const names = await animationNames(page.getByTestId(id));
      expect(names.every((n) => n === "none"), `${id}: ${names.join(", ")}`).toBe(true);
    }
    await expect(page.getByTestId("helper-monkey")).toBeVisible();
    const monkeyNames = await animationNames(page.getByTestId("helper-monkey"));
    expect(monkeyNames.every((n) => n === "none"), monkeyNames.join(", ")).toBe(true);
  });

  test("Switching to reduced motion live", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedV2(page, ALL_FX);
    await page.goto("/");
    await waitForLoaded(page);
    for (const id of DECOR_IDS) {
      await expect(page.getByTestId(id)).toBeVisible();
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toBeVisible();
    expect(await balanceValue(page)).toBeGreaterThanOrEqual(1);
    expect(await page.getByTestId("floating-number").count()).toBe(0);

    for (const id of DECOR_IDS) {
      const names = await animationNames(page.getByTestId(id));
      expect(names.every((n) => n === "none"), `${id}: ${names.join(", ")}`).toBe(true);
    }
  });
});
