import { GOLDEN_BONUS_MS, GOLDEN_LIFETIME_MS } from "@/lib/game/golden";
import type { DecorPosition, GameState, HelperId, LeveledUpgradeId } from "@/lib/game/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buy,
  catchGoldenButton,
  commitGame,
  getRuntimeSnapshot,
  getServerRuntimeSnapshot,
  press,
  resetGame,
  subscribeRuntime,
  tick,
} from "./game-store";

type StateOverrides = Partial<Omit<GameState, "helpers" | "levels">> & {
  readonly helpers?: Partial<Record<HelperId, number>>;
  readonly levels?: Partial<Record<LeveledUpgradeId, number>>;
};

// Notation from openspec/changes/add-upgrades-v2/design.md.
function S({ helpers, levels, ...rest }: StateOverrides = {}): GameState {
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
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0, ...levels },
  };
}

const P: DecorPosition = { x: 0.5, y: 0.25 };
const place = () => P;

/** Fixes the page random hook the way e2e does (design D19). */
function fixRandom(value: number): void {
  globalThis.__dcRandom = () => value;
}

beforeEach(() => {
  window.localStorage.clear();
  resetGame();
});

afterEach(() => {
  globalThis.__dcRandom = undefined;
});

describe("game-store: main-button press", () => {
  it("credits whole clicks and keeps the fractional carry in memory", () => {
    commitGame(S({ totalClicks: 300, upgrades: ["combo"] }));

    const values: number[] = [];
    const credits: number[] = [];
    for (let i = 0; i <= 3; i += 1) {
      const result = press(i * 100);
      values.push(result?.value ?? 0);
      credits.push(result?.credited ?? 0);
    }

    expect(values).toEqual([1, 1.1, 1.2, 1.3]);
    expect(credits).toEqual([1, 1, 1, 1]);
    // 4.6 earned, 4 credited: the remaining 0.6 stays in the runtime carry, never in the save.
    expect(getRuntimeSnapshot().runtime.combo).toEqual({ level: 3, lastClickAt: 300 });
  });

  it("rolls the crit through the page random hook", () => {
    commitGame(S({ totalClicks: 300, levels: { crit: 1 } }));

    fixRandom(0.01);
    expect(press(0)?.crit).toBe(true);

    fixRandom(0.99);
    expect(press(100)?.crit).toBe(false);
  });

  it("publishes the runtime on every press and stops once unsubscribed", () => {
    commitGame(S({ totalClicks: 300, upgrades: ["combo"] }));
    const listener = vi.fn();
    const unsubscribe = subscribeRuntime(listener);

    press(0);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getRuntimeSnapshot().now).toBe(0);

    unsubscribe();
    press(100);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("serves one stable runtime snapshot for SSR", () => {
    expect(getServerRuntimeSnapshot()).toBe(getServerRuntimeSnapshot());
    expect(getServerRuntimeSnapshot()).toEqual({
      runtime: { combo: { level: 0, lastClickAt: null }, golden: null },
      now: 0,
    });
  });
});

describe("game-store: golden button", () => {
  it("starts the countdown right after the purchase", () => {
    fixRandom(0.5);
    commitGame(S({ balance: 1000, totalClicks: 700 }));

    buy("golden-button");

    expect(getRuntimeSnapshot().runtime.golden).toEqual({
      nextSpawnMs: 60000,
      visible: null,
      bonusMs: 0,
    });
  });

  it("spawns on a tick, is caught for a bonus and multiplies the next press", () => {
    fixRandom(0.5);
    commitGame(S({ balance: 1000, totalClicks: 700 }));
    buy("golden-button");

    for (let i = 0; i < 60; i += 1) {
      tick(1000, i * 1000, place);
    }
    expect(getRuntimeSnapshot().runtime.golden?.visible).toEqual({
      position: P,
      remainingMs: GOLDEN_LIFETIME_MS,
    });

    catchGoldenButton();
    const golden = getRuntimeSnapshot().runtime.golden;
    expect(golden?.visible).toBeNull();
    expect(golden?.bonusMs).toBe(GOLDEN_BONUS_MS);

    expect(press(0)?.value).toBe(7);
  });

  it("creates the countdown on the first tick of a loaded save", () => {
    fixRandom(0.5);
    commitGame(S({ totalClicks: 700, upgrades: ["golden-button"] }));
    expect(getRuntimeSnapshot().runtime.golden).toBeNull();

    tick(100, 100, place);
    // The creating tick only rolls the interval, it does not count down yet (design D8).
    expect(getRuntimeSnapshot().runtime.golden?.nextSpawnMs).toBe(60000);
  });

  it("catching nothing changes nothing", () => {
    commitGame(S({ totalClicks: 700 }));
    const before = getRuntimeSnapshot();

    catchGoldenButton();

    expect(getRuntimeSnapshot()).toBe(before);
  });
});

describe("game-store: reset", () => {
  it("clears the combo, the golden button and the main-click carry", () => {
    fixRandom(0.5);
    commitGame(S({ balance: 1000, totalClicks: 700, upgrades: ["combo"] }));
    buy("golden-button");
    press(0);
    press(100);

    resetGame();

    expect(getRuntimeSnapshot().runtime).toEqual({
      combo: { level: 0, lastClickAt: null },
      golden: null,
    });
    // A fresh carry: the first press after a reset credits exactly one whole click.
    commitGame(S({ totalClicks: 300, upgrades: ["combo"] }));
    expect(press(0)?.carry).toBe(0);
  });
});
