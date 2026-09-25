import { describe, expect, it } from "vitest";
import {
  DECOR_GAP,
  DECOR_MARGIN,
  DECOR_MAX_ATTEMPTS,
  decorRect,
  placeDecor,
  rectsOverlap,
} from "./decor";
import type { RandomSource, Rect, Size } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from design.md: seq(...))
// ---------------------------------------------------------------------------

interface ScriptedRandom extends RandomSource {
  /** Number of values handed out so far. */
  readonly calls: () => number;
}

/** Scripted RandomSource: returns the values in order, throws once they run out. */
function seq(...values: number[]): ScriptedRandom {
  let index = 0;
  const random = (() => {
    if (index >= values.length) {
      throw new Error(`seq(): called ${index + 1} times but only ${values.length} values given`);
    }
    const value = values[index];
    index += 1;
    return value;
  }) as ScriptedRandom;
  Object.defineProperty(random, "calls", { value: () => index });
  return random;
}

function rect(left: number, top: number, width: number, height: number): Rect {
  return { left, top, width, height };
}

const VIEWPORT: Size = { width: 1280, height: 720 };
const CAT: Size = { width: 120, height: 80 };

// ---------------------------------------------------------------------------
// Rectangle overlap
// ---------------------------------------------------------------------------

describe("page-decor: Rectangle overlap", () => {
  it("Overlap cases", () => {
    expect([
      rectsOverlap(rect(0, 0, 10, 10), rect(5, 5, 10, 10)),
      rectsOverlap(rect(0, 0, 10, 10), rect(10, 0, 10, 10)),
      rectsOverlap(rect(0, 0, 10, 10), rect(0, 10, 10, 10)),
      rectsOverlap(rect(0, 0, 10, 10), rect(20, 20, 5, 5)),
      rectsOverlap(rect(0, 0, 100, 100), rect(10, 10, 5, 5)),
      rectsOverlap(rect(10, 10, 5, 5), rect(0, 0, 100, 100)),
    ]).toEqual([true, false, false, false, true, true]);
  });
});

// ---------------------------------------------------------------------------
// Random decor placement
// ---------------------------------------------------------------------------

describe("page-decor: Random decor placement", () => {
  it("Constants", () => {
    expect(DECOR_MARGIN).toBe(16);
    expect(DECOR_GAP).toBe(16);
    expect(DECOR_MAX_ATTEMPTS).toBe(50);
  });

  it("First candidate on an empty screen", () => {
    const random = seq(0.5, 0.5);
    expect(placeDecor({ viewport: VIEWPORT, size: CAT, reserved: [], random })).toEqual({
      x: 580 / 1280,
      y: 320 / 720,
    });
    expect(random.calls()).toBe(2);
  });

  it("Candidate over the main button is rejected", () => {
    const random = seq(0.5, 0.5, 0, 0);
    expect(
      placeDecor({
        viewport: VIEWPORT,
        size: CAT,
        reserved: [rect(560, 280, 160, 160)],
        random,
      }),
    ).toEqual({ x: 16 / 1280, y: 16 / 720 });
    expect(random.calls()).toBe(4);
  });

  it("Realistic Stage 2 layout", () => {
    const reserved = [
      rect(16, 16, 288, 432), // shop
      rect(560, 280, 160, 160), // main button
      rect(560, 216, 160, 64), // balance
      rect(1160, 16, 104, 40), // switchers
      rect(16, 608, 288, 96), // helpers
      rect(1130, 660, 134, 44), // reset
    ];
    const random = seq(0, 0, 0.999, 0.999, 0.5, 0.1);
    expect(placeDecor({ viewport: VIEWPORT, size: CAT, reserved, random })).toEqual({
      x: 580 / 1280,
      y: 77 / 720,
    });
    expect(random.calls()).toBe(6);
  });

  it("Other decor is avoided", () => {
    const random = seq(0.5, 0.5, 0.5, 0.5, 0.1, 0.1);
    expect(
      placeDecor({
        viewport: VIEWPORT,
        size: CAT,
        reserved: [rect(580, 320, 120, 80)],
        random,
      }),
    ).toEqual({ x: 129 / 1280, y: 77 / 720 });
    expect(random.calls()).toBe(6);
  });

  it("Touching the gap boundary is allowed", () => {
    const random = seq(0.5, 0.5);
    expect(
      placeDecor({
        viewport: VIEWPORT,
        size: CAT,
        reserved: [rect(0, 0, 564, 720)],
        random,
      }),
    ).toEqual({ x: 580 / 1280, y: 320 / 720 });
  });

  it("All attempts fail", () => {
    let calls = 0;
    const random: RandomSource = () => {
      calls += 1;
      return 0.5;
    };
    expect(
      placeDecor({
        viewport: VIEWPORT,
        size: CAT,
        reserved: [rect(0, 0, 565, 720)],
        random,
      }),
    ).toBeNull();
    expect(calls).toBe(100);
  });

  it("Custom maxAttempts", () => {
    const random = seq(0.1, 0.2, 0.3, 0.4);
    let result: unknown = "unset";
    expect(() => {
      result = placeDecor({
        viewport: VIEWPORT,
        size: CAT,
        reserved: [rect(0, 0, 1280, 720)],
        random,
        maxAttempts: 2,
      });
    }).not.toThrow();
    expect(result).toBeNull();
    expect(random.calls()).toBe(4);
  });

  it("Custom margin and gap", () => {
    expect(
      placeDecor({
        viewport: { width: 100, height: 100 },
        size: { width: 10, height: 10 },
        reserved: [],
        random: seq(0.5, 0.5),
        margin: 0,
        gap: 0,
      }),
    ).toEqual({ x: 0.45, y: 0.45 });
  });

  it("Viewport too small", () => {
    const random = seq();
    let result: unknown = "unset";
    expect(() => {
      result = placeDecor({
        viewport: { width: 150, height: 150 },
        size: { width: 144, height: 144 },
        reserved: [],
        random,
      });
    }).not.toThrow();
    expect(result).toBeNull();
    expect(random.calls()).toBe(0);
  });

  it("Exact fit", () => {
    expect(
      placeDecor({
        viewport: { width: 176, height: 176 },
        size: { width: 144, height: 144 },
        reserved: [],
        random: seq(0.7, 0.3),
      }),
    ).toEqual({ x: 16 / 176, y: 16 / 176 });
  });
});

// ---------------------------------------------------------------------------
// Decor rect for the current viewport
// ---------------------------------------------------------------------------

describe("page-decor: Decor rect for the current viewport", () => {
  it("Same viewport", () => {
    expect(decorRect({ x: 580 / 1280, y: 320 / 720 }, CAT, VIEWPORT)).toEqual({
      left: 580,
      top: 320,
      width: 120,
      height: 80,
    });
  });

  it("Smaller viewport scales", () => {
    expect(decorRect({ x: 580 / 1280, y: 320 / 720 }, CAT, { width: 640, height: 360 })).toEqual({
      left: 290,
      top: 160,
      width: 120,
      height: 80,
    });
  });

  it("Clamped into the viewport", () => {
    expect(decorRect({ x: 0.95, y: 0.95 }, CAT, VIEWPORT)).toEqual({
      left: 1160,
      top: 640,
      width: 120,
      height: 80,
    });
    expect(
      decorRect({ x: 0.5, y: 0.5 }, { width: 144, height: 144 }, { width: 100, height: 100 }),
    ).toEqual({ left: 0, top: 0, width: 144, height: 144 });
  });
});
