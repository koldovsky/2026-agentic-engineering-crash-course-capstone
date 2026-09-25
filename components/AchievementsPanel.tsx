"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ACHIEVEMENTS, getAchievementStats } from "@/lib/game/achievements";
import { formatNumber } from "@/lib/i18n";
import type { Achievement, AchievementStats, GameState, Trophies } from "@/lib/game/types";
import { AchievementCheck, AchievementIcon } from "./AchievementIcons";
import { usePreferences } from "./PreferencesProvider";
import type { TranslationKey } from "@/lib/i18n";

interface AchievementsPanelProps {
  readonly state: GameState | null;
  readonly trophies: Trophies;
}

function nameKey(id: Achievement["id"]): TranslationKey {
  return `achievement.${id}.name` as TranslationKey;
}

function descriptionKey(id: Achievement["id"]): TranslationKey {
  return `achievement.${id}.description` as TranslationKey;
}

/**
 * Trigger plus the modal trophy case (design D14): all thirty achievements with their locked /
 * unlocked state and, for every goal above one, the current progress. Locked rows keep their real
 * name and description — a visible goal list is the point.
 */
export function AchievementsPanel({ state, trophies }: AchievementsPanelProps) {
  const { t, language } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = useCallback(() => setOpen(false), []);

  const unlocked = new Set(trophies.unlocked);
  // `achievementsUnlocked` is filled in by the evaluation; the panel shows the current size.
  const stats: AchievementStats | null = state
    ? { ...getAchievementStats(state, trophies), achievementsUnlocked: trophies.unlocked.length }
    : null;

  return (
    <>
      <button
        type="button"
        data-testid="achievements"
        onClick={() => setOpen(true)}
        className="rounded-full border border-foreground/20 px-3 py-1 text-xs font-medium"
      >
        {t("achievements.open")}
      </button>

      <dialog
        ref={dialogRef}
        data-testid="achievements-dialog"
        aria-labelledby={titleId}
        onClose={handleClose}
        className="m-auto max-h-[80vh] w-[28rem] max-w-[90vw] overflow-y-auto rounded-2xl border border-foreground/10 bg-background p-0 text-foreground backdrop:bg-black/40"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-foreground/10 bg-background px-6 pt-5 pb-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {t("achievements.title")}
            </h2>
            <p data-testid="achievements-count" className="mt-1 text-sm text-muted">
              {t("achievements.count", {
                unlocked: formatNumber(trophies.unlocked.length, language),
                total: formatNumber(ACHIEVEMENTS.length, language),
              })}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            data-testid="achievements-close"
            aria-label={t("achievements.close")}
            onClick={handleClose}
            className="achievement-close"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M6 6 18 18M18 6 6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <ul data-testid="achievements-list" className="flex flex-col gap-2 px-6 py-4">
          {ACHIEVEMENTS.map((achievement) => (
            <AchievementRow
              key={achievement.id}
              achievement={achievement}
              unlocked={unlocked.has(achievement.id)}
              stats={stats}
            />
          ))}
        </ul>
      </dialog>
    </>
  );
}

function AchievementRow({
  achievement,
  unlocked,
  stats,
}: {
  readonly achievement: Achievement;
  readonly unlocked: boolean;
  readonly stats: AchievementStats | null;
}) {
  const { t, language } = usePreferences();
  const current = stats ? Math.min(stats[achievement.metric], achievement.threshold) : 0;

  return (
    <li
      data-testid={`achievement-${achievement.id}`}
      data-unlocked={unlocked ? "true" : "false"}
      className="achievement-row"
    >
      <span className="achievement-icon">
        <AchievementIcon id={achievement.id} />
        {unlocked ? (
          <span className="achievement-check" data-testid={`achievement-check-${achievement.id}`}>
            <AchievementCheck />
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{t(nameKey(achievement.id))}</span>
        <span className="text-xs text-muted">{t(descriptionKey(achievement.id))}</span>
        <span className="text-xs font-semibold text-muted">
          {unlocked ? t("achievements.unlocked") : t("achievements.locked")}
        </span>
        {/* A goal of one is either done or not; a progress row would say nothing (design D14). */}
        {achievement.threshold > 1 && (
          <span
            data-testid={`achievement-progress-${achievement.id}`}
            className="text-xs text-muted"
          >
            {t("achievements.progress", {
              current: formatNumber(current, language),
              goal: formatNumber(achievement.threshold, language),
            })}
          </span>
        )}
      </span>
    </li>
  );
}
