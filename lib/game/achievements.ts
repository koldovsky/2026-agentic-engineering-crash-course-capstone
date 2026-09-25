import { MAX_TICK_MS } from "./helpers";
import type {
  Achievement,
  AchievementId,
  AchievementStats,
  AdvanceToastQueue,
  CreateToastQueue,
  EnqueueToasts,
  EvaluateAchievements,
  GetAchievement,
  GetAchievementProgress,
  GetAchievementStats,
  IsAchievementUnlocked,
  ToastQueue,
} from "./types";

/** How long one achievement toast stays on screen (design D13). */
export const ACHIEVEMENT_TOAST_MS = 4000;

/** Pause between two toasts, so they never overlap (design D13). */
export const ACHIEVEMENT_TOAST_GAP_MS = 300;

/**
 * The 30 achievements in display order, which is also the canonical order of `trophies.unlocked`
 * (design D10). They are data, not closures: the predicate is always
 * `stats[metric] >= threshold`, so the catalog stays pure and exhaustively testable.
 */
export const ACHIEVEMENTS: readonly Achievement[] = Object.freeze([
  { id: "first-click", category: "clicks", metric: "totalClicks", threshold: 1 },
  { id: "clicks-100", category: "clicks", metric: "totalClicks", threshold: 100 },
  { id: "clicks-1000", category: "clicks", metric: "totalClicks", threshold: 1000 },
  { id: "clicks-10000", category: "clicks", metric: "totalClicks", threshold: 10000 },
  { id: "clicks-100000", category: "clicks", metric: "totalClicks", threshold: 100000 },
  { id: "balance-1000", category: "balance", metric: "balance", threshold: 1000 },
  { id: "balance-50000", category: "balance", metric: "balance", threshold: 50000 },
  { id: "first-purchase", category: "purchases", metric: "purchases", threshold: 1 },
  { id: "purchases-10", category: "purchases", metric: "purchases", threshold: 10 },
  { id: "purchases-25", category: "purchases", metric: "purchases", threshold: 25 },
  { id: "skins-3", category: "skins", metric: "skinsOwned", threshold: 3 },
  { id: "skins-all", category: "skins", metric: "skinsOwned", threshold: 5 },
  { id: "gold-equipped", category: "skins", metric: "goldEquipped", threshold: 1 },
  { id: "first-decor", category: "decor", metric: "decorOwned", threshold: 1 },
  { id: "decor-all", category: "decor", metric: "decorOwned", threshold: 3 },
  { id: "cat-nap", category: "decor", metric: "catOwned", threshold: 1 },
  { id: "first-video", category: "video", metric: "videosOwned", threshold: 1 },
  { id: "videos-all", category: "video", metric: "videosOwned", threshold: 11 },
  { id: "first-helper", category: "helpers", metric: "helpersTotal", threshold: 1 },
  { id: "helpers-10", category: "helpers", metric: "helpersTotal", threshold: 10 },
  { id: "factory-owner", category: "helpers", metric: "factories", threshold: 1 },
  { id: "first-crit", category: "crit", metric: "crits", threshold: 1 },
  { id: "crits-100", category: "crit", metric: "crits", threshold: 100 },
  { id: "combo-5", category: "combo", metric: "maxComboLevel", threshold: 5 },
  { id: "combo-max", category: "combo", metric: "maxComboLevel", threshold: 10 },
  { id: "first-golden", category: "golden", metric: "goldenCaught", threshold: 1 },
  { id: "golden-10", category: "golden", metric: "goldenCaught", threshold: 10 },
  { id: "reset-once", category: "reset", metric: "resets", threshold: 1 },
  { id: "achievements-10", category: "meta", metric: "achievementsUnlocked", threshold: 10 },
  { id: "achievements-all", category: "meta", metric: "achievementsUnlocked", threshold: 29 },
] as const satisfies readonly Achievement[]);

export const getAchievement: GetAchievement = (id) => {
  const achievement = ACHIEVEMENTS.find((candidate) => candidate.id === id);
  if (!achievement) {
    throw new Error(`Unknown achievement id: ${id}`);
  }
  return achievement;
};

