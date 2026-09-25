import { creditClick, getClickModifiers, getClickValue } from "./click-value";
import { createComboState, getComboMultiplier, registerComboClick } from "./combo";
import { rollCrit } from "./crit";
import { getGoldenBonus } from "./golden";
import type { CreateClickRuntime, PressMainButton } from "./types";

export const createClickRuntime: CreateClickRuntime = () => ({
  combo: createComboState(),
  golden: null,
});

/**
 * One main-button press: the combo is registered only while it is owned, the crit is rolled once
 * per press (never at level 0) and the exact click value is credited through the carry (design D9).
 */
export const pressMainButton: PressMainButton = ({ state, runtime, carry, nowMs, random }) => {
  const hasCombo = state.upgrades.includes("combo");
  // The press that builds the combo already benefits from its own level (design D7).
  const combo = hasCombo ? registerComboClick(runtime.combo, nowMs) : runtime.combo;
  const crit = rollCrit(state.levels.crit, random);

  const modifiers = getClickModifiers(state, {
    comboMultiplier: getComboMultiplier(combo, nowMs),
    crit,
    goldenBonus: getGoldenBonus(runtime.golden),
  });
  const value = getClickValue(modifiers);
  const credited = creditClick(carry, value);

  return {
    state: {
      ...state,
      balance: state.balance + credited.credited,
      totalClicks: state.totalClicks + 1,
    },
    runtime: hasCombo ? { combo, golden: runtime.golden } : runtime,
    value,
    credited: credited.credited,
    carry: credited.carry,
    crit: modifiers.crit,
  };
};
