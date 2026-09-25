import { describe, expect, it } from "vitest";
import {
  catchGolden,
  createGoldenState,
  getGoldenBonus,
  GOLDEN_BONUS,
  GOLDEN_BONUS_MS,
  GOLDEN_LIFETIME_MS,
  GOLDEN_MAX_INTERVAL_MS,
  GOLDEN_MIN_INTERVAL_MS,
  GOLDEN_SIZE,
  rollGoldenInterval,
  tickGolden,
} from "./golden";
import type { DecorPosition, GoldenSpawn, GoldenState, RandomSource } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from design.md: seq(...), G(...), VIS(...), P, place(P), placeNull)
// ---------------------------------------------------------------------------

interface ScriptedRandom extends RandomSource {
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

interface PlaceStub {
  (): DecorPosition | null;
  calls: number;
}

/** A `place` callback always returning `result`, counting how often it was called. */
function place(result: DecorPosition | null): PlaceStub {
  const stub = (() => {
    stub.calls += 1;
    return result;
  }) as PlaceStub;
  stub.calls = 0;
  return stub;
}

/** `placeNull` of the design notation: a placement that never finds a free spot. */
function placeNull(): PlaceStub {
  return place(null);
}

const P: DecorPosition = { x: 0.5, y: 0.25 };

function G(
  nextSpawnMs: number,
  visible: GoldenSpawn | null,
  bonusMs: number,
): GoldenState {
  return { nextSpawnMs, visible, bonusMs };
}

function VIS(x: number, y: number, remainingMs: number): GoldenSpawn {
  return { position: { x, y }, remainingMs };
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
// Golden button constants and interval roll
// ---------------------------------------------------------------------------

describe("golden-button: Golden button constants and interval roll", () => {
  it("Constants", () => {
    expect(GOLDEN_MIN_INTERVAL_MS).toBe(30000);
    expect(GOLDEN_MAX_INTERVAL_MS).toBe(90000);
    expect(GOLDEN_LIFETIME_MS).toBe(5000);
    expect(GOLDEN_BONUS).toBe(7);
    expect(GOLDEN_BONUS_MS).toBe(30000);
    expect(GOLDEN_SIZE).toEqual({ width: 64, height: 64 });
  });

  it("Interval roll", () => {
    const cases: readonly [number, number][] = [
      [0, 30000],
      [0.25, 45000],
      [0.5, 60000],
      [0.75, 75000],
      [0.999999, 90000],
    ];
    for (const [value, expected] of cases) {
      const random = seq(value);
      expect(rollGoldenInterval(random)).toBe(expected);
      expect(random.calls).toBe(1);
    }
  });

  it("Initial golden state", () => {
    expect(createGoldenState(seq(0.5))).toEqual(G(60000, null, 0));
  });
});

// ---------------------------------------------------------------------------
// Golden button timing
// ---------------------------------------------------------------------------

describe("golden-button: Golden button timing", () => {
  it("Countdown", () => {
    const placeStub = place(P);
    expect(
      tickGolden({
        golden: G(1000, null, 0),
        elapsedMs: 100,
        random: seq(),
        place: placeStub,
      }),
    ).toEqual(G(900, null, 0));
    expect(placeStub.calls).toBe(0);
  });

  it("Spawn when the countdown ends", () => {
    for (const golden of [G(100, null, 0), G(50, null, 0)]) {
      const placeStub = place(P);
      const random = seq();
      expect(tickGolden({ golden, elapsedMs: 100, random, place: placeStub })).toEqual(
        G(0, VIS(0.5, 0.25, 5000), 0),
      );
      expect(placeStub.calls).toBe(1);
      expect(random.calls).toBe(0);
    }
  });

  it("No free spot skips the spawn", () => {
    const placeStub = placeNull();
    const random = seq(0.25);
    expect(
      tickGolden({ golden: G(100, null, 0), elapsedMs: 100, random, place: placeStub }),
    ).toEqual(G(45000, null, 0));
    expect(placeStub.calls).toBe(1);
    expect(random.calls).toBe(1);
  });

  it("Visible button counts down and expires", () => {
    const placeStub = place(P);
    expect(
      tickGolden({
        golden: G(0, VIS(0.5, 0.25, 5000), 0),
        elapsedMs: 100,
        random: seq(),
        place: placeStub,
      }),
    ).toEqual(G(0, VIS(0.5, 0.25, 4900), 0));
    expect(placeStub.calls).toBe(0);

    expect(
      tickGolden({
        golden: G(0, VIS(0.5, 0.25, 100), 0),
        elapsedMs: 100,
        random: seq(0.75),
        place: place(P),
      }),
    ).toEqual(G(75000, null, 0));
  });

  it("Bonus runs down independently", () => {
    expect(
      tickGolden({
        golden: G(5000, null, 30000),
        elapsedMs: 1000,
        random: seq(),
        place: place(P),
      }),
    ).toEqual(G(4000, null, 29000));

    expect(
      tickGolden({ golden: G(5000, null, 300), elapsedMs: 1000, random: seq(), place: place(P) }),
    ).toEqual(G(4000, null, 0));

    expect(
      tickGolden({
        golden: G(0, VIS(0.5, 0.25, 3000), 500),
        elapsedMs: 1000,
        random: seq(),
        place: place(P),
      }),
    ).toEqual(G(0, VIS(0.5, 0.25, 2000), 0));
  });

  it("Elapsed time is clamped", () => {
    expect(
      tickGolden({
        golden: G(90000, null, 30000),
        elapsedMs: 60000,
        random: seq(),
        place: place(P),
      }),
    ).toEqual(G(89000, null, 29000));
  });

  it("Zero, negative and NaN elapsed return the input", () => {
    const A = G(1000, null, 500);
    for (const elapsedMs of [0, -50, Number.NaN]) {
      expect(tickGolden({ golden: A, elapsedMs, random: seq(), place: place(P) })).toBe(A);
    }
  });

  it("Full cycle over 100 ms ticks", () => {
    const random = seq(0.5);
    const placeStub = place(P);
    let golden = createGoldenState(seq(0));
    expect(golden).toEqual(G(30000, null, 0));

    const tick = () => {
      golden = tickGolden({ golden, elapsedMs: 100, random, place: placeStub });
    };

    for (let i = 0; i < 299; i += 1) {
      tick();
    }
    expect(golden).toEqual(G(100, null, 0));

    tick();
    expect(golden).toEqual(G(0, VIS(0.5, 0.25, 5000), 0));

    for (let i = 0; i < 49; i += 1) {
      tick();
    }
    expect(golden).toEqual(G(0, VIS(0.5, 0.25, 100), 0));

    tick();
    expect(golden).toEqual(G(60000, null, 0));
    expect(placeStub.calls).toBe(1);
    expect(random.calls).toBe(1);
  });

  it("Input is not mutated", () => {
    const input = deepFreeze(G(0, VIS(0.5, 0.25, 200), 1000));
    let result: GoldenState | undefined;
    expect(() => {
      result = tickGolden({ golden: input, elapsedMs: 100, random: seq(), place: place(P) });
    }).not.toThrow();
    expect(result).toEqual(G(0, VIS(0.5, 0.25, 100), 900));
    expect(input).toEqual(G(0, VIS(0.5, 0.25, 200), 1000));
  });
});

// ---------------------------------------------------------------------------
// Catching the golden button
// ---------------------------------------------------------------------------

describe("golden-button: Catching the golden button", () => {
  it("Catch starts the bonus", () => {
    expect(catchGolden(G(0, VIS(0.5, 0.25, 1200), 0), seq(0.5))).toEqual(G(60000, null, 30000));
  });

  it("Catch during a bonus restarts it", () => {
    expect(catchGolden(G(0, VIS(0.5, 0.25, 1200), 12000), seq(0))).toEqual(G(30000, null, 30000));
  });

  it("Nothing to catch", () => {
    const A = G(20000, null, 5000);
    const random = seq();
    expect(catchGolden(A, random)).toBe(A);
    expect(random.calls).toBe(0);
  });

  it("Bonus value", () => {
    expect(getGoldenBonus(null)).toBe(1);
    expect(getGoldenBonus(G(1000, null, 0))).toBe(1);
    expect(getGoldenBonus(G(1000, null, 1))).toBe(7);
    expect(getGoldenBonus(G(0, VIS(0.5, 0.25, 100), 30000))).toBe(7);
  });
});
