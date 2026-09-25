import { describe, expect, it } from "vitest";
import {
  getHelperClicksPerSecond,
  getHelperRate,
  HELPER_TICK_MS,
  MAX_TICK_MS,
  SPEED_UP_OF,
  tickHelpers,
} from "./helpers";
import type { GameState, HelperId, HelperTickResult, LeveledUpgradeId } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from design.md: FRESH, S({...}) with `helpers` and `levels`
// shallow-merged into the FRESH defaults)
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
// Helper income rate
// ---------------------------------------------------------------------------

describe("helpers: Helper income rate", () => {
  it("Rate per monkey count", () => {
    expect(getHelperClicksPerSecond(S({ helpers: { monkey: 0 } }))).toBe(0);
    expect(getHelperClicksPerSecond(S({ helpers: { monkey: 1 } }))).toBe(1);
    expect(getHelperClicksPerSecond(S({ helpers: { monkey: 4 } }))).toBe(4);
  });

  it("Upgrades do not boost helpers", () => {
    expect(
      getHelperClicksPerSecond(
        S({
          helpers: { monkey: 2 },
          upgrades: ["double-click", "triple-click", "combo", "golden-button"],
          levels: { crit: 3 },
        }),
      ),
    ).toBe(2);
  });

  it("Speed-up map", () => {
    expect(SPEED_UP_OF).toEqual({
      monkey: "speed-monkey",
      robot: "speed-robot",
      factory: "speed-factory",
    });
  });

  it("Rate per helper type", () => {
    const H = S({ helpers: { monkey: 3, robot: 2, factory: 1 } });
    expect(getHelperRate(H, "monkey")).toBe(3);
    expect(getHelperRate(H, "robot")).toBe(10);
    expect(getHelperRate(H, "factory")).toBe(40);
    expect(getHelperClicksPerSecond(H)).toBe(53);
  });

  it("Speed-ups double per level", () => {
    const H = S({
      helpers: { monkey: 3, robot: 2, factory: 1 },
      levels: { "speed-monkey": 1, "speed-robot": 2, "speed-factory": 3 },
    });
    expect(getHelperRate(H, "monkey")).toBe(6);
    expect(getHelperRate(H, "robot")).toBe(40);
    expect(getHelperRate(H, "factory")).toBe(320);
    expect(getHelperClicksPerSecond(H)).toBe(366);
  });

  it("A speed-up only affects its own type", () => {
    const H = S({ helpers: { monkey: 1, robot: 1 }, levels: { "speed-robot": 3 } });
    expect(getHelperRate(H, "monkey")).toBe(1);
    expect(getHelperRate(H, "robot")).toBe(40);
    expect(getHelperRate(H, "factory")).toBe(0);
    expect(getHelperClicksPerSecond(H)).toBe(41);
  });
});

// ---------------------------------------------------------------------------
// Game tick with fractional carry
// ---------------------------------------------------------------------------

