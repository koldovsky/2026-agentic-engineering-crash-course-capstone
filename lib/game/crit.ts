import type { GetCritChance, RollCrit } from "./types";

/** A crit counts ten clicks (design D10). */
export const CRIT_MULTIPLIER = 10;

/** Crit chance per level 0..3: 0 %, 5 %, 10 %, 15 % (design D10). */
export const CRIT_CHANCE_BY_LEVEL: readonly number[] = Object.freeze([0, 0.05, 0.1, 0.15]);

export const getCritChance: GetCritChance = (level) => {
  const index = Math.min(Math.max(Math.trunc(level), 0), CRIT_CHANCE_BY_LEVEL.length - 1);
  return CRIT_CHANCE_BY_LEVEL[index];
};

export const rollCrit: RollCrit = (level, random) => {
  if (level <= 0) {
    return false;
  }
  return random() < getCritChance(level);
};
