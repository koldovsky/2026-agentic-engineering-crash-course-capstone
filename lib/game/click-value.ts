import type {
  ClickModifiers,
  CreditClick,
  GetClickModifiers,
  GetClickMultiplier,
  GetClickValue,
} from "./types";

/** Modifiers used by Stage 1: every click is worth exactly 1. */
export const NEUTRAL_CLICK_MODIFIERS: ClickModifiers = Object.freeze({
  multiplier: 1,
  combo: 1,
  crit: false,
  goldenBonus: 1,
});

/** Removes float artefacts without rounding the value itself (design D6 / D9). */
const exact = (value: number): number => Number(value.toFixed(6));

/**
 * value = 1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus (design D2), kept exact and
 * fractional (design D9): 3 × 1.1 is 3.3, 3 × 1.4 × 10 is 42.
 */
export const getClickValue: GetClickValue = (modifiers) =>
  exact(
    1 * modifiers.multiplier * modifiers.combo * (modifiers.crit ? 10 : 1) * modifiers.goldenBonus,
  );

/** Credits whole clicks and keeps the fractional remainder in memory (design D9). */
export const creditClick: CreditClick = (carry, value) => {
  const total = exact(carry + value);
  const credited = Math.floor(total);
  return { credited, carry: exact(total - credited) };
};

/** 3 with Triple click, else 2 with Double click, else 1 (specs/click-upgrades). */
export const getClickMultiplier: GetClickMultiplier = (state) => {
  if (state.upgrades.includes("triple-click")) {
    return 3;
  }
  return state.upgrades.includes("double-click") ? 2 : 1;
};

/**
 * Modifiers of one press: the upgrade multiplier plus each runtime factor whose upgrade is owned
 * (combo, crit level ≥ 1, golden button). Without a context everything but the multiplier is
 * neutral, exactly as in Stage 2.
 */
export const getClickModifiers: GetClickModifiers = (state, context) => ({
  multiplier: getClickMultiplier(state),
  combo: context && state.upgrades.includes("combo") ? context.comboMultiplier : 1,
  crit: context !== undefined && state.levels.crit >= 1 && context.crit,
  goldenBonus: context && state.upgrades.includes("golden-button") ? context.goldenBonus : 1,
});
