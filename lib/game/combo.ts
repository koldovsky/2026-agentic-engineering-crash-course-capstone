import type {
  CreateComboState,
  GetComboLevel,
  GetComboMultiplier,
  RegisterComboClick,
} from "./types";

/** A press at most this long after the previous one is "fast" and builds the combo (design D7). */
export const COMBO_WINDOW_MS = 500;

/** One combo level is worth +0.1 on the multiplier (design D7). */
export const COMBO_STEP = 0.1;

/** Highest combo level; multiplier cap 1 + 10 × 0.1 = 2 (design D7). */
export const COMBO_MAX_LEVEL = 10;

/** After the window, one level is lost per started 250 ms of pause (design D7). */
export const COMBO_DECAY_MS = 250;

export const createComboState: CreateComboState = () => ({ level: 0, lastClickAt: null });

export const getComboLevel: GetComboLevel = (combo, nowMs) => {
  if (combo.lastClickAt === null) {
    return 0;
  }
  const idle = Math.max(0, nowMs - combo.lastClickAt);
  if (idle <= COMBO_WINDOW_MS) {
    return combo.level;
  }
  return Math.max(0, combo.level - Math.ceil((idle - COMBO_WINDOW_MS) / COMBO_DECAY_MS));
};

export const getComboMultiplier: GetComboMultiplier = (combo, nowMs) =>
  1 + getComboLevel(combo, nowMs) / 10;

export const registerComboClick: RegisterComboClick = (combo, nowMs) => {
  const level = getComboLevel(combo, nowMs);
  const isFast = combo.lastClickAt !== null && nowMs - combo.lastClickAt <= COMBO_WINDOW_MS;
  return {
    level: isFast ? Math.min(COMBO_MAX_LEVEL, level + 1) : level,
    lastClickAt: nowMs,
  };
};
