"use client";

import type { ToastQueue } from "@/lib/game/types";
import { usePreferences } from "./PreferencesProvider";
import type { TranslationKey } from "@/lib/i18n";

/**
 * One toast at a time, bottom-centre (design D13). The queue itself lives in the store and is
 * advanced by the game tick, so the toast never overlaps the next one and the gap is respected.
 */
export function AchievementToast({ queue }: { readonly queue: ToastQueue }) {
  const { t } = usePreferences();

  if (queue.current === null) {
    return null;
  }

  return (
    <div
      data-testid="achievement-toast"
      role="status"
      aria-live="polite"
      className="achievement-toast pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-foreground/10 bg-background/95 px-4 py-2 text-sm font-semibold shadow-lg"
    >
      {t("achievements.toast", { name: t(`achievement.${queue.current}.name` as TranslationKey) })}
    </div>
  );
}
