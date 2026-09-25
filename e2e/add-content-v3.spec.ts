import { expect, test, type Locator, type Page } from "@playwright/test";
import { compositeOver, contrastRatio, lastShadowColor, parseCssColor } from "@/lib/ui/contrast";
import { buildEmbedUrl, getVideoEntry } from "@/lib/game/videos";

// OpenSpec change add-content-v3 — one describe per capability (achievements, video-decor,
// button-skins, page-decor, shop, game-persistence, reduced-motion), one test per [e2e] scenario
// marked "new" or living in a new capability. Selection is by data-testid, role or aria-*/data-*
// only (design D22). Notation (design.md): FRESH, S({...}) with merged `helpers` / `levels`,
// S3({...}), T0, TR({...}), TF(...), V3(...), V4(...), "the clock is paused" / "the clock runs
// N ms" / "the random hook is fixed to r" as in add-upgrades-v2 design D19. Viewport 1280 × 720,
// Ukrainian by default, reducedMotion "no-preference" unless a test says otherwise. Every test
// installs the embed-host route stub of design D9 in `beforeEach`, before the first navigation, so
// no test ever loads a real third-party iframe.

const SAVE_KEY = "dopamine-clicker:save";
const TROPHIES_KEY = "dopamine-clicker:trophies";
const TROPHIES_BACKUP_KEY = "dopamine-clicker:trophies:bad";
const THEME_KEY = "dopamine-clicker:theme";

// ---------------------------------------------------------------------------
// Game state (v4) — S({...}), S3({...})
// ---------------------------------------------------------------------------

type Position = { x: number; y: number };
type PlacedEntry = { id: string; position: Position | null };
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
  decor: PlacedEntry[];
  videos: PlacedEntry[];
  upgrades: string[];
  helpers: Helpers;
  levels: Levels;
};
/** Stage 3 (v3) payload: `S({...})` without `videos` (design.md notation `S3`). */
type SaveStateV3 = Omit<SaveState, "videos">;
type Box = { x: number; y: number; width: number; height: number };

type StateOverrides = Partial<Omit<SaveState, "helpers" | "levels">> & {
  helpers?: Partial<Helpers>;
  levels?: Partial<Levels>;
};

/**
 * v4 `FRESH` with the listed top-level fields replaced, except `helpers` and `levels`, which are
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
    videos: [],
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

type StateOverridesV3 = Partial<Omit<SaveStateV3, "helpers" | "levels">> & {
  helpers?: Partial<Helpers>;
  levels?: Partial<Levels>;
};

/** The Stage 3 (v3) payload: `S({...})` without `videos` (design.md notation `S3`). */
function S3(overrides: StateOverridesV3 = {}): SaveStateV3 {
  const full = S(overrides);
  return {
    balance: full.balance,
    totalClicks: full.totalClicks,
    ownedSkins: full.ownedSkins,
    enabledSkins: full.enabledSkins,
    material: full.material,
    decor: full.decor,
    upgrades: full.upgrades,
    helpers: full.helpers,
    levels: full.levels,
  };
}

function V3(state: SaveStateV3): string {
  return JSON.stringify({ version: 3, state });
}

function V4(state: SaveState): string {
  return JSON.stringify({ version: 4, state });
}

// ---------------------------------------------------------------------------
// Trophy file — T0, TR({...}), TF(...)
// ---------------------------------------------------------------------------

type TrophyStats = { crits: number; goldenCaught: number; maxComboLevel: number; resets: number };
type Trophies = { unlocked: string[]; stats: TrophyStats };

const ST0: TrophyStats = { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 };

/** `createInitialTrophies()`: `{ unlocked: [], stats: ST0 }`, a new object each call. */
function T0(): Trophies {
  return { unlocked: [], stats: { ...ST0 } };
}

type TrophyOverrides = { unlocked?: string[]; stats?: Partial<TrophyStats> };

/** `T0` with the listed fields replaced (`stats` shallow-merged into its `T0` defaults). */
function TR(overrides: TrophyOverrides = {}): Trophies {
  const base = T0();
  return {
    unlocked: overrides.unlocked ?? base.unlocked,
    stats: { ...base.stats, ...overrides.stats },
  };
}

/** The JSON string `{"version":1,"trophies":<x as JSON>}`. */
function TF(trophies: Trophies): string {
  return JSON.stringify({ version: 1, trophies });
}

/** The 30 catalog ids in display / storage order (design D10). */
const ACHIEVEMENT_IDS = [
  "first-click",
  "clicks-100",
  "clicks-1000",
  "clicks-10000",
  "clicks-100000",
  "balance-1000",
  "balance-50000",
  "first-purchase",
  "purchases-10",
  "purchases-25",
  "skins-3",
  "skins-all",
  "gold-equipped",
  "first-decor",
  "decor-all",
  "cat-nap",
  "first-video",
  "videos-all",
  "first-helper",
  "helpers-10",
  "factory-owner",
  "first-crit",
  "crits-100",
  "combo-5",
  "combo-max",
  "first-golden",
  "golden-10",
  "reset-once",
  "achievements-10",
  "achievements-all",
];

// ---------------------------------------------------------------------------
// Storage seeding
// ---------------------------------------------------------------------------

/**
 * Seeds localStorage before the first navigation. Same guard as e2e/add-foundation.spec.ts:
 * `addInitScript` re-runs on every reload, so a `sessionStorage` flag makes seeding one-shot. All
 * keys of one test are seeded through a single call (the guard would silently skip a second one).
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

/** Seeds `V3(state)` under the save key (plus optional extra keys, e.g. the trophy file). */
async function seedV3(page: Page, state: SaveStateV3, extra: Record<string, string> = {}) {
  await seedStorage(page, { [SAVE_KEY]: V3(state), ...extra });
}

