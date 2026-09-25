import { describe, expect, it } from "vitest";
import { CRIT_CHANCE_BY_LEVEL, CRIT_MULTIPLIER, getCritChance, rollCrit } from "./crit";
import type { RandomSource } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from openspec/changes/add-upgrades-v2/design.md: seq(...))
// ---------------------------------------------------------------------------

interface ScriptedRandom extends RandomSource {
  /** Number of times the source was called. */
  calls: number;
}

/** Returns the given values in order and throws if called more often than that. */
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

// ---------------------------------------------------------------------------
// Crit chance per level
// ---------------------------------------------------------------------------

describe("crit: Crit chance per level", () => {
  it("Constants", () => {
    expect(CRIT_MULTIPLIER).toBe(10);
    expect(CRIT_CHANCE_BY_LEVEL).toEqual([0, 0.05, 0.1, 0.15]);
  });

  it("Chance per level", () => {
    expect([0, 1, 2, 3].map((level) => getCritChance(level))).toEqual([0, 0.05, 0.1, 0.15]);
  });

  it("Out-of-range levels", () => {
    expect(getCritChance(-1)).toBe(0);
    expect(getCritChance(4)).toBe(0.15);
  });
});

// ---------------------------------------------------------------------------
// Deterministic crit roll
// ---------------------------------------------------------------------------

describe("crit: Deterministic crit roll", () => {
  it("Level 0 never crits and consumes no randomness", () => {
    const random = seq();
    expect(rollCrit(0, random)).toBe(false);
    expect(random.calls).toBe(0);
  });

  it("Boundaries per level", () => {
    const cases: readonly [number, number, boolean][] = [
      [1, 0.0499, true],
      [1, 0.05, false],
      [2, 0.0999, true],
      [2, 0.1, false],
      [3, 0.1499, true],
      [3, 0.15, false],
    ];
    for (const [level, value, expected] of cases) {
      const random = seq(value);
      expect(rollCrit(level, random)).toBe(expected);
      expect(random.calls).toBe(1);
    }
  });

  it("Chance over an even spread", () => {
    let crits = 0;
    for (let i = 0; i < 1000; i += 1) {
      if (rollCrit(2, seq(i / 1000))) {
        crits += 1;
      }
    }
    expect(crits).toBe(100);
  });
});
