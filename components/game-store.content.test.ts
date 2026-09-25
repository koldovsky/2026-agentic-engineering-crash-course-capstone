import { SAVE_KEY } from "@/lib/game/save";
import { TROPHIES_KEY, TROPHIES_BACKUP_KEY } from "@/lib/game/trophies";
import type { GameState, HelperId, LeveledUpgradeId, Trophies } from "@/lib/game/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stage 4 (design D12, D21): the trophy case is a store of its own next to the save and the click
// runtime. These tests pin what writes it (a crit, a catch, a purchase, the reset), that the game
// save is never written for a catch, and that a quiet tick keeps both snapshots referentially
// stable. The module is re-imported per test so its in-memory trophy file starts unread.

type Store = typeof import("./game-store");

type StateOverrides = Partial<Omit<GameState, "helpers" | "levels">> & {
  readonly helpers?: Partial<Record<HelperId, number>>;
  readonly levels?: Partial<Record<LeveledUpgradeId, number>>;
};

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
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0, ...levels },
  };
}

function readStoredTrophies(): { version: number; trophies: Trophies } | null {
  const raw = window.localStorage.getItem(TROPHIES_KEY);
  return raw === null ? null : JSON.parse(raw);
}

let store: Store;
let unsubscribe: (() => void) | null = null;

beforeEach(async () => {
  window.localStorage.clear();
  vi.resetModules();
  store = await import("./game-store");
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = null;
  globalThis.__dcRandom = undefined;
});

describe("game-store: trophy case", () => {
  it("serves one stable trophy snapshot for SSR", () => {
    expect(store.getServerTrophiesSnapshot()).toBe(store.getServerTrophiesSnapshot());
    expect(store.getServerTrophiesSnapshot()).toEqual({
      trophies: { unlocked: [], stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 } },
      toasts: { current: null, remainingMs: 0, pending: [] },
    });
  });

  it("unlocks silently on load: the trophy file is written, no toast is queued", () => {
    store.commitGame(S({ balance: 1500, totalClicks: 1500 }));
    store.syncTrophiesOnLoad();

    expect(store.getTrophiesSnapshot().trophies.unlocked).toEqual([
      "first-click",
      "clicks-100",
      "clicks-1000",
      "balance-1000",
    ]);
    expect(store.getTrophiesSnapshot().toasts.current).toBeNull();
    expect(readStoredTrophies()?.trophies.unlocked).toContain("clicks-1000");
  });

  it("a press counts crits and queues one toast per unlock", () => {
    store.commitGame(S({ totalClicks: 0, levels: { crit: 1 } }));
    globalThis.__dcRandom = () => 0.01;

    store.press(0);

    const { trophies, toasts } = store.getTrophiesSnapshot();
    expect(trophies.stats.crits).toBe(1);
    expect(trophies.unlocked).toEqual(["first-click", "first-purchase", "first-crit"]);
    expect(toasts.current).toBe("first-click");
    expect(toasts.pending).toEqual(["first-purchase", "first-crit"]);
  });

  it("catching a golden button writes the trophy file and never the game save", () => {
    globalThis.__dcRandom = () => 0.5;
    store.commitGame(S({ balance: 1000, totalClicks: 700, upgrades: ["golden-button"] }));
    // One tick creates the countdown, a long one spawns the button (design D8).
    const place = () => ({ x: 0.5, y: 0.5 });
    store.tick(1000, 1000, place);
    for (let i = 1; i <= 61; i += 1) {
      store.tick(1000, 1000 + i * 1000, place);
    }
    const savedBefore = window.localStorage.getItem(SAVE_KEY);

    store.catchGoldenButton();

    expect(store.getTrophiesSnapshot().trophies.stats.goldenCaught).toBe(1);
    expect(store.getTrophiesSnapshot().trophies.unlocked).toContain("first-golden");
    expect(window.localStorage.getItem(SAVE_KEY)).toBe(savedBefore);
  });

  it("a purchase unlocks through buy without touching the counters", () => {
    store.commitGame(S({ balance: 100, totalClicks: 100 }));
    store.syncTrophiesOnLoad();

    store.buy("soft-shadow");

    expect(store.getTrophiesSnapshot().trophies.unlocked).toContain("first-purchase");
    expect(store.getTrophiesSnapshot().trophies.stats).toEqual({
      crits: 0,
      goldenCaught: 0,
      maxComboLevel: 0,
      resets: 0,
    });
  });

  it("the reset counts itself, keeps the unlocked ids and stays silent", () => {
    store.commitGame(S({ balance: 500, totalClicks: 1200 }));
    store.syncTrophiesOnLoad();

    store.resetGame();

    expect(store.getTrophiesSnapshot().trophies).toEqual({
      unlocked: ["first-click", "clicks-100", "clicks-1000", "reset-once"],
      stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 1 },
    });
    expect(store.getTrophiesSnapshot().toasts.current).toBeNull();
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it("a tick that unlocks nothing publishes neither store", () => {
    store.commitGame(S({ totalClicks: 300, helpers: { monkey: 1 } }));
    store.syncTrophiesOnLoad();
    const runtimeListener = vi.fn();
    const trophyListener = vi.fn();
    const stopRuntime = store.subscribeRuntime(runtimeListener);
    unsubscribe = store.subscribeTrophies(trophyListener);
    const runtimeBefore = store.getRuntimeSnapshot();
    const trophiesBefore = store.getTrophiesSnapshot();

    for (let i = 1; i <= 10; i += 1) {
      store.tick(100, i * 100);
    }

    expect(runtimeListener).not.toHaveBeenCalled();
    expect(trophyListener).not.toHaveBeenCalled();
    expect(store.getRuntimeSnapshot()).toBe(runtimeBefore);
    expect(store.getTrophiesSnapshot()).toBe(trophiesBefore);
    stopRuntime();
  });

  it("the tick advances the toast queue: one toast, then the gap, then the next", () => {
    store.commitGame(S({ balance: 1000, totalClicks: 100 }));

    // Not silent: the unlocks of this state queue up behind each other (design D13).
    store.press(0);
    expect(store.getTrophiesSnapshot().toasts.current).toBe("first-click");

    for (let i = 1; i <= 40; i += 1) {
      store.tick(100, i * 100);
    }
    expect(store.getTrophiesSnapshot().toasts.current).toBeNull();

    store.tick(300, 4300);
    expect(store.getTrophiesSnapshot().toasts.current).toBe("clicks-100");
  });

  it("a corrupted trophy file starts an empty case and is backed up", () => {
    window.localStorage.setItem(TROPHIES_KEY, "{not json");
    store.commitGame(S({ totalClicks: 150 }));

    // The first read of the store loads (and backs up) the file.
    expect(store.getTrophiesSnapshot().trophies.unlocked).toEqual([]);
    store.syncTrophiesOnLoad();

    expect(store.getTrophiesSnapshot().trophies.unlocked).toEqual(["first-click", "clicks-100"]);
    expect(window.localStorage.getItem(TROPHIES_BACKUP_KEY)).toBe("{not json");
  });
});
