import { describe, expect, it } from "vitest";
import {
  creditClick,
  getClickModifiers,
  getClickMultiplier,
  getClickValue,
  NEUTRAL_CLICK_MODIFIERS,
} from "./click-value";
import { clickMainButton } from "./state";
import type { CreditResult, GameState, HelperId, LeveledUpgradeId } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from openspec/changes/add-upgrades-v2/design.md: S({...}) with
// `helpers` and `levels` shallow-merged into the FRESH defaults)
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

// ---------------------------------------------------------------------------
// Click value formula
// ---------------------------------------------------------------------------

describe("clicker-core: Click value formula", () => {
  it("Neutral modifiers give 1", () => {
    expect(getClickValue({ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 })).toBe(1);
  });

  it("Exported neutral modifiers constant", () => {
    expect(NEUTRAL_CLICK_MODIFIERS).toEqual({
      multiplier: 1,
      combo: 1,
      crit: false,
      goldenBonus: 1,
    });
    expect(getClickValue(NEUTRAL_CLICK_MODIFIERS)).toBe(1);
  });

  it("Multiplier is applied", () => {
    expect(getClickValue({ multiplier: 3, combo: 1, crit: false, goldenBonus: 1 })).toBe(3);
  });

  it("Crit multiplies by 10", () => {
    expect(getClickValue({ multiplier: 2, combo: 1, crit: true, goldenBonus: 1 })).toBe(20);
  });

  it("All factors multiply", () => {
    expect(getClickValue({ multiplier: 3, combo: 2, crit: true, goldenBonus: 7 })).toBe(420);
  });

  it("Combo and golden bonus are applied without crit", () => {
    expect(getClickValue({ multiplier: 1, combo: 2, crit: false, goldenBonus: 7 })).toBe(14);
  });

  it("Fractional values are exact, not rounded", () => {
    expect(getClickValue({ multiplier: 1, combo: 1.5, crit: false, goldenBonus: 1 })).toBe(1.5);
    expect(getClickValue({ multiplier: 3, combo: 1.1, crit: false, goldenBonus: 1 })).toBe(3.3);
    expect(getClickValue({ multiplier: 3, combo: 1.7, crit: false, goldenBonus: 7 })).toBe(35.7);
  });

  it("Crit and golden products stay exact integers", () => {
    expect(getClickValue({ multiplier: 3, combo: 1.4, crit: true, goldenBonus: 1 })).toBe(42);
    expect(getClickValue({ multiplier: 3, combo: 1.9, crit: true, goldenBonus: 7 })).toBe(399);
    expect(getClickValue({ multiplier: 2, combo: 1.3, crit: true, goldenBonus: 1 })).toBe(26);
    expect(getClickValue({ multiplier: 3, combo: 1.5, crit: true, goldenBonus: 7 })).toBe(315);
  });

  it("Combo levels with Triple click", () => {
    const expected = [3, 3.3, 3.6, 3.9, 4.2, 4.5, 4.8, 5.1, 5.4, 5.7, 6];
    for (let k = 0; k <= 10; k += 1) {
      expect(
        getClickValue({ multiplier: 3, combo: 1 + k / 10, crit: false, goldenBonus: 1 }),
      ).toBe(expected[k]);
    }
  });

  it("Carry credits whole clicks at combo ×1.3", () => {
    const value = getClickValue({ multiplier: 1, combo: 1.3, crit: false, goldenBonus: 1 });
    expect(value).toBe(1.3);
    let carry = 0;
    const credits: number[] = [];
    const carries: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const result: CreditResult = creditClick(carry, value);
      carry = result.carry;
      credits.push(result.credited);
      carries.push(result.carry);
    }
    expect(credits).toEqual([1, 1, 1, 2]);
    expect(carries).toEqual([0.3, 0.6, 0.9, 0.2]);
  });

  it("Carry over ten Triple ×1.1 presses", () => {
    let carry = 0;
    const credits: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const result = creditClick(carry, 3.3);
      carry = result.carry;
      credits.push(result.credited);
    }
    expect(credits).toEqual([3, 3, 3, 4, 3, 3, 4, 3, 3, 4]);
    expect(credits.reduce((sum, n) => sum + n, 0)).toBe(33);
    expect(carry).toBe(0);
  });

  it("Integer values pass the carry through", () => {
    expect(creditClick(0, 20)).toEqual({ credited: 20, carry: 0 });
    expect(creditClick(0.5, 7)).toEqual({ credited: 7, carry: 0.5 });
    expect(creditClick(0, 42)).toEqual({ credited: 42, carry: 0 });
  });

  it("Float tolerance completes a click", () => {
    // 0.7 + 0.3 and 0.9 + 0.1 are exactly 1 in IEEE-754; the tolerance matters for carries
    // such as 0.1 + 0.2 (0.30000000000000004), which toFixed(6) folds back (spec D9).
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(creditClick(0.9, 0.2)).toEqual({ credited: 1, carry: 0.1 });
    expect(creditClick(0.7, 0.3)).toEqual({ credited: 1, carry: 0 });
    expect(creditClick(0.9, 0.1)).toEqual({ credited: 1, carry: 0 });
  });
});

