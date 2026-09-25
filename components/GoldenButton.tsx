import { decorRect } from "@/lib/game/decor";
import { GOLDEN_SIZE } from "@/lib/game/golden";
import type { GoldenSpawn } from "@/lib/game/types";
import { useViewport } from "./DecorLayer";
import { usePreferences } from "./PreferencesProvider";

interface GoldenButtonProps {
  readonly spawn: GoldenSpawn;
  readonly onCatch: () => void;
}

/**
 * The catchable golden button (design D8/D18): fixed at its placed rect, above the decor layer.
 * Only the inner glow animates — an animated root would never settle for a click.
 */
export function GoldenButton({ spawn, onCatch }: GoldenButtonProps) {
  const { t } = usePreferences();
  const viewport = useViewport();

  if (viewport === null) {
    return null;
  }
  const rect = decorRect(spawn.position, GOLDEN_SIZE, viewport);

  return (
    <button
      type="button"
      data-testid="golden-button"
      aria-label={t("golden.catch")}
      onClick={onCatch}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      className="golden-button fixed z-10 rounded-full"
    >
      <span aria-hidden="true" className="golden-button-glow" />
    </button>
  );
}
