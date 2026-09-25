import { getHelperRate } from "@/lib/game/helpers";
import { formatNumber } from "@/lib/i18n";
import type { GameState, HelperId } from "@/lib/game/types";
import type { TranslationKey } from "@/lib/i18n";
import { usePreferences } from "./PreferencesProvider";

interface HelperZoneProps {
  readonly state: GameState | null;
}

/** Display order of the zone, same as the catalog: monkey, robot, factory (design D6). */
const HELPER_IDS: readonly HelperId[] = ["monkey", "robot", "factory"];

const GLYPHS: Record<HelperId, string> = {
  monkey: "🐒",
  robot: "🤖",
  factory: "🏭",
};

/**
 * Fixed bottom-left zone (design D12). It is always rendered with its fixed size, even when empty,
 * so decor placement can reserve it. The helpers are purely visual: no button, clicks do nothing.
 */
export function HelperZone({ state }: HelperZoneProps) {
  const { t, language } = usePreferences();

  // Helpers sit at the right end of the zone: the bottom-left corner belongs to the Next.js
  // dev-tools overlay, which would otherwise swallow clicks meant for the page.
  return (
    <div
      data-testid="helpers"
      className="fixed bottom-4 left-4 z-10 flex h-24 w-72 items-end justify-end gap-3"
    >
      {HELPER_IDS.map((id) => {
        // Narrows `state` for `getHelperRate` below; the zone itself always keeps its box, even
        // before the save is loaded, because `reservedRects` measures it for decor placement.
        if (!state) {
          return null;
        }
        const count = state.helpers[id];
        if (count === 0) {
          return null;
        }
        return (
          <span
            key={id}
            data-testid={`helper-${id}`}
            role="img"
            aria-label={t(`helper.${id}.label` as TranslationKey, {
              count: formatNumber(count, language),
              // Each type shows its own rate, speed-ups included (design D4).
              rate: formatNumber(getHelperRate(state, id), language),
            })}
            className={`helper-${id} flex items-center gap-1 text-3xl`}
          >
            {/* Only the glyph animates: an animated root would never settle for a click. */}
            <span className={`helper-${id}-press`}>{GLYPHS[id]}</span>
            <span data-testid={`helper-${id}-count`} className="text-sm font-semibold text-muted">
              ×{formatNumber(count, language)}
            </span>
          </span>
        );
      })}
    </div>
  );
}