/** Seeds `V4(state)` under the save key (plus optional extra keys, e.g. the trophy file). */
async function seedV4(page: Page, state: SaveState, extra: Record<string, string> = {}) {
  await seedStorage(page, { [SAVE_KEY]: V4(state), ...extra });
}

/** Seeds `TF(trophies)` under the trophy key (plus optional extra keys). */
async function seedTrophies(page: Page, trophies: Trophies, extra: Record<string, string> = {}) {
  await seedStorage(page, { [TROPHIES_KEY]: TF(trophies), ...extra });
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

async function readRawTrophies(page: Page): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), TROPHIES_KEY);
}

/** Reads and parses `dopamine-clicker:trophies` (design D12). */
async function readTrophies(page: Page): Promise<{ version: number; trophies: Trophies } | null> {
  const raw = await readRawTrophies(page);
  return raw === null ? null : JSON.parse(raw);
}

/**
 * Fixes the page random source before any page script runs (design D19): every draw of the page
 * returns `value`. `Math.random` itself stays untouched.
 */
async function fixRandom(page: Page, value: number) {
  await page.addInitScript((r) => {
    globalThis.__dcRandom = () => r;
  }, value);
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

async function normalizedText(locator: Locator): Promise<string> {
  const text = await locator.textContent();
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Strict overlap of two boxes (touching edges is not an overlap) — same rule as `rectsOverlap`. */
function strictlyOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Whether `inner` sits inside `outer`, both ways rounded to `tolerance` px. */
function boxInside(inner: Box, outer: Box, tolerance = 1): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
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

async function waitForLoaded(page: Page) {
  await expect(page.getByTestId("main-button")).toBeEnabled();
}

/**
 * Pauses the fake clock (design D19/D20). `pauseAt` needs a time not in the past; the page's own
 * `Date.now()` plus a margin is used. The jump fires each pending timer at most once.
 */
async function pauseClock(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
}

/** Parses a computed CSS colour string, throwing if it is not one of the recognized formats. */
function mustParse(value: string) {
  const parsed = parseCssColor(value);
  if (!parsed) throw new Error(`unparseable colour: ${value}`);
  return parsed;
}

// ---------------------------------------------------------------------------
// Sleeping cat (design D15)
// ---------------------------------------------------------------------------

const CAT_PARTS = [
  "cat-tail",
  "cat-body",
  "cat-head",
  "cat-ear-left",
  "cat-ear-right",
  "cat-eye-left",
  "cat-eye-right",
  "cat-nose",
];

async function readCatBoxes(root: Locator): Promise<Record<string, Box>> {
  const boxes: Record<string, Box> = {};
  for (const part of CAT_PARTS) {
    boxes[part] = await attachedBoxOf(root.getByTestId(part));
  }
  return boxes;
}

/** Every geometric invariant of design D15 / page-decor "Sleeping cat silhouette". */
function expectCatSilhouette(boxes: Record<string, Box>) {
  const body = boxes["cat-body"];
  const head = boxes["cat-head"];
  const earLeft = boxes["cat-ear-left"];
  const earRight = boxes["cat-ear-right"];
  const eyeLeft = boxes["cat-eye-left"];
  const eyeRight = boxes["cat-eye-right"];
  const nose = boxes["cat-nose"];
  const tail = boxes["cat-tail"];
  const centerX = (b: Box) => b.x + b.width / 2;
  const centerY = (b: Box) => b.y + b.height / 2;

  expect(body.width, "body width").toBeGreaterThanOrEqual(72);
  expect(body.height, "body height").toBeGreaterThanOrEqual(28);

  expect(centerY(head), "head above body").toBeLessThan(centerY(body));
  expect(centerX(head), "head on the right end").toBeGreaterThan(
    centerX(body) + 0.15 * body.width,
  );

  expect(head.width, "head width lower bound").toBeGreaterThanOrEqual(24);
  expect(head.width, "head width upper bound").toBeLessThanOrEqual(60);

  expect(earLeft.y, "left ear above head").toBeLessThan(head.y);
  expect(earRight.y, "right ear above head").toBeLessThan(head.y);
  for (const ear of [earLeft, earRight]) {
    expect(centerX(ear)).toBeGreaterThanOrEqual(head.x - 4);
    expect(centerX(ear)).toBeLessThanOrEqual(head.x + head.width + 4);
  }
  expect(centerX(earLeft)).toBeLessThan(centerX(earRight));

  expect(boxInside(eyeLeft, head), "left eye inside head").toBe(true);
  expect(boxInside(eyeRight, head), "right eye inside head").toBe(true);
  expect(centerX(eyeLeft)).toBeLessThan(centerX(eyeRight));

  expect(centerY(nose)).toBeGreaterThan(centerY(eyeLeft));
  expect(centerY(nose)).toBeGreaterThan(centerY(eyeRight));
  expect(centerX(nose)).toBeGreaterThanOrEqual(centerX(eyeLeft) - 4);
  expect(centerX(nose)).toBeLessThanOrEqual(centerX(eyeRight) + 4);

  expect(tail.x, "tail past the body").toBeLessThan(body.x);
  expect(tail.width, "tail width").toBeGreaterThanOrEqual(0.25 * body.width);
}

/** Seeds a single sleeping cat at a fixed spot and loads the page. */
async function seedCat(page: Page, extra: Record<string, string> = {}) {
  await seedV4(
    page,
    S({ totalClicks: 75, decor: [{ id: "sleeping-cat", position: { x: 0.05, y: 0.1 } }] }),
    extra,
  );
  await page.goto("/");
  await waitForLoaded(page);
}

// ---------------------------------------------------------------------------
// Video embed stub (design D9) — installed in beforeEach, before the first navigation
// ---------------------------------------------------------------------------

const EMBED_PATTERN = "**://*.youtube-nocookie.com/**";
const STUB_BODY = '<!doctype html><title>stub</title><body data-testid="video-stub">';

interface EmbedStub {
  count(): number;
}

/** Installs the Playwright route stub of design D9 with a request counter. */
async function stubEmbeds(page: Page): Promise<EmbedStub> {
  let calls = 0;
  await page.route(EMBED_PATTERN, (route) => {
    calls += 1;
    return route.fulfill({ status: 200, contentType: "text/html", body: STUB_BODY });
  });
  return { count: () => calls };
}

/** Overrides the default stub with one that aborts every request (offline scenarios, design D9). */
async function abortEmbeds(page: Page): Promise<EmbedStub> {
  let calls = 0;
  await page.route(EMBED_PATTERN, (route) => {
    calls += 1;
    return route.abort("failed");
  });
  return { count: () => calls };
}

/** Reassigned by `beforeEach`; reassigned again by a test that needs `abortEmbeds` instead. */
let embedStub: EmbedStub;

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: "no-preference" });

