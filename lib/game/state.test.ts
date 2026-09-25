import { describe, expect, it } from "vitest";
import { NEUTRAL_CLICK_MODIFIERS } from "./click-value";
import { clickMainButton, createInitialState, isBalanceVisible } from "./state";
import type { GameState, HelperId, LeveledUpgradeId } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from openspec/changes/add-content-v3/design.md: FRESH, S({...}) with
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

const FRESH: GameState = fresh();

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
// Initial game state
// ---------------------------------------------------------------------------

describe("clicker-core: Initial game state", () => {
  it("Fresh state values", () => {
    const state = createInitialState();
    expect(state).toStrictEqual({
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
    });
    // No `achievements`, no `stats`: the trophies live in their own storage key (design D12).
    expect(Object.keys(state)).toEqual([
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
    ]);
  });

  it("Fresh state is a new object each time", () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).toStrictEqual(FRESH);
    expect(b).toStrictEqual(FRESH);
    expect(a).not.toBe(b);
    expect(a.ownedSkins).not.toBe(b.ownedSkins);
    expect(a.decor).not.toBe(b.decor);
    expect(a.videos).not.toBe(b.videos);
    expect(a.helpers).not.toBe(b.helpers);
    expect(a.levels).not.toBe(b.levels);
  });
});

// ---------------------------------------------------------------------------
// Main-button click
// ---------------------------------------------------------------------------

describe("clicker-core: Main-button click updates balance and total clicks", () => {
  it("First click", () => {
    expect(clickMainButton(FRESH, NEUTRAL_CLICK_MODIFIERS)).toStrictEqual(
      S({ balance: 1, totalClicks: 1 }),
    );
  });

  it("Click on an existing state", () => {
    expect(clickMainButton(S({ balance: 41, totalClicks: 99 }), NEUTRAL_CLICK_MODIFIERS)).toStrictEqual(
      S({ balance: 42, totalClicks: 100 }),
    );
  });

  it("Click value above 1 adds to balance but total clicks grows by 1", () => {
    expect(
      clickMainButton(S({ balance: 5, totalClicks: 5 }), {
        multiplier: 2,
        combo: 1,
        crit: true,
        goldenBonus: 1,
      }),
    ).toStrictEqual(S({ balance: 25, totalClicks: 6 }));
  });

  it("Carry-free click floors a fractional value", () => {
    expect(
      clickMainButton(S({ balance: 5, totalClicks: 5 }), {
        multiplier: 3,
        combo: 1.5,
        crit: false,
        goldenBonus: 1,
      }),
    ).toStrictEqual(S({ balance: 9, totalClicks: 6 }));
  });

  it("Other fields are copied unchanged", () => {
    const fields: StateOverrides = {
      ownedSkins: ["squish", "gold"],
      enabledSkins: ["squish"],
      material: "gold",
      decor: [{ id: "sleeping-cat", position: { x: 0.1, y: 0.2 } }],
      upgrades: ["double-click"],
      helpers: { monkey: 2 },
    };
    const input = S({ balance: 5, totalClicks: 70, ...fields });
    expect(
      clickMainButton(input, { multiplier: 2, combo: 1, crit: false, goldenBonus: 1 }),
    ).toStrictEqual(S({ balance: 7, totalClicks: 71, ...fields }));
  });

  it("Input state is not mutated", () => {
    const input = deepFreeze(S({ balance: 3, totalClicks: 3 }));
    let result: GameState | undefined;
    expect(() => {
      result = clickMainButton(input, NEUTRAL_CLICK_MODIFIERS);
    }).not.toThrow();
    expect(result).toStrictEqual(S({ balance: 4, totalClicks: 4 }));
    expect(input).toStrictEqual(S({ balance: 3, totalClicks: 3 }));
    expect(result).not.toBe(input);
  });

  it("Total clicks never decreases over a click sequence", () => {
    let state: GameState = FRESH;
    const totals: number[] = [];
    for (let i = 0; i < 25; i += 1) {
      state = clickMainButton(state, NEUTRAL_CLICK_MODIFIERS);
      totals.push(state.totalClicks);
    }
    expect(totals).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(state).toStrictEqual(S({ balance: 25, totalClicks: 25 }));
  });
});

// ---------------------------------------------------------------------------
// Balance counter visibility (unchanged Stage 1 requirement)
// ---------------------------------------------------------------------------

describe("clicker-core: Balance counter visibility", () => {
  it("Visibility rule — no clicks", () => {
    expect(isBalanceVisible({ balance: 0, totalClicks: 0 })).toBe(false);
  });

  it("Visibility rule — after one click", () => {
    expect(isBalanceVisible({ balance: 1, totalClicks: 1 })).toBe(true);
  });

  it("Visibility rule — zero balance but clicks made", () => {
    expect(isBalanceVisible({ balance: 0, totalClicks: 12 })).toBe(true);
  });
});