describe("helpers: Game tick with fractional carry", () => {
  it("Constants", () => {
    expect(HELPER_TICK_MS).toBe(100);
    expect(MAX_TICK_MS).toBe(1000);
  });

  it("Partial tick only accumulates", () => {
    const A = S({ balance: 5, totalClicks: 40, helpers: { monkey: 1 } });
    const result = tickHelpers(A, 0, 100);
    expect(result.state).toBe(A);
    expect(result.carry).toBe(100);
  });

  it("Carry completes a click", () => {
    expect(tickHelpers(S({ balance: 5, totalClicks: 40, helpers: { monkey: 1 } }), 900, 100)).toEqual({
      state: S({ balance: 6, totalClicks: 41, helpers: { monkey: 1 } }),
      carry: 0,
    });
  });

  it("Ten ticks of three monkeys, no float drift", () => {
    let result: HelperTickResult = {
      state: S({ balance: 0, totalClicks: 30, helpers: { monkey: 3 } }),
      carry: 0,
    };
    const carries: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      result = tickHelpers(result.state, result.carry, 100);
      carries.push(result.carry);
    }
    expect(carries).toEqual([300, 600, 900, 200, 500, 800, 100, 400, 700, 0]);
    expect(result.state.balance).toBe(3);
    expect(result.state.totalClicks).toBe(33);
  });

  it("Long gaps are clamped", () => {
    expect(tickHelpers(S({ balance: 0, totalClicks: 30, helpers: { monkey: 2 } }), 0, 60000)).toEqual({
      state: S({ balance: 2, totalClicks: 32, helpers: { monkey: 2 } }),
      carry: 0,
    });
  });

  it("Invalid elapsed counts as zero", () => {
    const B = S({ helpers: { monkey: 5 } });
    const negative = tickHelpers(B, 250, -50);
    const nan = tickHelpers(B, 250, Number.NaN);
    expect(negative.state).toBe(B);
    expect(negative.carry).toBe(250);
    expect(nan.state).toBe(B);
    expect(nan.carry).toBe(250);
  });

  it("No helpers keeps the carry", () => {
    const Z = S({ balance: 7, totalClicks: 7 });
    const result = tickHelpers(Z, 400, 1000);
    expect(result.state).toBe(Z);
    expect(result.carry).toBe(400);
  });

  it("Multipliers are ignored", () => {
    const { state } = tickHelpers(
      S({
        balance: 0,
        totalClicks: 250,
        upgrades: ["double-click", "triple-click"],
        helpers: { monkey: 1 },
      }),
      0,
      1000,
    );
    expect(state.balance).toBe(1);
    expect(state.totalClicks).toBe(251);
  });

  it("Other fields are preserved and input is not mutated", () => {
    const input = deepFreeze(
      S({
        balance: 0,
        totalClicks: 30,
        ownedSkins: ["squish"],
        enabledSkins: ["squish"],
        helpers: { monkey: 10 },
      }),
    );
    let result: HelperTickResult | undefined;
    expect(() => {
      result = tickHelpers(input, 0, 100);
    }).not.toThrow();
    expect(result).toEqual({
      state: S({
        balance: 1,
        totalClicks: 31,
        ownedSkins: ["squish"],
        enabledSkins: ["squish"],
        helpers: { monkey: 10 },
      }),
      carry: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Robot, Factory and speed-ups earn through the tick
// ---------------------------------------------------------------------------

describe("helpers: Robot, Factory and speed-ups earn through the tick", () => {
  it("Robot partial and completed click", () => {
    const A = S({ balance: 0, totalClicks: 600, helpers: { robot: 1 } });
    const partial = tickHelpers(A, 0, 100);
    expect(partial.state).toBe(A);
    expect(partial.carry).toBe(500);
    expect(tickHelpers(A, 500, 100)).toEqual({
      state: S({ balance: 1, totalClicks: 601, helpers: { robot: 1 } }),
      carry: 0,
    });
  });

  it("Fully sped-up factory for one second", () => {
    expect(
      tickHelpers(
        S({
          balance: 0,
          totalClicks: 80000,
          helpers: { factory: 1 },
          levels: { "speed-factory": 3 },
        }),
        0,
        1000,
      ),
    ).toEqual({
      state: S({
        balance: 320,
        totalClicks: 80320,
        helpers: { factory: 1 },
        levels: { "speed-factory": 3 },
      }),
      carry: 0,
    });
  });

  it("Mixed helpers over ten ticks, no float drift", () => {
    let result: HelperTickResult = {
      state: S({
        balance: 0,
        totalClicks: 1000,
        helpers: { monkey: 1, robot: 1, factory: 1 },
        levels: { "speed-monkey": 1 },
      }),
      carry: 0,
    };
    const carries: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      result = tickHelpers(result.state, result.carry, 100);
      carries.push(result.carry);
    }
    expect(carries).toEqual([700, 400, 100, 800, 500, 200, 900, 600, 300, 0]);
    expect(result.state.balance).toBe(47);
    expect(result.state.totalClicks).toBe(1047);
  });
});
