import { CURRENT_SAVE_VERSION, SAVE_KEY } from "@/lib/game/save";
import type { GameState, HelperId, LeveledUpgradeId } from "@/lib/game/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitGame,
  getSavedStateSnapshot,
  getServerSavedState,
  resetGame,
  subscribeSavedState,
} from "./game-store";

type StateOverrides = Partial<Omit<GameState, "helpers" | "levels">> & {
  readonly helpers?: Partial<Record<HelperId, number>>;
  readonly levels?: Partial<Record<LeveledUpgradeId, number>>;
};

// Notation from openspec/changes/add-upgrades-v2/design.md: S({...}) = FRESH with fields
// replaced, `helpers` and `levels` shallow-merged into their defaults.
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
    levels: {
      crit: 0,
      "speed-monkey": 0,
      "speed-robot": 0,
      "speed-factory": 0,
      ...levels,
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  // Also resets the module's in-memory snapshot to a known, fresh state before each test.
  resetGame();
});

describe("game-store", () => {
  it("server snapshot is always null so the main button stays disabled until loaded (D7)", () => {
    expect(getServerSavedState()).toBeNull();
  });

  it("commitGame persists to storage and publishes the exact reference as the new snapshot", () => {
    const next = S({ balance: 3, totalClicks: 3 });
    commitGame(next);

    expect(getSavedStateSnapshot()).toBe(next);
    const raw = window.localStorage.getItem(SAVE_KEY);
    expect(raw && JSON.parse(raw)).toEqual({
      version: CURRENT_SAVE_VERSION,
      state: S({ balance: 3, totalClicks: 3 }),
    });
  });

  it("keeps a referentially stable snapshot between reads with no writes in between", () => {
    commitGame(S({ balance: 1, totalClicks: 1 }));
    expect(getSavedStateSnapshot()).toBe(getSavedStateSnapshot());
  });

  it("resetGame clears storage and publishes a fresh state (remount-safe, no stale local state)", () => {
    commitGame(S({ balance: 9, totalClicks: 9 }));
    resetGame();

    expect(getSavedStateSnapshot()).toEqual(S());
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it("notifies subscribers on commit and reset, and stops once unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSavedState(listener);

    commitGame(S({ balance: 1, totalClicks: 1 }));
    expect(listener).toHaveBeenCalledTimes(1);

    resetGame();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    commitGame(S({ balance: 2, totalClicks: 2 }));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
