import { describe, expect, it } from "vitest";
import { createClickRuntime, pressMainButton } from "./press";
import type {
  ClickRuntime,
  ComboState,
  GameState,
  GoldenSpawn,
  GoldenState,
  HelperId,
  LeveledUpgradeId,
  PressResult,
  RandomSource,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from design.md: FRESH, S({...}) with merged helpers / levels,
// seq(...), C(...), G(...), VIS(...), R0)
// ---------------------------------------------------------------------------

type StateOverrides = Partial<Omit<GameState, "helpers" | "levels">> & {
  readonly helpers?: Partial<Record<HelperId, number>>;
  readonly levels?: Partial<Record<LeveledUpgradeId, number>>;
};

function fresh(): GameState {
  return {
    balance: 0,
    totalClicks: 0,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    videos: [],
    upgrades: [],
    helpers: { monkey: 0, robot: 0, factory: 0 },
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
  };
}

function S({ helpers, levels, ...rest }: StateOverrides = {}): GameState {
  const base = fresh();
  return {
    ...base,
    ...rest,
    helpers: { ...base.helpers, ...helpers },
    levels: { ...base.levels, ...levels },
  };
}

interface ScriptedRandom extends RandomSource {
  calls: number;
}

function seq(...values: readonly number[]): ScriptedRandom {
  const source = (() => {
    if (source.calls >= values.length) {
      throw new Error(`random source called ${source.calls + 1} times, ${values.length} scripted`);
    }
    const value = values[source.calls];
    source.calls += 1;
    return value;
  }) as ScriptedRandom;
  source.calls = 0;
  return source;
}

function C(level: number, lastClickAt: number | null): ComboState {
  return { level, lastClickAt };
}

function G(nextSpawnMs: number, visible: GoldenSpawn | null, bonusMs: number): GoldenState {
  return { nextSpawnMs, visible, bonusMs };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// Main-button press pipeline
// ---------------------------------------------------------------------------

describe("click-upgrades: Main-button press pipeline", () => {
  it("Fresh click runtime", () => {
    const a = createClickRuntime();
    const b = createClickRuntime();
    expect(a).toEqual({ combo: { level: 0, lastClickAt: null }, golden: null });
    expect(b).toEqual({ combo: { level: 0, lastClickAt: null }, golden: null });
    expect(a).not.toBe(b);
  });

  it("Plain press", () => {
    const R = createClickRuntime();
    const random = seq();
    const result = pressMainButton({
      state: S({ balance: 5, totalClicks: 5 }),
      runtime: R,
      carry: 0,
      nowMs: 1000,
      random,
    });
    expect(result.state).toEqual(S({ balance: 6, totalClicks: 6 }));
    expect(result.runtime).toBe(R);
    expect(result.carry).toBe(0);
    expect(result.value).toBe(1);
    expect(result.credited).toBe(1);
    expect(result.crit).toBe(false);
    expect(random.calls).toBe(0);
  });

  it("Crit press", () => {
    const X = S({ balance: 0, totalClicks: 200, upgrades: ["double-click"], levels: { crit: 1 } });

    const critRandom = seq(0.01);
    const crit = pressMainButton({
      state: X,
      runtime: createClickRuntime(),
      carry: 0.5,
      nowMs: 0,
      random: critRandom,
    });
    expect(crit.value).toBe(20);
    expect(crit.credited).toBe(20);
    expect(crit.carry).toBe(0.5);
    expect(crit.crit).toBe(true);
    expect(crit.state.balance).toBe(20);
    expect(crit.state.totalClicks).toBe(201);
    expect(critRandom.calls).toBe(1);

    const plainRandom = seq(0.05);
    const plain = pressMainButton({
      state: X,
      runtime: createClickRuntime(),
      carry: 0.5,
      nowMs: 0,
      random: plainRandom,
    });
    expect(plain.value).toBe(2);
    expect(plain.credited).toBe(2);
    expect(plain.crit).toBe(false);
    expect(plainRandom.calls).toBe(1);
  });

  it("Combo builds over fast presses with a carry", () => {
    let state = S({ totalClicks: 300, upgrades: ["combo"] });
    let runtime: ClickRuntime = createClickRuntime();
    let carry = 0;
    const values: number[] = [];
    const credits: number[] = [];

    for (let i = 0; i <= 10; i += 1) {
      const result: PressResult = pressMainButton({
        state,
        runtime,
        carry,
        nowMs: i * 100,
        random: seq(),
      });
      state = result.state;
      runtime = result.runtime;
      carry = result.carry;
      values.push(result.value);
      credits.push(result.credited);
    }

    expect(values).toEqual([1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2]);
    expect(credits).toEqual([1, 1, 1, 1, 2, 1, 2, 1, 2, 2, 2]);
    expect(state.balance).toBe(16);
    expect(state.totalClicks).toBe(311);
    expect(carry).toBe(0.5);
    expect(runtime.combo).toEqual(C(10, 1000));
  });

  it("Combo is not tracked without the upgrade", () => {
    let state = S({ totalClicks: 300 });
    const R = createClickRuntime();
    let runtime: ClickRuntime = R;
    let carry = 0;

    for (let i = 0; i <= 10; i += 1) {
      const result = pressMainButton({ state, runtime, carry, nowMs: i * 100, random: seq() });
      expect(result.value).toBe(1);
      expect(result.credited).toBe(1);
      expect(result.carry).toBe(0);
      expect(result.runtime).toBe(R);
      state = result.state;
      runtime = result.runtime;
      carry = result.carry;
    }
  });

  it("Golden bonus multiplies the press", () => {
    const Rg: ClickRuntime = { combo: C(0, null), golden: G(40000, null, 12000) };
    const withBonus = pressMainButton({
      state: S({ totalClicks: 700, upgrades: ["golden-button"] }),
      runtime: Rg,
      carry: 0,
      nowMs: 0,
      random: seq(),
    });
    expect(withBonus.value).toBe(7);
    expect(withBonus.credited).toBe(7);
    expect(withBonus.runtime.golden).toBe(Rg.golden);

    const expired = pressMainButton({
      state: S({ totalClicks: 700, upgrades: ["golden-button"] }),
      runtime: { combo: C(0, null), golden: G(40000, null, 0) },
      carry: 0,
      nowMs: 0,
      random: seq(),
    });
    expect(expired.value).toBe(1);

    const notOwned = pressMainButton({
      state: S({ totalClicks: 700 }),
      runtime: Rg,
      carry: 0,
      nowMs: 0,
      random: seq(),
    });
    expect(notOwned.value).toBe(1);
  });

  it("All factors multiply exactly", () => {
    const A = S({
      balance: 0,
      totalClicks: 5000,
      upgrades: ["double-click", "triple-click", "combo", "golden-button"],
      levels: { crit: 3 },
    });
    const RA: ClickRuntime = { combo: C(4, 1000), golden: G(10000, null, 30000) };
    const result = pressMainButton({
      state: A,
      runtime: RA,
      carry: 0.25,
      nowMs: 1200,
      random: seq(0.1),
    });
    expect(result.value).toBe(315);
    expect(result.credited).toBe(315);
    expect(result.carry).toBe(0.25);
    expect(result.crit).toBe(true);
    expect(result.state.balance).toBe(315);
    expect(result.state.totalClicks).toBe(5001);
    expect(result.runtime.combo).toEqual(C(5, 1200));
    expect(result.runtime.golden).toBe(RA.golden);
  });

  it("Inputs are not mutated", () => {
    const state = deepFreeze(
      S({ balance: 3, totalClicks: 300, upgrades: ["combo"], levels: { crit: 1 } }),
    );
    const runtime = deepFreeze<ClickRuntime>({ combo: C(2, 0), golden: null });
    let result: PressResult | undefined;
    expect(() => {
      result = pressMainButton({ state, runtime, carry: 0.8, nowMs: 100, random: seq(0.5) });
    }).not.toThrow();
    expect(result?.value).toBe(1.3);
    expect(result?.credited).toBe(2);
    expect(result?.carry).toBe(0.1);
    expect(result?.state.balance).toBe(5);
    expect(result?.state.totalClicks).toBe(301);
    expect(result?.runtime.combo).toEqual(C(3, 100));
  });
});
