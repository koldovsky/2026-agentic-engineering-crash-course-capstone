import { describe, expect, it } from "vitest";
import {
  COMBO_DECAY_MS,
  COMBO_MAX_LEVEL,
  COMBO_STEP,
  COMBO_WINDOW_MS,
  createComboState,
  getComboLevel,
  getComboMultiplier,
  registerComboClick,
} from "./combo";
import type { ComboState } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from openspec/changes/add-upgrades-v2/design.md: C(level, lastClickAt))
// ---------------------------------------------------------------------------

function C(level: number, lastClickAt: number | null): ComboState {
  return { level, lastClickAt };
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
// Combo constants and state
// ---------------------------------------------------------------------------

describe("combo: Combo constants and state", () => {
  it("Constants", () => {
    expect(COMBO_WINDOW_MS).toBe(500);
    expect(COMBO_STEP).toBe(0.1);
    expect(COMBO_MAX_LEVEL).toBe(10);
    expect(COMBO_DECAY_MS).toBe(250);
  });

  it("Fresh combo state", () => {
    const a = createComboState();
    const b = createComboState();
    expect(a).toEqual({ level: 0, lastClickAt: null });
    expect(b).toEqual({ level: 0, lastClickAt: null });
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Combo level and decay
// ---------------------------------------------------------------------------

describe("combo: Combo level and decay", () => {
  it("No press yet", () => {
    expect(getComboLevel(C(0, null), 1000)).toBe(0);
    expect(getComboMultiplier(C(0, null), 1000)).toBe(1);
  });

  it("Level holds during the window", () => {
    expect(getComboLevel(C(10, 1000), 1000)).toBe(10);
    expect(getComboLevel(C(10, 1000), 1500)).toBe(10);
  });

  it("Decay after the window", () => {
    const times = [1501, 1750, 1751, 2000, 3499, 3500, 3501, 10000];
    expect(times.map((now) => getComboLevel(C(10, 1000), now))).toEqual([
      9, 9, 8, 8, 2, 2, 1, 0,
    ]);
  });

  it("Full pause returns to ×1 just after 2 750 ms", () => {
    expect(getComboMultiplier(C(10, 0), 2750)).toBe(1.1);
    expect(getComboMultiplier(C(10, 0), 2751)).toBe(1);
  });

  it("Clock going backwards counts as no idle time", () => {
    expect(getComboLevel(C(7, 1000), 900)).toBe(7);
  });

  it("Multiplier values are exact tenths", () => {
    const expected = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2];
    for (let k = 0; k <= 10; k += 1) {
      expect(getComboMultiplier(C(k, 0), 0)).toBe(expected[k]);
    }
  });
});

// ---------------------------------------------------------------------------
// Registering a press
// ---------------------------------------------------------------------------

describe("combo: Registering a press", () => {
  it("First press starts at level 0", () => {
    expect(registerComboClick(C(0, null), 1000)).toEqual(C(0, 1000));
  });

  it("Fast press boundary", () => {
    expect(registerComboClick(C(0, 1000), 1500)).toEqual(C(1, 1500));
    expect(registerComboClick(C(0, 1000), 1501)).toEqual(C(0, 1501));
  });

  it("Eleven fast presses reach ×2", () => {
    let combo = C(0, null);
    const levels: number[] = [];
    for (let i = 0; i <= 10; i += 1) {
      combo = registerComboClick(combo, i * 100);
      levels.push(combo.level);
    }
    expect(levels).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(combo).toEqual(C(10, 1000));
  });

  it("Cap at the maximum level", () => {
    expect(registerComboClick(C(10, 0), 100)).toEqual(C(10, 100));
  });

  it("Slow press keeps the decayed level", () => {
    expect(registerComboClick(C(10, 0), 750)).toEqual(C(9, 750));
    expect(registerComboClick(C(10, 0), 4000)).toEqual(C(0, 4000));
  });

  it("Input is not mutated", () => {
    const input = deepFreeze(C(3, 100));
    let result: ComboState | undefined;
    expect(() => {
      result = registerComboClick(input, 200);
    }).not.toThrow();
    expect(result).toEqual(C(4, 200));
    expect(input).toEqual(C(3, 100));
  });
});
