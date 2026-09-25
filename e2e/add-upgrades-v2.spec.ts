import { expect, test, type Locator, type Page } from "@playwright/test";

// OpenSpec change add-upgrades-v2 — one describe per capability, one test per [e2e] scenario.
// Notation (design.md): FRESH, S({...}) with merged `helpers` / `levels`, S2({...}), V2(...),
// V3(...). Viewport 1280 × 720, Ukrainian by default. Time is the Playwright fake clock (design
// D19/D20: `page.clock.install()` before the first load, `pauseAt` once the button is enabled,
// then `runFor`). Randomness is the test-only hook `globalThis.__dcRandom` (design D19) — set with
// `page.addInitScript`; `Math.random` is never overridden.

const SAVE_KEY = "dopamine-clicker:save";
const LANG_KEY = "dopamine-clicker:lang";

type Position = { x: number; y: number };
type DecorEntry = { id: string; position: Position | null };
type Helpers = { monkey: number; robot: number; factory: number };
type Levels = {
  crit: number;
  "speed-monkey": number;
  "speed-robot": number;
  "speed-factory": number;
};
type SaveState = {
  balance: number;
  totalClicks: number;
  ownedSkins: string[];
  enabledSkins: string[];
  material: string;
  decor: DecorEntry[];
  upgrades: string[];
  helpers: Helpers;
  levels: Levels;
};
/** Stage 2 (v2) payload: no `levels`, `helpers` is only `{ monkey }`. */
type SaveStateV2 = Omit<SaveState, "helpers" | "levels"> & { helpers: { monkey: number } };
type Box = { x: number; y: number; width: number; height: number };

type StateOverrides = Partial<Omit<SaveState, "helpers" | "levels">> & {
  helpers?: Partial<Helpers>;
  levels?: Partial<Levels>;
};

/**
 * v3 `FRESH` with the listed top-level fields replaced, except `helpers` and `levels`, which are
 * shallow-merged into their FRESH defaults (design.md notation).
 */
function S(overrides: StateOverrides = {}): SaveState {
  const { helpers, levels, ...rest } = overrides;
  return {
    balance: 0,
    totalClicks: 0,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    upgrades: [],
    ...rest,
    helpers: { monkey: 0, robot: 0, factory: 0, ...helpers },
    levels: {
      crit: 0,
      "speed-monkey": 0,
      "speed-robot": 0,
      "speed-factory": 0,
      ...levels,
    },
  };
}

/**
 * The v4 (Stage 4) payload: `S({...})` plus `videos: []` (design D11/D20). Used only for expected
 * save envelopes in the one Stage 2 → Stage 3 migration test updated for add-content-v3; seeding in
 * this file stays v2 / v3.
 */
function S4(overrides: StateOverrides = {}): SaveState & { videos: DecorEntry[] } {
  return { ...S(overrides), videos: [] };
}

/** The Stage 2 (v2) fresh payload with the listed top-level fields replaced (no merging). */
function S2(overrides: Partial<SaveStateV2> = {}): SaveStateV2 {
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
async function seedV2(page: Page, state: SaveStateV2, extra: Record<string, string> = {}) {
  await seedStorage(page, { [SAVE_KEY]: JSON.stringify({ version: 2, state }), ...extra });
}

/** Seeds `V3(state)` (plus optional extra keys) under the save key. */
async function seedV3(page: Page, state: SaveState, extra: Record<string, string> = {}) {
  await seedStorage(page, { [SAVE_KEY]: JSON.stringify({ version: 3, state }), ...extra });
}

/**
 * Fixes the page random source before any page script runs (design D19): every draw of the page
 * (crit roll, golden interval, golden and decor placement) returns `value`. `Math.random` itself
 * stays untouched, so framework code is unaffected.
 */
async function fixRandom(page: Page, value: number) {
  await page.addInitScript((r) => {
    globalThis.__dcRandom = () => r;
  }, value);
}

async function readRawSave(page: Page): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), SAVE_KEY);
}