test.beforeEach(async ({ page }) => {
  embedStub = await stubEmbeds(page);
});

// ---------------------------------------------------------------------------
// achievements
// ---------------------------------------------------------------------------

test.describe("achievements", () => {
  test("A crit writes the trophy file, not the save", async ({ page }) => {
    await page.clock.install();
    await fixRandom(page, 0.01);
    await seedV4(page, S({ balance: 0, totalClicks: 200, levels: { crit: 1 } }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("10");

    await expect.poll(async () => (await readTrophies(page))?.trophies.stats.crits).toBe(1);
    await expect
      .poll(async () => (await readTrophies(page))?.trophies.unlocked.includes("first-crit"))
      .toBe(true);

    await expect
      .poll(() => readSave(page))
      .toEqual({ version: 4, state: S({ balance: 10, totalClicks: 201, levels: { crit: 1 } }) });
  });

  test("The first click shows one toast", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("main-button").click();
    const toast = page.getByTestId("achievement-toast");
    await expect(toast).toHaveCount(1);
    await expect(toast).toHaveText("Досягнення: Перший клік");

    await expect
      .poll(() => readTrophies(page))
      .toEqual({ version: 1, trophies: TR({ unlocked: ["first-click"] }) });

    await page.clock.runFor(4000);
    await expect(toast).toHaveCount(0);
  });

  test("Two unlocks queue instead of stacking", async ({ page }) => {
    await page.clock.install();
    await seedV4(page, S({ balance: 999, totalClicks: 99 }), {
      [TROPHIES_KEY]: TF(TR({ unlocked: ["first-click"] })),
    });
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("main-button").click();
    await expect.poll(() => normalizedText(page.getByTestId("balance"))).toBe("1 000");
    const toast = page.getByTestId("achievement-toast");
    await expect(toast).toHaveCount(1);
    await expect(toast).toHaveText("Досягнення: Сотня");

    await page.clock.runFor(4000);
    await expect(toast).toHaveCount(0);

    await page.clock.runFor(300);
    await expect(toast).toHaveCount(1);
    await expect(toast).toHaveText("Досягнення: Скарбничка");

    await page.clock.runFor(4300);
    await expect(toast).toHaveCount(0);
    await expect
      .poll(async () => (await readTrophies(page))?.trophies.unlocked)
      .toEqual(["first-click", "clicks-100", "balance-1000"]);
  });

  test("A loaded save unlocks silently", async ({ page }) => {
    await page.clock.install();
    await seedV4(page, S({ balance: 1500, totalClicks: 1500 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.clock.runFor(1000);
    await expect(page.getByTestId("achievement-toast")).toHaveCount(0);

    await expect
      .poll(() => readTrophies(page))
      .toEqual({
        version: 1,
        trophies: {
          unlocked: ["first-click", "clicks-100", "clicks-1000", "balance-1000"],
          stats: ST0,
        },
      });
  });

  test("Panel lists all thirty with their state", async ({ page }) => {
    await seedV4(
      page,
      S({
        balance: 0,
        totalClicks: 120,
        decor: [{ id: "sleeping-cat", position: { x: 0.1, y: 0.1 } }],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await page.getByTestId("achievements").click();

    const dialog = page.getByTestId("achievements-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-testid="achievements-list"] > li')).toHaveCount(30);
    await expect(page.getByTestId("achievements-count")).toHaveText("Відкрито 5 з 30");

    const firstClick = page.getByTestId("achievement-first-click");
    await expect(firstClick).toHaveAttribute("data-unlocked", "true");
    await expect(firstClick).toContainText("Перший клік");
    await expect(firstClick).toContainText("Зроби один клік");

    for (const id of ["achievement-cat-nap", "achievement-first-purchase", "achievement-clicks-100"]) {
      await expect(page.getByTestId(id)).toHaveAttribute("data-unlocked", "true");
    }

    await expect(page.getByTestId("achievement-clicks-1000")).toHaveAttribute(
      "data-unlocked",
      "false",
    );
    await expect
      .poll(() => normalizedText(page.getByTestId("achievement-progress-clicks-1000")))
      .toBe("120 / 1 000");
    await expect(page.getByTestId("achievement-progress-first-click")).toHaveCount(0);

    const ids = await page
      .locator('[data-testid="achievements-list"] > li')
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    expect(ids).toEqual(ACHIEVEMENT_IDS.map((id) => `achievement-${id}`));
  });

  test("Progress is capped at the goal", async ({ page }) => {
    await seedV4(page, S({ balance: 0, totalClicks: 5000 }));
    await page.goto("/");
    await waitForLoaded(page);
    await page.getByTestId("achievements").click();

    await expect
      .poll(() => normalizedText(page.getByTestId("achievement-progress-clicks-1000")))
      .toBe("1 000 / 1 000");
    await expect(page.getByTestId("achievement-clicks-1000")).toHaveAttribute(
      "data-unlocked",
      "true",
    );
    await expect
      .poll(() => normalizedText(page.getByTestId("achievement-progress-clicks-10000")))
      .toBe("5 000 / 10 000");
  });

  test("Dialog is accessible and Escape closes it", async ({ page }) => {
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("achievements").click();
    const dialog = page.getByTestId("achievements-dialog");
    await expect(dialog).toHaveRole("dialog");
    await expect(dialog).toHaveAccessibleName("Досягнення");
    await expect(page.getByTestId("achievements-close")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();

    await page.getByTestId("achievements").click();
    await page.getByTestId("achievements-close").click();
    await expect(dialog).not.toBeVisible();
  });

  test("Panel is localized", async ({ page }) => {
    await page.goto("/");
    await waitForLoaded(page);
    await page.getByTestId("lang-toggle").click();

    await page.getByTestId("achievements").click();
    await expect(page.getByTestId("achievements-count")).toHaveText("0 of 30 unlocked");
    const firstClick = page.getByTestId("achievement-first-click");
    await expect(firstClick).toContainText("First click");
    await expect(firstClick).toContainText("Make one click");
  });

  test("A full trophy case earns nothing", async ({ page }) => {
    await page.clock.install();
    await seedV4(page, S({ balance: 7, totalClicks: 200000 }), {
      [TROPHIES_KEY]: TF(
        TR({
          unlocked: ACHIEVEMENT_IDS,
          stats: { crits: 100, goldenCaught: 10, maxComboLevel: 10, resets: 1 },
        }),
      ),
    });
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("8");
    await expect(page.getByTestId("achievement-toast")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// video-decor
// ---------------------------------------------------------------------------

const VIDEO_NEIGHBOURS = [
  "main-button",
  "balance",
  "shop",
  "theme-toggle",
  "lang-toggle",
  "achievements",
  "reset",
  "click-status",
];

test.describe("video-decor", () => {
  test("Buying a video places it clear of the UI", async ({ page }) => {
    await seedV4(page, S({ balance: 5000, totalClicks: 3000 }));
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("shop-buy-video-runner").click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    const box = await boxOf(page.getByTestId("video-runner"));
    expect(Math.abs(box.width - 384)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.height - 216)).toBeLessThanOrEqual(1);
    await expectNoOverlapWith(page, box, VIDEO_NEIGHBOURS);

    const state = await readSavedState(page);
    expect(state?.videos).toHaveLength(1);
    const placed = state!.videos[0];
    expect(placed.id).toBe("video-runner");
    if (!placed.position) throw new Error("video was not placed");
    expect(Math.abs(placed.position.x * 1280 - box.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(placed.position.y * 720 - box.y)).toBeLessThanOrEqual(1);

    await expect(page.getByTestId("shop-owned-video-runner")).toHaveText("Куплено");
  });

  test("Position survives reload", async ({ page }) => {
    await seedV4(page, S({ balance: 5000, totalClicks: 3000 }));
    await page.goto("/");
    await waitForLoaded(page);
    await page.getByTestId("shop-buy-video-runner").click();
    const before = await boxOf(page.getByTestId("video-runner"));

    await page.reload();
    await waitForLoaded(page);
    const after = await boxOf(page.getByTestId("video-runner"));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test("Videos and decor never overlap each other", async ({ page }) => {
    await seedV4(
      page,
      S({
        balance: 12600,
        totalClicks: 6000,
        decor: [{ id: "sleeping-cat", position: { x: 0.02, y: 0.6 } }],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("shop-buy-video-runner").click();
    await page.getByTestId("shop-buy-video-parkour").click();

    const runner = await boxOf(page.getByTestId("video-runner"));
    const parkour = await boxOf(page.getByTestId("video-parkour"));
    const cat = await boxOf(page.getByTestId("decor-sleeping-cat"));
    expect(strictlyOverlap(runner, parkour)).toBe(false);
    expect(strictlyOverlap(runner, cat)).toBe(false);
    expect(strictlyOverlap(parkour, cat)).toBe(false);
  });

  test("Seeded position is rendered with its label", async ({ page }) => {
    await seedV4(
      page,
      S({ totalClicks: 6000, videos: [{ id: "video-soap", position: { x: 0.8, y: 0.1 } }] }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    const video = page.getByTestId("video-soap");
    const box = await boxOf(video);
    expect(Math.abs(box.x - 1024)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - 72)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - 384)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.height - 216)).toBeLessThanOrEqual(1);
    await expect(video).toHaveRole("group");
    await expect(video).toHaveAccessibleName("Відео: Різання води");
  });

  test("A video never blocks the main button", async ({ page }) => {
    await seedV4(
      page,
      S({
        balance: 5,
        totalClicks: 6000,
        videos: [{ id: "video-soap", position: { x: 0.45, y: 0.45 } }],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("main-button").click();
    await expect(page.getByTestId("balance")).toHaveText("6");
  });

  test("A placed video mounts a muted looping frame", async ({ page }) => {
    await seedV4(
      page,
      S({ totalClicks: 6000, videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }] }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    const video = page.getByTestId("video-runner");
    await expect(video).toHaveAttribute("data-video-state", "playing");

    const frame = video.getByTestId("video-frame");
    await expect(frame).toHaveAttribute("src", buildEmbedUrl(getVideoEntry("video-runner")));
    await expect(frame).toHaveAttribute("allow", /autoplay/);
    await expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    await expect(frame).toHaveAttribute("loading", "lazy");
    await expect(frame).toHaveAttribute("tabindex", "-1");

    expect(embedStub.count()).toBe(1);
  });

  test("Every placed video mounts a frame", async ({ page }) => {
    await seedV4(
      page,
      S({
        totalClicks: 30000,
        videos: [
          { id: "video-runner", position: { x: 0.02, y: 0.02 } },
          { id: "video-parkour", position: { x: 0.3, y: 0.02 } },
          { id: "video-soap", position: { x: 0.58, y: 0.02 } },
          { id: "video-slime", position: { x: 0.02, y: 0.8 } },
          { id: "video-rain", position: { x: 0.75, y: 0.8 } },
        ],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    await expect(page.getByTestId("video-frame")).toHaveCount(5);
    for (const id of ["video-runner", "video-parkour", "video-soap", "video-slime", "video-rain"]) {
      await expect(page.getByTestId(id).getByTestId("video-frame")).toHaveCount(1);
    }
  });

  test("No network falls back to the placeholder", async ({ page }) => {
    embedStub = await abortEmbeds(page);
    // An aborted request still fires `load` on the iframe's error page, so the page cannot tell it
    // failed; navigator.onLine is the signal the app reacts to (design D7). Faking it in the page
    // keeps localhost reachable, which context.setOffline would not.
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "onLine", { get: () => false, configurable: true });
    });
    await page.clock.install();
    await seedV4(
      page,
      S({ totalClicks: 6000, videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }] }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.clock.runFor(5000);
    const video = page.getByTestId("video-runner");
    await expect(video).toHaveAttribute("data-video-state", "offline");
    await expect(video.locator("iframe")).toHaveCount(0);
    const placeholder = video.getByTestId("video-placeholder");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveText("Відео недоступне без мережі");

    const mainButton = page.getByTestId("main-button");
    await expect(mainButton).toBeEnabled();
    await mainButton.click();
    await expect(page.getByTestId("balance")).toHaveText("1");
  });

  test("Inactive videos cost no request", async ({ page }) => {
    await page.clock.install();
    await seedV4(
      page,
      S({
        totalClicks: 30000,
        videos: [
          { id: "video-runner", position: { x: 0.02, y: 0.02 } },
          { id: "video-parkour", position: { x: 0.3, y: 0.02 } },
          { id: "video-soap", position: { x: 0.58, y: 0.02 } },
          { id: "video-slime", position: { x: 0.02, y: 0.8 } },
          { id: "video-rain", position: { x: 0.75, y: 0.8 } },
        ],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.clock.runFor(2000);
    expect(embedStub.count()).toBe(5);
  });

  test("No unstubbed external request is made", async ({ page }) => {
    const urls: string[] = [];
    page.on("request", (req) => urls.push(req.url()));

    await page.clock.install();
    await seedV4(
      page,
      S({
        totalClicks: 30000,
        videos: [
          { id: "video-runner", position: { x: 0.02, y: 0.02 } },
          { id: "video-parkour", position: { x: 0.3, y: 0.02 } },
          { id: "video-soap", position: { x: 0.58, y: 0.02 } },
        ],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("main-button").click();
    await page.clock.runFor(2000);

    for (const url of urls) {
      const host = new URL(url).hostname;
      expect(host === "localhost" || host === "www.youtube-nocookie.com", url).toBe(true);
    }
    const embedRequests = urls.filter((url) => new URL(url).hostname === "www.youtube-nocookie.com");
    expect(embedStub.count()).toBe(embedRequests.length);
  });
});

// ---------------------------------------------------------------------------
// button-skins (only the tests new to this change; the rest stay in add-shop-v1.spec.ts)
// ---------------------------------------------------------------------------

test.describe("button-skins", () => {
  test("Soft shadow is visible in both themes", async ({ page }) => {
    await seedV4(page, S({ totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }), {
      [THEME_KEY]: "dark",
    });
    await page.goto("/");
    await waitForLoaded(page);
    await page.mouse.move(0, 0);

    const mainButton = page.getByTestId("main-button");
    const readShadow = () => mainButton.evaluate((el) => getComputedStyle(el).boxShadow);
    const readBodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const shadowDark = await readShadow();
    const bgDark = mustParse(await readBodyBg());
    expect(shadowDark).not.toBe("none");
    const darkColor = lastShadowColor(shadowDark);
    expect(darkColor).not.toBeNull();
    expect(darkColor!.a).toBeGreaterThanOrEqual(0.25);
    expect(contrastRatio(compositeOver(darkColor!, bgDark), bgDark)).toBeGreaterThanOrEqual(2.0);

    await page.getByTestId("skin-toggle-soft-shadow").click();
    const shadowOff = await readShadow();
    expect(shadowOff).not.toBe(shadowDark);

    await page.getByTestId("skin-toggle-soft-shadow").click();
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const shadowLight = await readShadow();
    const bgLight = mustParse(await readBodyBg());
    expect(shadowLight).not.toBe(shadowDark);
    expect(shadowLight).not.toBe("none");
    const lightColor = lastShadowColor(shadowLight);
    expect(lightColor).not.toBeNull();
    expect(lightColor!.a).toBeGreaterThanOrEqual(0.25);
    expect(contrastRatio(compositeOver(lightColor!, bgLight), bgLight)).toBeGreaterThanOrEqual(2.0);
  });

  test("Floating number is readable in both themes", async ({ page }) => {
    await page.clock.install();
    await seedV4(
      page,
      S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"] }),
      { [THEME_KEY]: "dark" },
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    const mainButton = page.getByTestId("main-button");
    const box = await boxOf(mainButton);
    const floating = page.getByTestId("floating-number").first();
    const readTriple = async () => ({
      color: await floating.evaluate((el) => getComputedStyle(el).color),
      bg: await floating.evaluate((el) => getComputedStyle(el).backgroundColor),
      buttonBg: await mainButton.evaluate((el) => getComputedStyle(el).backgroundColor),
    });

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const dark = await readTriple();
    const dParsedBg = mustParse(dark.bg);
    expect(dParsedBg.a).toBeGreaterThanOrEqual(0.85);
    expect(dark.color).not.toBe(dark.buttonBg);
    expect(
      contrastRatio(mustParse(dark.color), compositeOver(dParsedBg, mustParse(dark.buttonBg))),
    ).toBeGreaterThanOrEqual(4.5);

    await page.clock.runFor(1500);
    await page.getByTestId("theme-toggle").click();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const light = await readTriple();
    const lParsedBg = mustParse(light.bg);
    expect(lParsedBg.a).toBeGreaterThanOrEqual(0.85);
    expect(light.color).not.toBe(light.buttonBg);
    expect(
      contrastRatio(mustParse(light.color), compositeOver(lParsedBg, mustParse(light.buttonBg))),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("Floating number is painted above the button", async ({ page }) => {
    await page.clock.install();
    await seedV4(page, S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"] }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    const mainButton = page.getByTestId("main-button");
    const box = await boxOf(mainButton);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const floating = page.getByTestId("floating-number").first();
    await expect(floating).toHaveCSS("position", "fixed");
    await expect(floating).toHaveCSS("z-index", "60");

    const precedes = await floating.evaluate((el) => {
      const main = document.querySelector('[data-testid="main-button"]')!;
      return (
        el.parentElement === document.body &&
        (el.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
      );
    });
    expect(precedes).toBe(true);

    expect(await page.locator("main").evaluate((el) => getComputedStyle(el).zIndex)).toBe("auto");
    expect(await page.getByTestId("shake-layer").evaluate((el) => getComputedStyle(el).zIndex)).toBe(
      "auto",
    );

    const floatingBox = await boxOf(floating);
    expect(strictlyOverlap(floatingBox, box)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// page-decor (only the tests new to this change)
// ---------------------------------------------------------------------------

test.describe("page-decor", () => {
  test("Decor avoids the achievements button and placed videos", async ({ page }) => {
    await seedV4(
      page,
      S({
        balance: 1800,
        totalClicks: 30000,
        videos: [{ id: "video-runner", position: { x: 0.02, y: 0.55 } }],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("shop-buy-hydraulic-press").click();
    await page.getByTestId("shop-buy-lava-lamp").click();
    await page.getByTestId("shop-buy-sleeping-cat").click();

    const achievements = page.getByTestId("achievements");
    await expect(achievements).toBeVisible();
    const achievementsBox = await boxOf(achievements);
    const clickStatusBox = await attachedBoxOf(page.getByTestId("click-status"));
    const videoBox = await boxOf(page.getByTestId("video-runner"));

    for (const id of ["decor-hydraulic-press", "decor-lava-lamp", "decor-sleeping-cat"]) {
      const box = await boxOf(page.getByTestId(id));
      expect(strictlyOverlap(box, achievementsBox), `${id} overlaps achievements`).toBe(false);
      expect(strictlyOverlap(box, clickStatusBox), `${id} overlaps click-status`).toBe(false);
      expect(strictlyOverlap(box, videoBox), `${id} overlaps video-runner`).toBe(false);
    }
  });

  test("The cat has all eight parts inside its box", async ({ page }) => {
    await seedCat(page);

    const root = page.getByTestId("decor-sleeping-cat");
    const rootBox = await boxOf(root);
    expect(Math.abs(rootBox.width - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(rootBox.height - 80)).toBeLessThanOrEqual(1);
    await expect(root).toHaveRole("img");
    await expect(root).toHaveAccessibleName("Сплячий кіт");

    const svg = root.getByTestId("cat-svg");
    await expect(svg).toBeAttached();
    await expect(svg).toHaveAttribute("aria-hidden", "true");

    for (const part of CAT_PARTS) {
      const locator = root.getByTestId(part);
      await expect(locator).toHaveCount(1);
      const box = await attachedBoxOf(locator);
      expect(boxInside(box, rootBox), `${part} inside root`).toBe(true);
    }
  });

  test("The silhouette reads as a cat", async ({ page }) => {
    await seedCat(page);
    const boxes = await readCatBoxes(page.getByTestId("decor-sleeping-cat"));
    expectCatSilhouette(boxes);
  });

  test("The cat breathes and twitches its ears", async ({ page }) => {
    await seedCat(page);
    const root = page.getByTestId("decor-sleeping-cat");

    expect(await animationName(root.getByTestId("cat-body"))).toBe("cat-breathe");
    expect(await animationName(root.getByTestId("cat-ear-left"))).toBe("cat-ear-twitch");
    expect(await animationName(root.getByTestId("cat-ear-right"))).toBe("cat-ear-twitch");
    expect(await animationName(root.getByTestId("cat-tail"))).toBe("cat-tail-sway");
  });
});

// ---------------------------------------------------------------------------
// shop (only the tests new to this change)
// ---------------------------------------------------------------------------

test.describe("shop", () => {
  test("The video category appears in the shop", async ({ page }) => {
    await seedV4(page, S({ balance: 0, totalClicks: 1499 }));
    await page.goto("/");
    await waitForLoaded(page);

    await expect(page.getByTestId("shop-category-video")).toHaveCount(0);
    await expect(page.getByTestId("shop-item-video-music")).toHaveCount(0);

    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [SAVE_KEY, V4(S({ balance: 0, totalClicks: 4500 }))] as const,
    );
    await page.reload();
    await waitForLoaded(page);

    const category = page.getByTestId("shop-category-video");
    await expect(category).toBeVisible();
    await expect(category).toHaveText("Відео");

    const ids = await page
      .locator('[data-testid^="shop-item-video-"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    expect(ids).toEqual([
      "shop-item-video-music",
      "shop-item-video-runner",
      "shop-item-video-parkour",
    ]);

    const buy = page.getByTestId("shop-buy-video-runner");
    await expect(buy).toBeDisabled();
    await expect.poll(() => normalizedText(buy)).toBe("Купити за 5 000");
  });

  test("Buying a video marks it owned", async ({ page }) => {
    await seedV4(page, S({ balance: 5000, totalClicks: 3000 }));
    await page.goto("/");
    await waitForLoaded(page);

    await page.getByTestId("shop-buy-video-runner").click();
    await expect(page.getByTestId("balance")).toHaveText("0");
    await expect(page.getByTestId("shop-buy-video-runner")).toHaveCount(0);
    await expect(page.getByTestId("shop-owned-video-runner")).toHaveText("Куплено");

    const state = await readSavedState(page);
    expect(state?.videos).toHaveLength(1);
    const placed = state!.videos[0];
    expect(placed.id).toBe("video-runner");
    if (!placed.position) throw new Error("video was not placed");
    expect(placed.position.x).toBeGreaterThanOrEqual(0);
    expect(placed.position.x).toBeLessThanOrEqual(1);
    expect(placed.position.y).toBeGreaterThanOrEqual(0);
    expect(placed.position.y).toBeLessThanOrEqual(1);
  });

  test("Video name and description are localized", async ({ page }) => {
    await seedV4(page, S({ balance: 0, totalClicks: 30000 }));
    await page.goto("/");
    await waitForLoaded(page);

    const item = page.getByTestId("shop-item-video-soap");
    await expect(item).toContainText("Різання води");
    await expect(item).toContainText("Ніж ріже воду");

    await page.getByTestId("lang-toggle").click();
    await expect(item).toContainText("Cutting water");
    await expect(item).toContainText("A knife cutting through water");
    await expect(page.getByTestId("shop-category-video")).toHaveText("Video");
  });
});

// ---------------------------------------------------------------------------
// game-persistence (only the tests new to this change)
// ---------------------------------------------------------------------------

test.describe("game-persistence", () => {
  test("Catching a golden button writes only the trophy file", async ({ page }) => {
    await page.clock.install();
    await fixRandom(page, 0.75);
    await seedV4(page, S({ balance: 1000, totalClicks: 9000 }));
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("shop-buy-golden-button").click();
    await page.clock.runFor(75_000);
    const save0 = await readRawSave(page);

    await page.getByTestId("golden-button").click();
    await expect(page.getByTestId("golden-bonus")).toBeVisible();

    await expect
      .poll(async () => (await readTrophies(page))?.trophies.stats.goldenCaught)
      .toBe(1);
    await expect
      .poll(async () => (await readTrophies(page))?.trophies.unlocked.includes("first-golden"))
      .toBe(true);
    expect(await readRawSave(page)).toBe(save0);
  });

  test("Reset keeps the trophies and unlocks the reset achievement", async ({ page }) => {
    await page.clock.install();
    await seedTrophies(page, TR({ unlocked: ["first-click", "clicks-100", "clicks-1000"] }), {
      [SAVE_KEY]: V4(S({ balance: 500, totalClicks: 1200 })),
    });
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("reset").click();
    await page.getByTestId("reset-confirm").click();

    await expect(page.getByTestId("balance")).not.toBeVisible();
    await expect.poll(() => readRawSave(page)).toBeNull();
    await expect(page.getByTestId("achievement-toast")).toHaveCount(0);

    await expect
      .poll(async () => (await readTrophies(page))?.trophies.unlocked)
      .toEqual(["first-click", "clicks-100", "clicks-1000", "reset-once"]);
    await expect
      .poll(async () => (await readTrophies(page))?.trophies.stats)
      .toEqual({ crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 1 });

    await page.getByTestId("achievements").click();
    await expect(page.getByTestId("achievements-count")).toHaveText("Відкрито 4 з 30");
    await expect(page.getByTestId("achievement-reset-once")).toHaveAttribute(
      "data-unlocked",
      "true",
    );
    await expect(page.getByTestId("achievement-clicks-1000")).toHaveAttribute(
      "data-unlocked",
      "true",
    );
    await expect
      .poll(() => normalizedText(page.getByTestId("achievement-progress-clicks-1000")))
      .toBe("0 / 1 000");
  });

  test("Stage 3 player continues in Stage 4", async ({ page }) => {
    await page.clock.install();
    await seedV3(
      page,
      S3({
        balance: 40,
        totalClicks: 3000,
        ownedSkins: ["squish"],
        enabledSkins: ["squish"],
        upgrades: ["double-click"],
        helpers: { monkey: 2 },
        levels: { crit: 1 },
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await expect(page.getByTestId("balance")).toHaveText("40");
    await expect(page.getByTestId("skin-toggle-squish")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("shop-level-crit")).toHaveText("Рівень 1 з 3");
    await expect(page.getByTestId("shop-item-video-runner")).toBeVisible();
    await expect(page.getByTestId("achievement-toast")).toHaveCount(0);

    await page.getByTestId("achievements").click();
    await expect(page.getByTestId("achievements-count")).toHaveText("Відкрито 5 з 30");
    for (const id of [
      "achievement-first-click",
      "achievement-clicks-100",
      "achievement-clicks-1000",
      "achievement-first-purchase",
      "achievement-first-helper",
    ]) {
      await expect(page.getByTestId(id)).toHaveAttribute("data-unlocked", "true");
    }
    await page.getByTestId("achievements-close").click();

    await page.getByTestId("main-button").click();
    await expect
      .poll(() => readSave(page))
      .toEqual({
        version: 4,
        state: S({
          balance: 42,
          totalClicks: 3001,
          ownedSkins: ["squish"],
          enabledSkins: ["squish"],
          upgrades: ["double-click"],
          helpers: { monkey: 2 },
          levels: { crit: 1 },
        }),
      });
  });

  test("A corrupted trophy file starts an empty case in the browser", async ({ page }) => {
    await page.clock.install();
    await seedV4(page, S({ balance: 0, totalClicks: 150 }), { [TROPHIES_KEY]: "{not json" });
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("achievements").click();
    await expect(page.getByTestId("achievements-count")).toHaveText("Відкрито 2 з 30");

    expect(await page.evaluate((k) => window.localStorage.getItem(k), TROPHIES_BACKUP_KEY)).toBe(
      "{not json",
    );
    await expect(page.getByTestId("achievement-toast")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// reduced-motion
// ---------------------------------------------------------------------------

test.describe("reduced-motion", () => {
  test("Full motion plays the Stage 4 effects", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await seedV4(
      page,
      S({
        totalClicks: 6000,
        decor: [{ id: "sleeping-cat", position: { x: 0.05, y: 0.6 } }],
        videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }],
      }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("main-button").click();
    const toast = page.getByTestId("achievement-toast");
    await expect(toast).toBeVisible();
    expect(await animationName(toast)).toBe("toast-in");

    expect(await animationName(page.getByTestId("cat-body"))).toBe("cat-breathe");
    expect(await animationName(page.getByTestId("cat-ear-left"))).toBe("cat-ear-twitch");

    const video = page.getByTestId("video-runner");
    await expect(video).toHaveAttribute("data-video-state", "playing");
    await expect(video.getByTestId("video-frame")).toHaveCount(1);
    await expect(video.getByTestId("video-play")).toHaveCount(0);
  });

  test("Reduced motion keeps the toast but stops the animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.getByTestId("main-button").click();
    const toast = page.getByTestId("achievement-toast");
    await expect(toast).toBeVisible();
    await expect(toast).toHaveText("Досягнення: Перший клік");
    expect(await animationName(toast)).toBe("none");

    await page.clock.runFor(4000);
    await expect(toast).toHaveCount(0);
  });

  test("Reduced motion freezes the cat but keeps it visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedCat(page);
    const root = page.getByTestId("decor-sleeping-cat");

    const names = await animationNames(root);
    expect(names.every((n) => n === "none"), names.join(", ")).toBe(true);
    for (const part of CAT_PARTS) {
      await expect(root.getByTestId(part)).toBeVisible();
    }
    expectCatSilhouette(await readCatBoxes(root));
  });

  test("Reduced motion never autoplays a video", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await seedV4(
      page,
      S({ totalClicks: 6000, videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }] }),
    );
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.clock.runFor(2000);
    const video = page.getByTestId("video-runner");
    await expect(video).toHaveAttribute("data-video-state", "idle");
    await expect(video.locator("iframe")).toHaveCount(0);
    expect(embedStub.count()).toBe(0);

    const playButton = video.getByTestId("video-play");
    await expect(playButton).toBeVisible();
    await expect(playButton).toHaveText("Увімкнути відео");

    await playButton.click();
    await expect(video).toHaveAttribute("data-video-state", "playing");
    await expect(video.getByTestId("video-frame")).toHaveCount(1);
    const names = await animationNames(video);
    expect(names.every((n) => n === "none"), names.join(", ")).toBe(true);
  });

  test("Switching to reduced motion live", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await seedV4(page, S({ balance: 999, totalClicks: 99 }), {
      [TROPHIES_KEY]: TF(TR({ unlocked: ["first-click"] })),
    });
    await page.goto("/");
    await waitForLoaded(page);
    await pauseClock(page);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByTestId("main-button").click();
    const toast = page.getByTestId("achievement-toast");
    await expect(toast).toBeVisible();
    expect(await animationName(toast)).toBe("none");
  });
});
