import { expect, test, type Locator, type Page } from "@playwright/test";

// Storage keys — must match lib/game/save.ts and lib/game/preferences.ts (design D1).
const SAVE_KEY = "dopamine-clicker:save";
const SAVE_BACKUP_KEY = "dopamine-clicker:save:bad";
const THEME_KEY = "dopamine-clicker:theme";
const LANG_KEY = "dopamine-clicker:lang";

/**
 * Seeds localStorage before the first navigation via `page.addInitScript`.
 * `addInitScript` re-runs on every navigation, including `page.reload()`, which would
 * re-seed and break reload/persistence tests (design D12) — a `sessionStorage` flag guards
 * against that: it is set once on the first run and checked on every later run.
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

async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

async function normalizedText(locator: Locator): Promise<string> {
  const text = await locator.textContent();
  return (text ?? "").replace(/\s+/g, " ").trim();
}

test.describe("clicker-core", () => {
  test("Clicking in the browser increments the counter", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await mainButton.click();
    await mainButton.click();
    await mainButton.click();
    await expect(page.getByTestId("balance")).toHaveText("3");
  });

  test("Counter hidden before first click, shown after", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    const balance = page.getByTestId("balance");
    await expect(mainButton).toBeVisible();
    await expect(mainButton).toBeEnabled();
    await expect(balance).toBeHidden();
    await mainButton.click();
    await expect(balance).toBeVisible();
    await expect(balance).toHaveText("1");
  });

  test("Button is centered and does not jump", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    const before = await mainButton.boundingBox();
    if (!before) throw new Error("main-button has no bounding box");
    const centerXBefore = before.x + before.width / 2;
    const centerYBefore = before.y + before.height / 2;
    expect(Math.abs(centerXBefore - 640)).toBeLessThanOrEqual(40);
    expect(Math.abs(centerYBefore - 360)).toBeLessThanOrEqual(60);

    await mainButton.click();
    const after = await mainButton.boundingBox();
    if (!after) throw new Error("main-button has no bounding box after click");
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test("Counter above button, switchers top-right", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await mainButton.click();

    const buttonBox = await mainButton.boundingBox();
    const balanceBox = await page.getByTestId("balance").boundingBox();
    if (!buttonBox || !balanceBox) throw new Error("missing bounding box");
    expect(balanceBox.y + balanceBox.height).toBeLessThanOrEqual(buttonBox.y + 0.5);

    const balanceCenterX = balanceBox.x + balanceBox.width / 2;
    const buttonCenterX = buttonBox.x + buttonBox.width / 2;
    expect(Math.abs(balanceCenterX - buttonCenterX)).toBeLessThanOrEqual(40);

    const themeToggleBox = await page.getByTestId("theme-toggle").boundingBox();
    const langToggleBox = await page.getByTestId("lang-toggle").boundingBox();
    if (!themeToggleBox || !langToggleBox) throw new Error("missing toggle bounding box");
    expect(themeToggleBox.x).toBeGreaterThan(640);
    expect(themeToggleBox.y).toBeLessThan(100);
    expect(langToggleBox.x).toBeGreaterThan(640);
    expect(langToggleBox.y).toBeLessThan(100);
  });

  test("Main button is disabled until saved state is loaded", async ({ page }) => {
    await seedStorage(page, {
      [SAVE_KEY]: JSON.stringify({ version: 1, state: { balance: 7, totalClicks: 7 } }),
    });
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    // Playwright's click() auto-waits for the element to become enabled.
    await mainButton.click();
    await expect(page.getByTestId("balance")).toHaveText("8");
  });
});

test.describe("game-persistence", () => {
  test("Corrupted save in the browser", async ({ page }) => {
    await seedStorage(page, { [SAVE_KEY]: "{not json" });
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    const balance = page.getByTestId("balance");
    await expect(mainButton).toBeVisible();
    await expect(mainButton).toBeEnabled();
    await expect(balance).toBeHidden();

    await mainButton.click();
    await expect(balance).toHaveText("1");

    const rawSave = await getLocalStorageItem(page, SAVE_KEY);
    expect(rawSave ? JSON.parse(rawSave) : null).toEqual({
      version: 4,
      state: {
        balance: 1,
        totalClicks: 1,
        ownedSkins: [],
        enabledSkins: [],
        material: "classic",
        decor: [],
        videos: [],
        upgrades: [],
        helpers: { monkey: 0, robot: 0, factory: 0 },
        levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
      },
    });
    expect(await getLocalStorageItem(page, SAVE_BACKUP_KEY)).toBe("{not json");
  });

  test("Reload keeps balance", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    for (let i = 0; i < 5; i++) {
      await mainButton.click();
    }
    await page.reload();
    await expect(page.getByTestId("balance")).toHaveText("5");

    const rawSave = await getLocalStorageItem(page, SAVE_KEY);
    expect(rawSave ? JSON.parse(rawSave) : null).toEqual({
      version: 4,
      state: {
        balance: 5,
        totalClicks: 5,
        ownedSkins: [],
        enabledSkins: [],
        material: "classic",
        decor: [],
        videos: [],
        upgrades: [],
        helpers: { monkey: 0, robot: 0, factory: 0 },
        levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
      },
    });
  });

  test("Seeded save is shown with locale formatting", async ({ page }) => {
    await seedStorage(page, {
      [SAVE_KEY]: JSON.stringify({ version: 1, state: { balance: 1234, totalClicks: 1234 } }),
    });
    await page.goto("/");
    expect(await normalizedText(page.getByTestId("balance"))).toBe("1 234");
  });

  test("Cancel keeps progress", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    for (let i = 0; i < 5; i++) {
      await mainButton.click();
    }
    await page.getByTestId("reset").click();
    await expect(page.getByTestId("reset-dialog")).toBeVisible();
    await expect(page.getByTestId("reset-cancel")).toBeFocused();

    await page.getByTestId("reset-cancel").click();
    await expect(page.getByTestId("reset-dialog")).toBeHidden();
    await expect(page.getByTestId("balance")).toHaveText("5");
  });

  test("Escape cancels", async ({ page }) => {
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await mainButton.click();
    await mainButton.click();
    await page.getByTestId("reset").click();
    await expect(page.getByTestId("reset-dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("reset-dialog")).toBeHidden();
    await expect(page.getByTestId("balance")).toHaveText("2");
  });

  test("Confirm wipes game but keeps theme and language", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("lang-toggle").click();
    await page.getByTestId("theme-toggle").click();
    const savedTheme = await getLocalStorageItem(page, THEME_KEY);
    if (!savedTheme) throw new Error("theme was not saved after toggle");

    const mainButton = page.getByTestId("main-button");
    for (let i = 0; i < 5; i++) {
      await mainButton.click();
    }

    await page.getByTestId("reset").click();
    await page.getByTestId("reset-confirm").click();

    await expect(page.getByTestId("reset-dialog")).toBeHidden();
    await expect(page.getByTestId("balance")).toBeHidden();
    expect(await getLocalStorageItem(page, SAVE_KEY)).toBeNull();
    expect(await getLocalStorageItem(page, LANG_KEY)).toBe("en");
    expect(await getLocalStorageItem(page, THEME_KEY)).toBe(savedTheme);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-theme", savedTheme);

    await page.reload();
    await expect(page.getByTestId("balance")).toBeHidden();
    await expect(mainButton).toHaveText("Click");

    await mainButton.click();
    await expect(page.getByTestId("balance")).toHaveText("1");
  });
});

test.describe("theme", () => {
  test("Default follows system dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await getLocalStorageItem(page, THEME_KEY)).toBeNull();
  });

  test("Default follows system light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("Live system change without saved choice", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("Toggle saves the choice and survives reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await getLocalStorageItem(page, THEME_KEY)).toBe("light");
    await expect(page.getByTestId("theme-toggle")).toHaveAttribute(
      "aria-label",
      "Увімкнути темну тему",
    );

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("Saved choice ignores later system changes", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("Background color differs between themes", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const body = page.locator("body");
    const before = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.getByTestId("theme-toggle").click();
    const after = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(after).not.toBe(before);
  });
});

test.describe("localization", () => {
  test("Ukrainian by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.getByTestId("main-button")).toHaveText("Клік");
    await expect(page.getByTestId("reset")).toHaveText("Скинути прогрес");
    await expect(page.getByTestId("lang-toggle")).toHaveText("УКР");
  });

  test("Switch to English and persist", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("lang-toggle").click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("main-button")).toHaveText("Click");
    await expect(page.getByTestId("reset")).toHaveText("Reset progress");
    await expect(page.getByTestId("lang-toggle")).toHaveText("ENG");
    expect(await getLocalStorageItem(page, LANG_KEY)).toBe("en");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("main-button")).toHaveText("Click");
  });

  test("Switch back to Ukrainian", async ({ page }) => {
    await seedStorage(page, { [LANG_KEY]: "en" });
    await page.goto("/");
    await page.getByTestId("lang-toggle").click();

    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.getByTestId("main-button")).toHaveText("Клік");
    expect(await getLocalStorageItem(page, LANG_KEY)).toBe("uk");
  });

  test("Balance formatting follows language", async ({ page }) => {
    await seedStorage(page, {
      [SAVE_KEY]: JSON.stringify({ version: 1, state: { balance: 1234, totalClicks: 1234 } }),
      [LANG_KEY]: "en",
    });
    await page.goto("/");
    await expect(page.getByTestId("balance")).toHaveText("1,234");

    await page.getByTestId("lang-toggle").click();
    expect(await normalizedText(page.getByTestId("balance"))).toBe("1 234");
  });

  test("Reset dialog is localized", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("lang-toggle").click();
    await page.getByTestId("reset").click();

    await expect(page.getByTestId("reset-confirm")).toHaveText("Reset");
    await expect(page.getByTestId("reset-cancel")).toHaveText("Cancel");
  });
});

test.describe("reduced-motion", () => {
  test("Reduced motion detected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  });

  test("Full motion by default", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  });

  test("Live change", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  });

  test("Full motion has a press transition", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const transitionDuration = await page
      .getByTestId("main-button")
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(transitionDuration).not.toBe("0s");
  });

  test("Reduced motion disables button and counter animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const mainButton = page.getByTestId("main-button");
    await mainButton.click();
    await mainButton.click();
    await expect(page.getByTestId("balance")).toHaveText("2");

    const transitionDuration = await mainButton.evaluate(
      (el) => getComputedStyle(el).transitionDuration,
    );
    expect(transitionDuration).toBe("0s");

    const animationName = await page
      .getByTestId("balance")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe("none");
  });
});