async function readSave(page: Page): Promise<unknown> {
  const raw = await readRawSave(page);
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

/** Box of an element that is attached but may be empty (e.g. the click-status slot). */
async function attachedBoxOf(locator: Locator): Promise<Box> {
  await expect(locator).toBeAttached();
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no bounding box");
  return box;
}

async function expectNoOverlapWith(page: Page, box: Box, testIds: string[]) {
  for (const id of testIds) {
    const other = await attachedBoxOf(page.getByTestId(id));
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

/** N clicks on the main button with the clock running 100 ms between them (not after the last). */
async function fastClicks(page: Page, times: number) {
  const mainButton = page.getByTestId("main-button");
  for (let i = 0; i < times; i++) {
    if (i > 0) {
      await page.clock.runFor(100);
    }
    await mainButton.click();
  }
}

const GOLDEN_NEIGHBOURS = [
  "main-button",
  "balance",
  "shop",
  "theme-toggle",
  "lang-toggle",
  "reset",
  "helpers",
  "click-status",
];

test.use({ viewport: { width: 1280, height: 720 } });

test.describe("crit", () => {
  /** `V3(S({ balance: 0, totalClicks: 200, levels: { crit: 1 } }))` with every roll a crit. */
  async function seedCrit1(page: Page, extra: Record<string, string> = {}) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await fixRandom(page, 0.01);
    await seedV3(page, S({ balance: 0, totalClicks: 200, levels: { crit: 1 } }), extra);
    await page.goto("/");
    await waitForLoaded(page);
  }

  test("Crit shows the full effect", async ({ page }) => {
    await seedCrit1(page);
    const layer = page.getByTestId("shake-layer");
    const mainButton = page.getByTestId("main-button");
    await expect(page.getByTestId("crit-text")).toHaveCount(0);
    expect(await animationName(layer)).toBe("none");

    for (const id of ["balance", "main-button", "click-status"]) {
      await expect(layer.getByTestId(id), `shake-layer contains ${id}`).toHaveCount(1);
    }
    for (const id of ["shop", "reset", "helpers", "theme-toggle", "lang-toggle"]) {
      await expect(layer.getByTestId(id), `shake-layer must not contain ${id}`).toHaveCount(0);
    }

    await mainButton.click();
    await expect(page.getByTestId("balance")).toHaveText("10");

    const critText = page.getByTestId("crit-text");
    await expect(critText).toBeVisible();
    await expect(critText).toHaveText("КРИТ ×10!");
    expect(await animationName(critText)).toBe("crit-pop");

    const flash = page.getByTestId("crit-flash");
    await expect(flash).toBeVisible();
    expect(await animationName(flash)).toBe("crit-flash");
    // Both boxes are read in one frame: the shake layer moves them together, so two separate
    // boundingBox() round-trips would sample different points of the 300 ms crit-shake.
    const [flashBox, buttonBox] = await page.evaluate(() => {
      const box = (id: string) => {
        const rect = document
          .querySelector(`[data-testid="${id}"]`)!
          .getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      };
      return [box("crit-flash"), box("main-button")] as const;
    });
    expect(Math.abs(flashBox.x - buttonBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(flashBox.y - buttonBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(flashBox.width - buttonBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(flashBox.height - buttonBox.height)).toBeLessThanOrEqual(1);

    await expect(page.getByTestId("crit-particle")).toHaveCount(12);
    expect(await animationName(page.getByTestId("crit-particle").first())).toBe("crit-burst");

    expect(await animationName(layer)).toBe("crit-shake");
    expect(await animationName(page.locator("main"))).toBe("none");
    expect(await animationName(page.getByTestId("shop"))).toBe("none");
    await expect(mainButton).toHaveAttribute("data-crit", "true");
  });

  test("Effect ends and the button stays in place", async ({ page }) => {
    await seedCrit1(page);
    const mainButton = page.getByTestId("main-button");
    const before = await boxOf(mainButton);

    await mainButton.click();
    await expect(page.getByTestId("crit-text")).toBeVisible();
    await page.waitForTimeout(1500);

    await expect(page.getByTestId("crit-text")).toHaveCount(0);
    await expect(page.getByTestId("crit-flash")).toHaveCount(0);
    await expect(page.getByTestId("crit-particle")).toHaveCount(0);
    await expect(mainButton).not.toHaveAttribute("data-crit", "true");

    const after = await boxOf(mainButton);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test("Fixed UI stays still during the shake", async ({ page }) => {
    await seedCrit1(page);
    const fixedIds = ["shop", "reset", "helpers"];
    const before: Box[] = [];
    for (const id of fixedIds) {
      before.push(await attachedBoxOf(page.getByTestId(id)));
    }

    await page.getByTestId("main-button").click();
    await expect.poll(() => animationName(page.getByTestId("shake-layer"))).toBe("crit-shake");

    for (let i = 0; i < fixedIds.length; i++) {
      const after = await attachedBoxOf(page.getByTestId(fixedIds[i]));
      expect(Math.abs(after.x - before[i].x), `${fixedIds[i]} x`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(after.y - before[i].y), `${fixedIds[i]} y`).toBeLessThanOrEqual(0.5);
    }
  });

  test("No crit, no effect", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await fixRandom(page, 0.99);
    await seedV3(page, S({ balance: 0, totalClicks: 200, levels: { crit: 3 } }));
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("1");
    await expect(page.getByTestId("crit-text")).toHaveCount(0);
    await expect(page.getByTestId("crit-particle")).toHaveCount(0);
    expect(await animationName(page.getByTestId("shake-layer"))).toBe("none");
  });

  test("Crit multiplies click upgrades", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await fixRandom(page, 0.01);
    await seedV3(
      page,
      S({ balance: 0, totalClicks: 300, upgrades: ["double-click"], levels: { crit: 3 } }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    await clickMain(page, 2);
    await expect(page.getByTestId("balance")).toHaveText("40");
    await expect(page.getByTestId("crit-text")).toHaveCount(1);
  });

  test("Crit text in English", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await fixRandom(page, 0.01);
    await seedV3(page, S({ totalClicks: 200, levels: { crit: 1 } }), { [LANG_KEY]: "en" });
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("crit-text")).toHaveText("CRIT ×10!");
  });

  test("Without the upgrade nothing crits", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await fixRandom(page, 0.01);
    await seedV3(page, S({ balance: 0, totalClicks: 200 }));
    await page.goto("/");
    await waitForLoaded(page);

    await clickMain(page, 3);
    await expect(page.getByTestId("balance")).toHaveText("3");
    await expect(page.getByTestId("crit-text")).toHaveCount(0);
  });
});

test.describe("combo", () => {
  /** Combo owned, clock installed and paused. */
  async function seedCombo(page: Page, extra: Record<string, string> = {}) {
    await page.clock.install();
    await seedV3(page, S({ balance: 0, totalClicks: 300, upgrades: ["combo"] }), extra);
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);
  }

  test("Fast clicks build the combo", async ({ page }) => {
    await seedCombo(page);
    await expect(page.getByTestId("combo")).toHaveCount(0);

    await fastClicks(page, 11);
    await expect(page.getByTestId("balance")).toHaveText("16");
    const combo = page.getByTestId("combo");
    await expect(combo).toHaveText("Комбо ×2");
    await expect(combo).toHaveAttribute("data-combo-level", "10");
  });

  test("Combo decays when clicking pauses", async ({ page }) => {
    await seedCombo(page);
    await fastClicks(page, 11);
    await expect(page.getByTestId("balance")).toHaveText("16");
    const combo = page.getByTestId("combo");

    await page.clock.runFor(500);
    await expect(combo).toHaveText("Комбо ×2");

    await page.clock.runFor(250);
    await expect(combo).toHaveText("Комбо ×1,9");
    await expect(combo).toHaveAttribute("data-combo-level", "9");

    await page.clock.runFor(2250);
    await expect(page.getByTestId("combo")).toHaveCount(0);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("17");
  });

  test("Combo in English", async ({ page }) => {
    await seedCombo(page, { [LANG_KEY]: "en" });
    await fastClicks(page, 6);
    await expect(page.getByTestId("balance")).toHaveText("7");
    await expect(page.getByTestId("combo")).toHaveText("Combo ×1.5");
  });

  test("Without the upgrade there is no combo", async ({ page }) => {
    await page.clock.install();
    await seedV3(page, S({ balance: 0, totalClicks: 300 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await fastClicks(page, 11);
    await expect(page.getByTestId("balance")).toHaveText("11");
    await expect(page.getByTestId("combo")).toHaveCount(0);
  });

  test("Combo resets on reload", async ({ page }) => {
    await seedCombo(page);
    await fastClicks(page, 11);
    await expect(page.getByTestId("balance")).toHaveText("16");

    await page.reload();
    await waitForLoaded(page);
    await pauseClock(page);
    await expect(page.getByTestId("combo")).toHaveCount(0);
    await expect(page.getByTestId("balance")).toHaveText("16");

    await fastClicks(page, 6);
    await expect(page.getByTestId("balance")).toHaveText("23");
  });

  test("Meter does not move the main button", async ({ page }) => {
    await seedCombo(page);
    const mainButton = page.getByTestId("main-button");
    const before = await boxOf(mainButton);

    await fastClicks(page, 3);
    await expect(page.getByTestId("combo")).toBeVisible();
    const after = await boxOf(mainButton);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);

    const slot = await attachedBoxOf(page.getByTestId("click-status"));
    expect(Math.abs(slot.x - (after.x + after.width + 24))).toBeLessThanOrEqual(1);
    expect(Math.abs(slot.width - 160)).toBeLessThanOrEqual(1);
    expect(Math.abs(slot.height - 64)).toBeLessThanOrEqual(1);
    expect(strictlyOverlap(slot, after)).toBe(false);
  });
});

test.describe("golden-button", () => {
  /** Golden button affordable, random fixed to 0.75 (interval 75 000 ms), clock paused. */
  async function seedGolden(page: Page, extra: Record<string, string> = {}) {
    await page.clock.install();
    await fixRandom(page, 0.75);
    await seedV3(page, S({ balance: 1000, totalClicks: 700 }), extra);
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);
  }

  /** Buys the upgrade and runs the clock until the button spawned (design D8: 74 900 + 100 ms). */
  async function buyAndSpawn(page: Page) {
    await page.getByTestId("shop-buy-golden-button").click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.getByTestId("shop-owned-golden-button")).toHaveText("Куплено");
    await expect(page.getByTestId("golden-button")).toHaveCount(0);

    await page.clock.runFor(74_900);
    await expect(page.getByTestId("golden-button")).toHaveCount(0);

    await page.clock.runFor(100);
    await expect(page.getByTestId("golden-button")).toBeVisible();
  }

  test("Golden button appears after the rolled interval", async ({ page }) => {
    await seedGolden(page);
    await buyAndSpawn(page);

    const golden = page.getByTestId("golden-button");
    const box = await boxOf(golden);
    expect(Math.abs(box.x - 904)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - 484)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - 64)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.height - 64)).toBeLessThanOrEqual(1);
    await expect(golden).toHaveAccessibleName("Зловити золоту кнопку");
    await expectNoOverlapWith(page, box, GOLDEN_NEIGHBOURS);
  });

  test("Missed golden button disappears without penalty", async ({ page }) => {
    await seedGolden(page);
    await buyAndSpawn(page);

    await page.clock.runFor(4_900);
    await expect(page.getByTestId("golden-button")).toBeVisible();

    await page.clock.runFor(100);
    await expect(page.getByTestId("golden-button")).toHaveCount(0);
    await expect(page.getByTestId("golden-bonus")).toHaveCount(0);
    await expect(page.getByTestId("balance")).toHaveText("0");
  });

  test("Catching gives 30 s of ×7", async ({ page }) => {
    await seedGolden(page);
    await buyAndSpawn(page);

    await page.getByTestId("golden-button").click();
    await expect(page.getByTestId("golden-button")).toHaveCount(0);
    await expect(page.getByTestId("golden-bonus")).toHaveText("Золотий бонус ×7: 30 с");
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect.poll(() => readSavedState(page)).toMatchObject({ totalClicks: 700 });

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("7");

    await page.clock.runFor(1_000);
    await expect(page.getByTestId("golden-bonus")).toHaveText("Золотий бонус ×7: 29 с");

    await page.clock.runFor(28_900);
    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("14");

    await page.clock.runFor(100);
    await expect(page.getByTestId("golden-bonus")).toHaveCount(0);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("15");
  });

  test("Bonus is lost on reload", async ({ page }) => {
    await seedGolden(page);
    await buyAndSpawn(page);
    await page.getByTestId("golden-button").click();
    await expect(page.getByTestId("golden-bonus")).toHaveText("Золотий бонус ×7: 30 с");
    await expect(page.getByTestId("balance")).toHaveText("0");

    await page.reload();
    await waitForLoaded(page);
    await pauseClock(page);
    await expect(page.getByTestId("golden-bonus")).toHaveCount(0);
    await expect(page.getByTestId("golden-button")).toHaveCount(0);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("1");
  });

  test("Golden button in English", async ({ page }) => {
    await seedGolden(page, { [LANG_KEY]: "en" });
    await page.getByTestId("shop-buy-golden-button").click();
    await expect(page.getByTestId("balance")).toHaveText("0");

    await page.clock.runFor(75_000);
    const golden = page.getByTestId("golden-button");
    await expect(golden).toBeVisible();
    await expect(golden).toHaveAccessibleName("Catch the golden button");

    await golden.click();
    await expect(page.getByTestId("golden-bonus")).toHaveText("Golden bonus ×7: 30 s");
  });
});