export const isAchievementUnlocked: IsAchievementUnlocked = (achievement, stats) =>
  stats[achievement.metric] >= achievement.threshold;

export const getAchievementProgress: GetAchievementProgress = (achievement, stats) =>
  Math.min(1, Math.max(0, stats[achievement.metric] / achievement.threshold));

export const getAchievementStats: GetAchievementStats = (state, trophies) => {
  const helpersTotal = state.helpers.monkey + state.helpers.robot + state.helpers.factory;
  const levelsTotal = Object.values(state.levels).reduce((sum, level) => sum + level, 0);
  return {
    totalClicks: state.totalClicks,
    balance: state.balance,
    purchases:
      state.ownedSkins.length +
      state.decor.length +
      state.videos.length +
      state.upgrades.length +
      helpersTotal +
      levelsTotal,
    skinsOwned: state.ownedSkins.length,
    goldEquipped: state.material === "gold" ? 1 : 0,
    decorOwned: state.decor.length,
    catOwned: state.decor.some((entry) => entry.id === "sleeping-cat") ? 1 : 0,
    videosOwned: state.videos.length,
    helpersTotal,
    factories: state.helpers.factory,
    crits: trophies.stats.crits,
    maxComboLevel: trophies.stats.maxComboLevel,
    goldenCaught: trophies.stats.goldenCaught,
    resets: trophies.stats.resets,
    achievementsUnlocked: 0,
  };
};

export const evaluateAchievements: EvaluateAchievements = (unlocked, stats) => {
  const known = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
  const current = new Set(unlocked.filter((id) => known.has(id)));
  const added = new Set<AchievementId>();

  for (let pass = 0; pass < ACHIEVEMENTS.length; pass += 1) {
    const passStats: AchievementStats = { ...stats, achievementsUnlocked: current.size };
    let grew = false;
    for (const achievement of ACHIEVEMENTS) {
      if (current.has(achievement.id)) {
        continue;
      }
      if (isAchievementUnlocked(achievement, passStats)) {
        current.add(achievement.id);
        added.add(achievement.id);
        grew = true;
      }
    }
    if (!grew) {
      break;
    }
  }

  const inOrder = ACHIEVEMENTS.map((achievement) => achievement.id);
  return {
    unlocked: inOrder.filter((id) => current.has(id)),
    newlyUnlocked: inOrder.filter((id) => added.has(id)),
  };
};

export const createToastQueue: CreateToastQueue = () => ({
  current: null,
  remainingMs: 0,
  pending: [],
});

function isIdle(queue: ToastQueue): boolean {
  return queue.current === null && queue.remainingMs <= 0;
}

export const enqueueToasts: EnqueueToasts = (queue, ids) => {
  const added: AchievementId[] = [];
  for (const id of ids) {
    if (id === queue.current || queue.pending.includes(id) || added.includes(id)) {
      continue;
    }
    added.push(id);
  }
  if (added.length === 0) {
    return queue;
  }
  const pending = [...queue.pending, ...added];
  if (!isIdle(queue)) {
    return { ...queue, pending };
  }
  const [first, ...rest] = pending;
  return { current: first, remainingMs: ACHIEVEMENT_TOAST_MS, pending: rest };
};

export const advanceToastQueue: AdvanceToastQueue = (queue, elapsedMs) => {
  if (isIdle(queue)) {
    return queue;
  }
  const elapsed = Number.isFinite(elapsedMs)
    ? Math.min(Math.max(elapsedMs, 0), MAX_TICK_MS)
    : 0;
  if (elapsed === 0) {
    return queue;
  }
  const remainingMs = queue.remainingMs - elapsed;
  if (remainingMs > 0) {
    return { ...queue, remainingMs };
  }
  if (queue.current !== null) {
    // The toast ran out: wait for the gap before the next one, or go idle.
    return queue.pending.length > 0
      ? { current: null, remainingMs: ACHIEVEMENT_TOAST_GAP_MS, pending: queue.pending }
      : createToastQueue();
  }
  // The gap ran out: show the next toast.
  const [next, ...rest] = queue.pending;
  if (next === undefined) {
    return createToastQueue();
  }
  return { current: next, remainingMs: ACHIEVEMENT_TOAST_MS, pending: rest };
};
