import {
  advanceToastQueue,
  createToastQueue,
  enqueueToasts,
  evaluateAchievements,
  getAchievementStats,
} from "@/lib/game/achievements";
import { getComboLevel } from "@/lib/game/combo";
import { catchGolden, createGoldenState, tickGolden } from "@/lib/game/golden";
import { tickHelpers } from "@/lib/game/helpers";
import { createClickRuntime, pressMainButton } from "@/lib/game/press";
import { clearGame, loadGame, saveGame } from "@/lib/game/save";
import { buyItem } from "@/lib/game/shop";
import { toggleSkin } from "@/lib/game/skins";
import { createInitialState } from "@/lib/game/state";
import { createInitialTrophies, loadTrophies, saveTrophies } from "@/lib/game/trophies";
import type {
  AchievementId,
  BuyOptions,
  ClickRuntime,
  DecorPosition,
  GameState,
  PressResult,
  ShopItemId,
  SkinId,
  ToastQueue,
  Trophies,
  TrophyStats,
} from "@/lib/game/types";
import { pageRandom } from "./page-random";

// The saved game seen as an external store (mirrors components/preferences-store.ts): React reads
// it through useSyncExternalStore instead of copying it into local state. `null` until the browser
// snapshot is taken, which is exactly the "not loaded yet" state the main button stays disabled for
// (design D7). Every write (click, reset) goes through commitGame/resetGame below so the snapshot
// and localStorage never drift apart, even across a remount.

const listeners = new Set<() => void>();
let snapshot: GameState | null = null;

