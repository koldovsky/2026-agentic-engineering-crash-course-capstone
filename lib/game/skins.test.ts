import { describe, expect, it } from "vitest";
import { getButtonAppearance, isSkinActive, toggleSkin } from "./skins";
import type { GameState } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from design.md: FRESH, S({...}))
// ---------------------------------------------------------------------------

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

function S(overrides: Partial<GameState> = {}): GameState {
  return { ...fresh(), ...overrides };
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
// Skin toggle rules
// ---------------------------------------------------------------------------

describe("button-skins: Skin toggle rules", () => {
  it("Toggle a stack skin off and on", () => {
    const A = S({ ownedSkins: ["soft-shadow", "squish"], enabledSkins: ["soft-shadow", "squish"] });
    const off = toggleSkin(A, "soft-shadow");
    expect(off).toEqual(S({ ownedSkins: ["soft-shadow", "squish"], enabledSkins: ["squish"] }));
    const on = toggleSkin(off, "soft-shadow");
    expect(on).toEqual(A);
    expect(on.enabledSkins).toEqual(["soft-shadow", "squish"]);
  });

  it("Toggle Gold", () => {
    const G = S({ ownedSkins: ["gold"], material: "gold" });
    const off = toggleSkin(G, "gold");
    expect(off).toEqual(S({ ownedSkins: ["gold"], material: "classic" }));
    expect(toggleSkin(off, "gold")).toEqual(G);
  });

  it("Not owned is a no-op", () => {
    const N = S({ ownedSkins: ["squish"], enabledSkins: ["squish"] });
    expect(toggleSkin(N, "jumping-cap")).toBe(N);
    expect(toggleSkin(N, "gold")).toBe(N);
  });

  it("Stack and material are independent", () => {
    const M = S({
      ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"],
      enabledSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap"],
      material: "gold",
    });
    expect(getButtonAppearance(M)).toEqual({
      stack: ["soft-shadow", "squish", "floating-number", "jumping-cap"],
      material: "gold",
    });

    const goldOff = toggleSkin(M, "gold");
    expect(goldOff.enabledSkins).toEqual(M.enabledSkins);
    expect(goldOff.material).toBe("classic");

    const squishOff = toggleSkin(M, "squish");
    expect(squishOff.material).toBe("gold");
    expect(squishOff.enabledSkins).toEqual(["soft-shadow", "floating-number", "jumping-cap"]);
  });

  it("Active checks", () => {
    const M2 = S({ ownedSkins: ["squish", "gold"], enabledSkins: [], material: "gold" });
    expect(isSkinActive(M2, "squish")).toBe(false);
    expect(isSkinActive(M2, "gold")).toBe(true);
    expect(isSkinActive(M2, "soft-shadow")).toBe(false);
  });

  it("Fresh appearance", () => {
    expect(getButtonAppearance(FRESH)).toEqual({ stack: [], material: "classic" });
  });

  it("Toggle does not mutate", () => {
    const input = deepFreeze(S({ ownedSkins: ["squish"], enabledSkins: ["squish"] }));
    expect(() => toggleSkin(input, "squish")).not.toThrow();
    expect(input.enabledSkins).toEqual(["squish"]);
  });
});
