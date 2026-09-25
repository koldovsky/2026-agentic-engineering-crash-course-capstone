import { MAX_TICK_MS } from "./helpers";
import type {
  CatchGolden,
  CreateGoldenState,
  GetGoldenBonus,
  RollGoldenInterval,
  Size,
  TickGolden,
} from "./types";

/** Shortest / longest random pause between two golden buttons (design D8). */
export const GOLDEN_MIN_INTERVAL_MS = 30000;
export const GOLDEN_MAX_INTERVAL_MS = 90000;

/** How long one golden button stays on screen (design D8). */
export const GOLDEN_LIFETIME_MS = 5000;

/** Click value multiplier while the bonus runs, and how long it runs (design D8). */
export const GOLDEN_BONUS = 7;
export const GOLDEN_BONUS_MS = 30000;

/** On-screen size of the golden button in CSS px (design D8). */
export const GOLDEN_SIZE: Size = Object.freeze({ width: 64, height: 64 });

export const rollGoldenInterval: RollGoldenInterval = (random) =>
  GOLDEN_MIN_INTERVAL_MS +
  Math.floor(random() * (GOLDEN_MAX_INTERVAL_MS - GOLDEN_MIN_INTERVAL_MS + 1));

export const createGoldenState: CreateGoldenState = (random) => ({
  nextSpawnMs: rollGoldenInterval(random),
  visible: null,
  bonusMs: 0,
});

/**
 * One game tick: bonus first, then the visible button's lifetime, then the spawn countdown
 * (design D8). Elapsed time is clamped like a helper tick, so a throttled tab loses time instead
 * of spawning in bursts; leftover time is never carried into the next phase.
 */
export const tickGolden: TickGolden = ({ golden, elapsedMs, random, place }) => {
  const elapsed = Number.isFinite(elapsedMs) ? Math.min(Math.max(elapsedMs, 0), MAX_TICK_MS) : 0;
  if (elapsed === 0) {
    return golden;
  }
  const bonusMs = Math.max(0, golden.bonusMs - elapsed);

  if (golden.visible !== null) {
    const remainingMs = golden.visible.remainingMs - elapsed;
    if (remainingMs <= 0) {
      return { nextSpawnMs: rollGoldenInterval(random), visible: null, bonusMs };
    }
    return {
      nextSpawnMs: golden.nextSpawnMs,
      visible: { position: golden.visible.position, remainingMs },
      bonusMs,
    };
  }

  const nextSpawnMs = golden.nextSpawnMs - elapsed;
  if (nextSpawnMs > 0) {
    return { nextSpawnMs, visible: null, bonusMs };
  }
  const position = place();
  if (position === null) {
    // No free spot on screen: skip this spawn and wait for a fresh interval.
    return { nextSpawnMs: rollGoldenInterval(random), visible: null, bonusMs };
  }
  return { nextSpawnMs: 0, visible: { position, remainingMs: GOLDEN_LIFETIME_MS }, bonusMs };
};

export const catchGolden: CatchGolden = (golden, random) => {
  if (golden.visible === null) {
    return golden;
  }
  // A running bonus is restarted, never stacked (design D11).
  return { nextSpawnMs: rollGoldenInterval(random), visible: null, bonusMs: GOLDEN_BONUS_MS };
};

export const getGoldenBonus: GetGoldenBonus = (golden) =>
  golden !== null && golden.bonusMs > 0 ? GOLDEN_BONUS : 1;