// ---------------------------------------------------------------------------
// Click multiplier from upgrades
// ---------------------------------------------------------------------------

describe("click-upgrades: Click multiplier from upgrades", () => {
  it("Multiplier per upgrade set", () => {
    expect(getClickMultiplier(S({ upgrades: [] }))).toBe(1);
    expect(getClickMultiplier(S({ upgrades: ["double-click"] }))).toBe(2);
    expect(getClickMultiplier(S({ upgrades: ["double-click", "triple-click"] }))).toBe(3);
  });

  it("Modifiers derived from state", () => {
    expect(getClickModifiers(S({ upgrades: ["double-click", "triple-click"] }))).toEqual({
      multiplier: 3,
      combo: 1,
      crit: false,
      goldenBonus: 1,
    });
    const neutral = getClickModifiers(S({}));
    expect(neutral).toEqual({ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 });
    expect(neutral).toEqual(NEUTRAL_CLICK_MODIFIERS);
  });

  it("Other state does not affect the multiplier", () => {
    expect(
      getClickMultiplier(
        S({
          balance: 9999,
          totalClicks: 9999,
          ownedSkins: ["gold"],
          material: "gold",
          upgrades: ["combo", "golden-button"],
          helpers: { monkey: 50, robot: 5 },
          levels: { crit: 3 },
        }),
      ),
    ).toBe(1);
  });

  it("Context is used when the upgrades are owned", () => {
    expect(
      getClickModifiers(S({ upgrades: ["combo", "golden-button"], levels: { crit: 1 } }), {
        comboMultiplier: 1.5,
        crit: true,
        goldenBonus: 7,
      }),
    ).toEqual({ multiplier: 1, combo: 1.5, crit: true, goldenBonus: 7 });
  });

  it("Context is ignored for upgrades that are not owned", () => {
    expect(
      getClickModifiers(S({}), { comboMultiplier: 1.5, crit: true, goldenBonus: 7 }),
    ).toEqual({ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 });
    expect(
      getClickModifiers(S({ upgrades: ["double-click", "combo"] }), {
        comboMultiplier: 1.5,
        crit: true,
        goldenBonus: 7,
      }),
    ).toEqual({ multiplier: 2, combo: 1.5, crit: false, goldenBonus: 1 });
  });

  it("Owned upgrades without context stay neutral", () => {
    expect(
      getClickModifiers(
        S({ upgrades: ["double-click", "combo", "golden-button"], levels: { crit: 3 } }),
      ),
    ).toEqual({ multiplier: 2, combo: 1, crit: false, goldenBonus: 1 });
  });

  it("Double click doubles a press", () => {
    const D = S({ balance: 0, totalClicks: 60, upgrades: ["double-click"] });
    expect(clickMainButton(D, getClickModifiers(D))).toEqual(
      S({ balance: 2, totalClicks: 61, upgrades: ["double-click"] }),
    );
  });

  it("Triple replaces double", () => {
    let T = S({ balance: 10, totalClicks: 250, upgrades: ["double-click", "triple-click"] });
    for (let i = 0; i < 3; i += 1) {
      T = clickMainButton(T, getClickModifiers(T));
    }
    expect(T.balance).toBe(19);
    expect(T.totalClicks).toBe(253);
  });
});
