import { SAVE_KEY } from "@/lib/game/save";
import type { GameState, HelperId, LeveledUpgradeId } from "@/lib/game/types";
import { beforeEach, describe, expect, it } from "vitest";
import { buy, commitGame, getSavedStateSnapshot, resetGame, tick, toggle } from "./game-store";

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

function snapshot(): GameState {
  return getSavedStateSnapshot() as GameState;
}

beforeEach(() => {
  window.localStorage.clear();
  resetGame();
});

describe("game-store shop actions", () => {
  it("buy spends the balance, publishes the new state and saves it", () => {
    commitGame(S({ balance: 20, totalClicks: 12 }));
    buy("soft-shadow");

    expect(snapshot()).toEqual(
      S({ balance: 5, totalClicks: 12, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }),
    );
    const raw = window.localStorage.getItem(SAVE_KEY);
    expect(raw && JSON.parse(raw).state.ownedSkins).toEqual(["soft-shadow"]);
  });

  it("buy keeps the state when the purchase is refused", () => {
    const before = S({ balance: 1, totalClicks: 12 });
    commitGame(before);
    buy("soft-shadow");

    expect(snapshot()).toBe(before);
  });

  it("buy stores the decor position it is given", () => {
    commitGame(S({ balance: 200, totalClicks: 150 }));
    buy("lava-lamp", { decorPosition: { x: 0.25, y: 0.5 } });

    expect(snapshot().decor).toEqual([{ id: "lava-lamp", position: { x: 0.25, y: 0.5 } }]);
  });

  it("toggle flips an owned skin and leaves an unowned one untouched", () => {
    const owned = S({ totalClicks: 20, ownedSkins: ["squish"], enabledSkins: ["squish"] });
    commitGame(owned);

    toggle("squish");
    expect(snapshot().enabledSkins).toEqual([]);

    const afterToggle = snapshot();
    toggle("jumping-cap");
    expect(snapshot()).toBe(afterToggle);
  });

  it("tick only writes once a whole helper click is earned", () => {
    commitGame(S({ balance: 0, totalClicks: 30, helpers: { monkey: 1 } }));
    const before = snapshot();

    tick(400);
    expect(snapshot()).toBe(before);

    tick(600);
    expect(snapshot()).toEqual(S({ balance: 1, totalClicks: 31, helpers: { monkey: 1 } }));
  });

  it("tick keeps the carry across calls and resetGame clears it", () => {
    commitGame(S({ balance: 0, totalClicks: 30, helpers: { monkey: 1 } }));
    tick(900);
    resetGame();

    commitGame(S({ balance: 0, totalClicks: 30, helpers: { monkey: 1 } }));
    tick(100);
    expect(snapshot().balance).toBe(0);
  });
});