test.describe("click-upgrades", () => {
  test("Every Stage 3 factor combines in the browser", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await fixRandom(page, 0.01);
    await seedV3(
      page,
      S({
        balance: 0,
        totalClicks: 5000,
        upgrades: ["double-click", "triple-click", "combo"],
        levels: { crit: 1 },
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await fastClicks(page, 6);
    await expect(page.getByTestId("balance")).toHaveText("225");
    await expect(page.getByTestId("combo")).toHaveText("Комбо ×1,5");
    await expect(page.getByTestId("crit-text")).toHaveCount(1);
  });
});

test.describe("helpers", () => {
  test("Three helper types in the zone", async ({ page }) => {
    await seedV3(
      page,
      S({
        balance: 0,
        totalClicks: 9000,
        helpers: { monkey: 2, robot: 3, factory: 1 },
        levels: { "speed-robot": 1 },
      }),
      { [LANG_KEY]: "en" },
    );
    await page.goto("/");
    await waitForLoaded(page);

    const expected = [
      ["helper-monkey", "Monkeys: 2 (+2 per second)"],
      ["helper-robot", "Robots: 3 (+30 per second)"],
      ["helper-factory", "Factories: 1 (+40 per second)"],
    ] as const;
    const boxes: Box[] = [];
    for (const [id, name] of expected) {
      const helper = page.getByTestId(id);
      await expect(helper).toBeVisible();
      await expect(helper).toHaveAccessibleName(name);
      boxes.push(await boxOf(helper));
    }
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[2].x);

    await expect(page.getByTestId("helper-robot-count")).toHaveText("×3");
    await expect(page.getByTestId("helper-factory-count")).toHaveText("×1");

    const zone = await boxOf(page.getByTestId("helpers"));
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].x, `${expected[i][0]} left`).toBeGreaterThanOrEqual(zone.x - 1);
      expect(boxes[i].y, `${expected[i][0]} top`).toBeGreaterThanOrEqual(zone.y - 1);
      expect(boxes[i].x + boxes[i].width, `${expected[i][0]} right`).toBeLessThanOrEqual(
        zone.x + zone.width + 1,
      );
      expect(boxes[i].y + boxes[i].height, `${expected[i][0]} bottom`).toBeLessThanOrEqual(
        zone.y + zone.height + 1,
      );
    }
  });

  test("Robot and factory labels in Ukrainian", async ({ page }) => {
    await seedV3(page, S({ totalClicks: 9000, helpers: { robot: 1, factory: 2 } }));
    await page.goto("/");
    await waitForLoaded(page);

    await expect(page.getByTestId("helper-robot")).toHaveAccessibleName(
      "Роботи: 1 (+5 за секунду)",
    );
    await expect(page.getByTestId("helper-factory")).toHaveAccessibleName(
      "Фабрики: 2 (+80 за секунду)",
    );
    await expect(page.getByTestId("helper-monkey")).toHaveCount(0);
  });

  test("Robot earns five clicks per second", async ({ page }) => {
    await page.clock.install();
    await seedV3(page, S({ balance: 1000, totalClicks: 600 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("shop-buy-robot").click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.getByTestId("helper-robot-count")).toHaveText("×1");
    await expect(page.getByTestId("helper-robot")).toHaveAccessibleName(
      "Роботи: 1 (+5 за секунду)",
    );
    await expect.poll(() => normalizedText(page.getByTestId("shop-buy-robot"))).toBe(
      "Купити за 1 150",
    );

    await page.clock.runFor(1_000);
    await expect(page.getByTestId("balance")).toHaveText("5");
  });

  test("Factory earns forty clicks per second", async ({ page }) => {
    await page.clock.install();
    await seedV3(page, S({ balance: 12000, totalClicks: 8000 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("shop-buy-factory").click();
    await page.clock.runFor(1_000);
    await expect(page.getByTestId("balance")).toHaveText("40");
    await expect(page.getByTestId("helper-factory")).toHaveAccessibleName(
      "Фабрики: 1 (+40 за секунду)",
    );
  });

  test("Speed-up doubles the monkey", async ({ page }) => {
    await page.clock.install();
    await seedV3(page, S({ balance: 550, totalClicks: 300 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);
    await expect(page.getByTestId("shop-item-speed-monkey")).toHaveCount(0);

    await page.getByTestId("shop-buy-monkey").click();
    await expect(page.getByTestId("balance")).toHaveText("500");
    await expect(page.getByTestId("shop-item-speed-monkey")).toBeVisible();

    await page.getByTestId("shop-buy-speed-monkey").click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.getByTestId("shop-level-speed-monkey")).toHaveText("Рівень 1 з 3");
    const buy = page.getByTestId("shop-buy-speed-monkey");
    await expect(buy).toBeDisabled();
    await expect.poll(() => normalizedText(buy)).toBe("Купити за 2 500");
    await expect(page.getByTestId("helper-monkey")).toHaveAccessibleName(
      "Мавпочки: 1 (+2 за секунду)",
    );

    await page.clock.runFor(1_000);
    await expect(page.getByTestId("balance")).toHaveText("2");
  });
});

test.describe("shop", () => {
  test("Speed-up is listed right after its helper", async ({ page }) => {
    await seedV3(page, S({ balance: 0, totalClicks: 700, helpers: { monkey: 1 } }));
    await page.goto("/");
    await expect(page.getByTestId("shop")).toBeVisible();

    await expect
      .poll(async () => {
        const ids = await page
          .locator('[data-testid^="shop-item-"]')
          .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
        return ids.slice(-4);
      })
      .toEqual([
        "shop-item-golden-button",
        "shop-item-monkey",
        "shop-item-speed-monkey",
        "shop-item-robot",
      ]);
    await expect(page.getByTestId("shop-item-speed-robot")).toHaveCount(0);
  });

  test("Crit levels in the shop", async ({ page }) => {
    await seedV3(page, S({ balance: 1000, totalClicks: 150 }));
    await page.goto("/");
    const buy = page.getByTestId("shop-buy-crit");
    await expect(buy).toBeEnabled();
    await expect(buy).toHaveText("Купити за 250");
    await expect(page.getByTestId("shop-level-crit")).toHaveCount(0);

    await buy.click();
    await expect(page.getByTestId("balance")).toHaveText("750");
    await expect(page.getByTestId("shop-level-crit")).toHaveText("Рівень 1 з 3");
    await expect(buy).toBeEnabled();
    await expect(buy).toHaveText("Купити за 750");

    await buy.click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.getByTestId("shop-level-crit")).toHaveText("Рівень 2 з 3");
    await expect(buy).toBeDisabled();
    await expect.poll(() => normalizedText(buy)).toBe("Купити за 2 250");
    await expect.poll(() => readSavedState(page)).toMatchObject({ levels: { crit: 2 } });
  });

  test("Maxed crit", async ({ page }) => {
    await seedV3(page, S({ balance: 99999, totalClicks: 150, levels: { crit: 3 } }));
    await page.goto("/");
    await expect(page.getByTestId("shop-maxed-crit")).toHaveText("Максимальний рівень");
    await expect(page.getByTestId("shop-level-crit")).toHaveText("Рівень 3 з 3");
    await expect(page.getByTestId("shop-buy-crit")).toHaveCount(0);

    await page.getByTestId("lang-toggle").click();
    await expect(page.getByTestId("shop-maxed-crit")).toHaveText("Max level");
    await expect(page.getByTestId("shop-level-crit")).toHaveText("Level 3 of 3");
  });

  test("Buying Combo and Golden button marks them owned", async ({ page }) => {
    await seedV3(page, S({ balance: 1400, totalClicks: 700 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-combo").click();
    await page.getByTestId("shop-buy-golden-button").click();

    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.getByTestId("shop-owned-combo")).toHaveText("Куплено");
    await expect(page.getByTestId("shop-owned-golden-button")).toHaveText("Куплено");
    await expect(page.getByTestId("shop-buy-combo")).toHaveCount(0);
    await expect(page.getByTestId("shop-buy-golden-button")).toHaveCount(0);
    await expect
      .poll(() => readSavedState(page))
      .toMatchObject({ upgrades: ["combo", "golden-button"] });
  });

  test("Robot count label", async ({ page }) => {
    await seedV3(page, S({ balance: 2150, totalClicks: 600 }));
    await page.goto("/");
    const buy = page.getByTestId("shop-buy-robot");
    await buy.click();
    await buy.click();

    await expect(page.getByTestId("shop-count-robot")).toHaveText("Маєте: 2");
    await expect(buy).toBeDisabled();
    await expect.poll(() => normalizedText(buy)).toBe("Купити за 1 323");
  });
});

test.describe("game-persistence", () => {
  test("Stage 3 purchases survive reload", async ({ page }) => {
    await seedV3(page, S({ balance: 2650, totalClicks: 700 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-crit").click();
    await expect(page.getByTestId("shop-level-crit")).toHaveText("Рівень 1 з 3");
    await page.getByTestId("shop-buy-combo").click();
    await expect(page.getByTestId("shop-owned-combo")).toBeVisible();
    await page.getByTestId("shop-buy-golden-button").click();
    await expect(page.getByTestId("shop-owned-golden-button")).toBeVisible();
    await page.getByTestId("shop-buy-robot").click();
    await expect(page.getByTestId("helper-robot-count")).toHaveText("×1");

    await page.reload();
    await waitForLoaded(page);
    await expect(page.getByTestId("shop-level-crit")).toHaveText("Рівень 1 з 3");
    await expect(page.getByTestId("shop-owned-combo")).toHaveText("Куплено");
    await expect(page.getByTestId("shop-owned-golden-button")).toHaveText("Куплено");
    await expect(page.getByTestId("helper-robot-count")).toHaveText("×1");

    await expect
      .poll(() => readSave(page))
      .toMatchObject({
        version: 4,
        state: {
          upgrades: ["combo", "golden-button"],
          helpers: { monkey: 0, robot: 1, factory: 0 },
          levels: { crit: 1, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
        },
      });
  });

  test("Runtime changes do not write storage", async ({ page }) => {
    await page.clock.install();
    await fixRandom(page, 0.75);
    await seedV3(
      page,
      S({ balance: 0, totalClicks: 700, upgrades: ["combo", "golden-button"] }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await fastClicks(page, 3);
    await expect(page.getByTestId("balance")).toHaveText("3");
    const written = await readRawSave(page);
    expect(written).not.toBeNull();

    await page.clock.runFor(3_000);
    expect(await readRawSave(page)).toBe(written);
  });

  test("Reset clears Stage 3 progress and runtime", async ({ page }) => {
    await fixRandom(page, 0.01);
    await seedV3(
      page,
      S({
        balance: 40,
        totalClicks: 9000,
        upgrades: ["combo", "golden-button"],
        helpers: { robot: 2, factory: 1 },
        levels: { crit: 2, "speed-robot": 1 },
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    await clickMain(page, 2);
    await expect(page.getByTestId("combo")).toBeVisible();

    await page.getByTestId("reset").click();
    await page.getByTestId("reset-confirm").click();

    for (const id of ["helper-robot", "helper-factory", "combo", "golden-button", "golden-bonus"]) {
      await expect(page.getByTestId(id), id).toHaveCount(0);
    }
    await expect(page.getByTestId("shop")).toBeHidden();
    await expect.poll(() => readRawSave(page)).toBeNull();

    await page.getByTestId("main-button").click();
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("balance")).toHaveText("1");
    await expect(page.getByTestId("crit-text")).toHaveCount(0);
  });

  test("Stage 2 player continues in Stage 3", async ({ page }) => {
    await seedV2(
      page,
      S2({
        balance: 40,
        totalClicks: 70,
        ownedSkins: ["squish"],
        enabledSkins: ["squish"],
        upgrades: ["double-click"],
      }),
    );
    await page.goto("/");
    await expect(page.getByTestId("balance")).toHaveText("40");
    await expect(page.getByTestId("skin-toggle-squish")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("shop-owned-double-click")).toHaveText("Куплено");

    await page.getByTestId("main-button").click();
    await expect
      .poll(() => readSave(page))
      .toEqual({
        version: 4,
        state: S4({
          balance: 42,
          totalClicks: 71,
          ownedSkins: ["squish"],
          enabledSkins: ["squish"],
          upgrades: ["double-click"],
        }),
      });
  });

  test("Stage 2 monkeys keep their count", async ({ page }) => {
    await seedV2(page, S2({ balance: 0, totalClicks: 100, helpers: { monkey: 3 } }));
    await page.goto("/");
    await waitForLoaded(page);

    await expect(page.getByTestId("helper-monkey-count")).toHaveText("×3");
    await expect(page.getByTestId("shop-count-monkey")).toHaveText("Маєте: 3");
  });
});

test.describe("reduced-motion", () => {
  /** `V3(CRIT1)` = `S({ balance: 0, totalClicks: 200, levels: { crit: 1 } })`, every roll a crit. */
  async function seedCrit1(page: Page) {
    await fixRandom(page, 0.01);
    await seedV3(page, S({ balance: 0, totalClicks: 200, levels: { crit: 1 } }));
    await page.goto("/");
    await waitForLoaded(page);
  }

  /** Robot, factory and an affordable golden button; clock installed and paused. */
  async function seedStage3Motion(page: Page) {
    await page.clock.install();
    await fixRandom(page, 0.75);
    await seedV3(
      page,
      S({ balance: 1000, totalClicks: 9000, helpers: { robot: 1, factory: 1 } }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);
    await page.getByTestId("shop-buy-golden-button").click();
    await page.clock.runFor(75_000);
    await expect(page.getByTestId("golden-button")).toBeVisible();
  }

  test("Full motion plays the Stage 3 helper and golden effects", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedStage3Motion(page);

    const goldenNames = await animationNames(page.getByTestId("golden-button"));
    expect(goldenNames[0], "the golden button root is never animated").toBe("none");
    expect(goldenNames.slice(1)).toContain("golden-pulse");

    await expect
      .poll(() => animationNames(page.getByTestId("helper-robot")))
      .toContain("robot-press");
    await expect
      .poll(() => animationNames(page.getByTestId("helper-factory")))
      .toContain("factory-press");
  });

  test("Reduced motion tones the crit down", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedCrit1(page);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("10");

    const critText = page.getByTestId("crit-text");
    await expect(critText).toBeVisible();
    await expect(critText).toHaveText("КРИТ ×10!");
    expect(await animationName(critText)).toBe("none");

    const flash = page.getByTestId("crit-flash");
    await expect(flash).toBeVisible();
    expect(await animationName(flash)).toBe("none");

    await expect(page.getByTestId("crit-particle")).toHaveCount(0);
    expect(await animationName(page.getByTestId("shake-layer"))).toBe("none");

    await page.waitForTimeout(1500);
    await expect(page.getByTestId("crit-text")).toHaveCount(0);
    await expect(page.getByTestId("crit-flash")).toHaveCount(0);
  });

  test("Reduced motion keeps the golden button static but catchable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedStage3Motion(page);

    for (const id of ["golden-button", "helper-robot", "helper-factory"]) {
      const names = await animationNames(page.getByTestId(id));
      expect(names.every((n) => n === "none"), `${id}: ${names.join(", ")}`).toBe(true);
    }

    await page.getByTestId("golden-button").click();
    await expect(page.getByTestId("golden-bonus")).toHaveText("Золотий бонус ×7: 30 с");
  });

  test("Switching to reduced motion live", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seedCrit1(page);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await page.getByTestId("main-button").click();

    const critText = page.getByTestId("crit-text");
    await expect(critText).toBeVisible();
    expect(await animationName(critText)).toBe("none");
    await expect(page.getByTestId("crit-particle")).toHaveCount(0);
    expect(await animationName(page.getByTestId("shake-layer"))).toBe("none");
  });
});

test.describe("page-decor", () => {
  test("Decor avoids the click-status slot", async ({ page }) => {
    await seedV3(page, S({ balance: 1800, totalClicks: 750 }));
    await page.goto("/");
    await page.getByTestId("shop-buy-hydraulic-press").click();
    await expect(page.getByTestId("decor-hydraulic-press")).toBeVisible();
    await page.getByTestId("shop-buy-lava-lamp").click();
    await expect(page.getByTestId("decor-lava-lamp")).toBeVisible();
    await page.getByTestId("shop-buy-sleeping-cat").click();
    await expect(page.getByTestId("decor-sleeping-cat")).toBeVisible();
    await expect(page.locator('[data-testid^="decor-"]')).toHaveCount(3);

    const mainButton = await boxOf(page.getByTestId("main-button"));
    const slot = await attachedBoxOf(page.getByTestId("click-status"));
    expect(Math.abs(slot.width - 160)).toBeLessThanOrEqual(1);
    expect(Math.abs(slot.height - 64)).toBeLessThanOrEqual(1);
    expect(Math.abs(slot.x - (mainButton.x + mainButton.width + 24))).toBeLessThanOrEqual(1);

    for (const id of ["decor-hydraulic-press", "decor-lava-lamp", "decor-sleeping-cat"]) {
      const box = await boxOf(page.getByTestId(id));
      expect(strictlyOverlap(box, slot), `${id} overlaps the click-status slot`).toBe(false);
    }
  });
});