export function subscribeSavedState(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getSavedStateSnapshot(): GameState | null {
  snapshot ??= loadGame(window.localStorage).state;
  return snapshot;
}

/** Used for SSR and the hydration render: storage is unknown there. */
export function getServerSavedState(): GameState | null {
  return null;
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Persists `next` and publishes it as the new snapshot. */
export function commitGame(next: GameState): void {
  saveGame(window.localStorage, next);
  snapshot = next;
  emit();
}

/**
 * Wipes the save and publishes a fresh initial state as the new snapshot. The trophy case is not
 * game progress and survives: it only counts the reset and unlocks what the pre-reset state still
 * satisfies, silently (design D12).
 */
export function resetGame(): void {
  const previous = getSavedStateSnapshot();
  clearGame(window.localStorage);
  snapshot = createInitialState();
  carry = 0;
  runtime = createClickRuntime();
  clickCarry = 0;
  toasts = createToastQueue();
  pendingToasts = [];
  publishRuntime(0);
  emit();
  syncTrophies({
    state: previous ?? undefined,
    stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: readTrophies().stats.resets + 1 },
    silent: true,
  });
  // The cleared toast queue is published even when the trophy case itself did not change.
  publishTrophies();
}

// Fractional helper income in milli-clicks. It lives only here, never in the save (design D11).
let carry = 0;

// ---------------------------------------------------------------------------
// Trophy case (unlocked achievements, lifetime counters, toast queue) — design D12, D21
// ---------------------------------------------------------------------------

/**
 * What the achievements panel and the toast need. It is a store of its own, next to the save and
 * the click runtime: trophies change on ticks that must not re-render the screen's runtime
 * (the runtime snapshot stays referentially stable, design D17).
 */
export interface TrophiesSnapshot {
  readonly trophies: Trophies;
  readonly toasts: ToastQueue;
}

/** `null` until the trophy file has been read in the browser. */
let trophies: Trophies | null = null;
/** Runtime-only toast state; never saved (design D13). */
let toasts: ToastQueue = createToastQueue();
/**
 * Unlocks found without the player doing anything (the evaluation on load, a helper tick, the
 * reset). They never pop a toast on their own — a seeded or long-idle save would fire twenty at
 * once (design D13) — but they are not lost either: the next action the player takes flushes them
 * into the queue ahead of its own unlocks.
 */
let pendingToasts: readonly AchievementId[] = [];
let trophiesSnapshot: TrophiesSnapshot = { trophies: createInitialTrophies(), toasts };
const trophiesListeners = new Set<() => void>();

const SERVER_TROPHIES_SNAPSHOT: TrophiesSnapshot = {
  trophies: createInitialTrophies(),
  toasts: createToastQueue(),
};

export function subscribeTrophies(onStoreChange: () => void): () => void {
  trophiesListeners.add(onStoreChange);
  return () => {
    trophiesListeners.delete(onStoreChange);
  };
}

/** Reads (and on first call loads) the trophy file; a corrupted file starts an empty case. */
function readTrophies(): Trophies {
  if (trophies === null) {
    trophies = loadTrophies(window.localStorage).trophies;
    trophiesSnapshot = { trophies, toasts };
  }
  return trophies;
}

export function getTrophiesSnapshot(): TrophiesSnapshot {
  readTrophies();
  return trophiesSnapshot;
}

/** SSR and the hydration render never have a trophy file; one stable object keeps React happy. */
export function getServerTrophiesSnapshot(): TrophiesSnapshot {
  return SERVER_TROPHIES_SNAPSHOT;
}

function publishTrophies(): void {
  trophiesSnapshot = { trophies: readTrophies(), toasts };
  for (const listener of trophiesListeners) {
    listener();
  }
}

/** Counter changes of one action: `crits` / `goldenCaught` / `resets` add up, `maxComboLevel` is a high-water mark. */
interface CounterUpdate {
  readonly crits?: number;
  readonly goldenCaught?: number;
  readonly resets?: number;
  readonly maxComboLevel?: number;
}

interface SyncTrophiesOptions {
  readonly counters?: CounterUpdate;
  /** Replaces the counters outright (the reset, design D12). */
  readonly stats?: TrophyStats;
  /** Evaluate against this state instead of the current snapshot (the reset). */
  readonly state?: GameState;
  /** Unlocks are written but never enqueued as a toast (the initial load, design D13). */
  readonly silent?: boolean;
}

function applyCounters(stats: TrophyStats, update: CounterUpdate | undefined): TrophyStats {
  if (!update) {
    return stats;
  }
  return {
    crits: stats.crits + (update.crits ?? 0),
    goldenCaught: stats.goldenCaught + (update.goldenCaught ?? 0),
    maxComboLevel: Math.max(stats.maxComboLevel, update.maxComboLevel ?? 0),
    resets: stats.resets + (update.resets ?? 0),
  };
}

function sameTrophies(a: Trophies, b: Trophies): boolean {
  return (
    a.unlocked.length === b.unlocked.length &&
    a.unlocked.every((id, index) => id === b.unlocked[index]) &&
    a.stats.crits === b.stats.crits &&
    a.stats.goldenCaught === b.stats.goldenCaught &&
    a.stats.maxComboLevel === b.stats.maxComboLevel &&
    a.stats.resets === b.stats.resets
  );
}

/**
 * Applies the counter changes of one action, re-evaluates every achievement against the current
 * game state and persists the result. Writes only the trophy file, never the game save (D12), and
 * publishes only when something actually changed, so a quiet tick costs no re-render.
 */
function syncTrophies({ counters, stats, state, silent = false }: SyncTrophiesOptions = {}): void {
  const current = state ?? getSavedStateSnapshot();
  if (!current) {
    return;
  }
  const previous = readTrophies();
  const nextStats = stats ?? applyCounters(previous.stats, counters);
  const evaluation = evaluateAchievements(
    previous.unlocked,
    getAchievementStats(current, { unlocked: previous.unlocked, stats: nextStats }),
  );
  const next: Trophies = { unlocked: evaluation.unlocked, stats: nextStats };

  const changed = !sameTrophies(previous, next);
  if (changed) {
    trophies = next;
    saveTrophies(window.localStorage, next);
  }

  let queued = toasts;
  if (silent) {
    pendingToasts =
      evaluation.newlyUnlocked.length === 0
        ? pendingToasts
        : [...pendingToasts, ...evaluation.newlyUnlocked];
  } else {
    const announce = [...pendingToasts, ...evaluation.newlyUnlocked];
    pendingToasts = [];
    queued = announce.length === 0 ? toasts : enqueueToasts(toasts, announce);
  }
  const toastsChanged = queued !== toasts;
  toasts = queued;

  if (changed || toastsChanged) {
    publishTrophies();
  }
}

/**
 * First evaluation after the save and the trophy file are loaded: it fills the trophy case of a
 * long-time player without firing a toast storm (design D13). Called once from the screen.
 */
export function syncTrophiesOnLoad(): void {
  syncTrophies({ silent: true });
}

// ---------------------------------------------------------------------------
// Click runtime (combo, golden button, main-click carry) — never saved (design D2, D17)
// ---------------------------------------------------------------------------

/** What the screen needs to render the runtime: `now` drives the combo decay of the meter. */
export interface RuntimeSnapshot {
  readonly runtime: ClickRuntime;
  readonly now: number;
}

let runtime: ClickRuntime = createClickRuntime();
/** Fractional part of the main-click value, like the helper carry (design D9). */
let clickCarry = 0;
let runtimeSnapshot: RuntimeSnapshot = { runtime, now: 0 };
const runtimeListeners = new Set<() => void>();

const SERVER_RUNTIME_SNAPSHOT: RuntimeSnapshot = {
  runtime: createClickRuntime(),
  now: 0,
};

export function subscribeRuntime(onStoreChange: () => void): () => void {
  runtimeListeners.add(onStoreChange);
  return () => {
    runtimeListeners.delete(onStoreChange);
  };
}

export function getRuntimeSnapshot(): RuntimeSnapshot {
  return runtimeSnapshot;
}

/** SSR and the hydration render never have a runtime; one stable object keeps React happy. */
export function getServerRuntimeSnapshot(): RuntimeSnapshot {
  return SERVER_RUNTIME_SNAPSHOT;
}

function publishRuntime(now: number): void {
  runtimeSnapshot = { runtime, now };
  for (const listener of runtimeListeners) {
    listener();
  }
}

/** One main-button press: state and runtime move together, only the state is persisted. */
export function press(nowMs: number): PressResult | null {
  const state = getSavedStateSnapshot();
  if (!state) {
    return null;
  }
  const result = pressMainButton({
    state,
    runtime,
    carry: clickCarry,
    nowMs,
    random: pageRandom,
  });
  runtime = result.runtime;
  clickCarry = result.carry;
  publishRuntime(nowMs);
  commitGame(result.state);
  syncTrophies({
    counters: {
      crits: result.crit ? 1 : 0,
      maxComboLevel: getComboLevel(result.runtime.combo, nowMs),
    },
  });
  return result;
}

/** Catching is runtime only: no balance, no total clicks, no storage write (design D1). */
export function catchGoldenButton(): void {
  if (runtime.golden === null) {
    return;
  }
  const golden = catchGolden(runtime.golden, pageRandom);
  if (golden === runtime.golden) {
    return;
  }
  runtime = { ...runtime, golden };
  publishRuntime(runtimeSnapshot.now);
  // Trophy write only: catching still never touches the game save (design D12).
  syncTrophies({ counters: { goldenCaught: 1 } });
}

/** Buys one unit of `id`; a refused purchase leaves the state (and the save) untouched. */
export function buy(id: ShopItemId, options?: BuyOptions): void {
  const state = getSavedStateSnapshot();
  if (!state) {
    return;
  }
  const result = buyItem(state, id, options);
  if (result.ok) {
    // The countdown starts at the purchase, not at the next tick (design D8).
    if (id === "golden-button" && runtime.golden === null) {
      runtime = { ...runtime, golden: createGoldenState(pageRandom) };
      publishRuntime(runtimeSnapshot.now);
    }
    commitGame(result.state);
    syncTrophies();
  }
}

/** Toggles an owned skin; skins that are not owned are a no-op down in `toggleSkin`. */
export function toggle(id: SkinId): void {
  const state = getSavedStateSnapshot();
  if (!state) {
    return;
  }
  const next = toggleSkin(state, id);
  if (next !== state) {
    commitGame(next);
    syncTrophies();
  }
}

/**
 * True when the next tick would show a different runtime on screen, i.e. when publishing a new
 * snapshot is worth a re-render of the whole screen:
 * - the runtime object itself changed (golden spawn / lifetime / bonus countdown), or
 * - a combo meter is currently on screen, so the pure passage of time changes what it shows.
 *
 * The combo level is read at the last published `now`, so the tick that drops the meter to 0 is
 * still published (the screen needs it to hide the meter) and the ticks after it are not.
 */
function runtimeChangedOnScreen(state: GameState): boolean {
  if (runtime !== runtimeSnapshot.runtime) {
    return true;
  }
  return (
    state.upgrades.includes("combo") && getComboLevel(runtime.combo, runtimeSnapshot.now) > 0
  );
}

/**
 * One game tick: helpers plus the golden button. Only ticks that complete a whole helper click
 * write to storage (design D11); the runtime is published while it still moves on screen, so the
 * combo meter and the bonus timer keep counting down (design D17) without making a save that has
 * neither of them re-render ten times a second.
 */
export function tick(
  elapsedMs: number,
  nowMs?: number,
  /** Free spot for a new golden button; without it a spawn is skipped (design D8). */
  place: () => DecorPosition | null = () => null,
): void {
  const state = getSavedStateSnapshot();
  if (!state) {
    return;
  }
  const result = tickHelpers(state, carry, elapsedMs);
  carry = result.carry;

  if (state.upgrades.includes("golden-button")) {
    // A save that already owns the button gets its countdown on the first tick (design D8).
    const golden =
      runtime.golden === null
        ? createGoldenState(pageRandom)
        : tickGolden({ golden: runtime.golden, elapsedMs, random: pageRandom, place });
    if (golden !== runtime.golden) {
      runtime = { ...runtime, golden };
    }
  }

  // Unpublished ticks keep `runtimeSnapshot` referentially stable, which is what
  // useSyncExternalStore needs to skip the re-render (design D17).
  if (runtimeChangedOnScreen(state)) {
    publishRuntime(nowMs ?? runtimeSnapshot.now);
  }
  if (result.state !== state) {
    commitGame(result.state);
  }

  // The toast queue runs on the same 100 ms tick as everything else (design D13).
  const advanced = advanceToastQueue(toasts, elapsedMs);
  if (advanced !== toasts) {
    toasts = advanced;
    publishTrophies();
  }
  // Helper income is not an action of the player: what it unlocks waits for the next click.
  syncTrophies({ silent: true });
}
