import type { RandomSource } from "@/lib/game/types";

/**
 * Every random draw of the page (crit roll, golden interval, golden and decor placement) goes
 * through here. The hook is read at call time and only ever set by e2e (design D19); unset it is
 * exactly `Math.random`. `lib/` never reads it.
 */
export const pageRandom: RandomSource = () => (globalThis.__dcRandom ?? Math.random)();
