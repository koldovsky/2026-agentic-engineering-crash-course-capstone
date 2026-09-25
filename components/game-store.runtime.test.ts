import type { GameState, HelperId, LeveledUpgradeId } from "@/lib/game/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitGame,
  getRuntimeSnapshot,
  getSavedStateSnapshot,
  press,
  resetGame,
  subscribeRuntime,
  tick,
} from "./game-store";

// A tick runs ten times a second and every published runtime snapshot re-renders the whole screen
// (GameScreen, ShopBox, HelperZone, DecorLayer). These tests pin *when* a tick publishes: only
// while something on screen depends on it — a combo meter that is decaying, or a runtime object
// that actually changed (golden spawn, lifetime, bonus). Everything else keeps the snapshot
// referentially stable, which is what useSyncExternalStore needs to skip the re-render.

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

let unsubscribe: (() => void) | null = null;

/** Subscribes for the rest of the test and returns the listener spy. */
function watchRuntime() {
  const listener = vi.fn();
  unsubscribe = subscribeRuntime(listener);
  return listener;
}

beforeEach(() => {
  window.localStorage.clear();
  resetGame();
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = null;
  globalThis.__dcRandom = undefined;
});

describe("game-store: tick publishing", () => {
  it("does not re-publish for a save without combo and without the golden button", () => {
    commitGame(S({ totalClicks: 300, helpers: { monkey: 1 } }));
    const listener = watchRuntime();
    const before = getRuntimeSnapshot();

    for (let i = 1; i <= 10; i += 1) {
      tick(100, i * 100);
    }

    expect(listener).not.toHaveBeenCalled();
    expect(getRuntimeSnapshot()).toBe(before);
  });

  it("still credits helper income on a tick that publishes nothing", () => {
    commitGame(S({ totalClicks: 9000, helpers: { monkey: 1 } }));
    const listener = watchRuntime();

    tick(1000, 1000);

    expect(getSavedStateSnapshot()?.balance).toBe(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not re-publish while an owned combo has nothing on screen", () => {
    commitGame(S({ totalClicks: 300, upgrades: ["combo"] }));
    // A single press never reaches level 1, so the meter stays hidden (design D7).
    press(0);
    const listener = watchRuntime();
    const before = getRuntimeSnapshot();

    tick(100, 100);
    tick(100, 200);

    expect(listener).not.toHaveBeenCalled();
    expect(getRuntimeSnapshot()).toBe(before);
  });

  it("publishes while the combo meter decays and stops once it is gone", () => {
    commitGame(S({ totalClicks: 300, upgrades: ["combo"] }));
    press(0);
    press(100);
    const listener = watchRuntime();

    tick(100, 200);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getRuntimeSnapshot().now).toBe(200);

    // 600 ms of idle: the meter drops to level 0 at this `now`, so the screen still needs it.
    tick(500, 700);
    expect(listener).toHaveBeenCalledTimes(2);
    const last = getRuntimeSnapshot();
    expect(last.now).toBe(700);

    // From here the meter is gone and the runtime no longer moves: nothing to publish.
    tick(100, 800);
    tick(100, 900);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getRuntimeSnapshot()).toBe(last);
  });

  it("publishes every tick while the golden button counts down", () => {
    globalThis.__dcRandom = () => 0.5;
    commitGame(S({ totalClicks: 700, upgrades: ["golden-button"] }));
    const listener = watchRuntime();

    // The first tick creates the countdown, the next ones move it (design D8).
    tick(100, 100);
    tick(100, 200);
    tick(100, 300);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(getRuntimeSnapshot().now).toBe(300);
    expect(getRuntimeSnapshot().runtime.golden?.nextSpawnMs).toBe(60_000 - 200);
  });
});
