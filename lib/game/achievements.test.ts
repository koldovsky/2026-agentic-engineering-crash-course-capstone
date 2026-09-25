import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_TOAST_GAP_MS,
  ACHIEVEMENT_TOAST_MS,
  ACHIEVEMENTS,
  advanceToastQueue,
  createToastQueue,
  enqueueToasts,
  evaluateAchievements,
  getAchievement,
  getAchievementProgress,
  getAchievementStats,
  isAchievementUnlocked,
} from "./achievements";
import { getClickModifiers, getClickValue } from "./click-value";
import { getHelperClicksPerSecond } from "./helpers";
import { isItemRevealed, getItemPrice } from "./shop";
import { createInitialState } from "./state";
import type {
  Achievement,
  AchievementId,
  AchievementMetric,
  AchievementStats,
  GameState,
  HelperId,
  LeveledUpgradeId,
  ToastQueue,
  Trophies,
  TrophyStats,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from openspec/changes/add-content-v3/design.md: FRESH, S({...}) with merged
// `helpers` / `levels`, A({...}), T0, TR({...}), ST0)
// ---------------------------------------------------------------------------

type StateOverrides = Partial<Omit<GameState, "helpers" | "levels">> & {
  readonly helpers?: Partial<Record<HelperId, number>>;
  readonly levels?: Partial<Record<LeveledUpgradeId, number>>;
};

function fresh(): GameState {
  return {
    balance: 0,
    totalClicks: 0,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    videos: [],
    upgrades: [],
    helpers: { monkey: 0, robot: 0, factory: 0 },
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
  };
}

const FRESH: GameState = fresh();

function S({ helpers, levels, ...rest }: StateOverrides = {}): GameState {
  const base = fresh();
  return {
    ...base,
    ...rest,
    helpers: { ...base.helpers, ...helpers },
    levels: { ...base.levels, ...levels },
  };
}

const ST0: TrophyStats = { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 };

const T0: Trophies = { unlocked: [], stats: { ...ST0 } };

function TR({
  unlocked = [],
  stats,
}: {
  readonly unlocked?: readonly AchievementId[];
  readonly stats?: Partial<TrophyStats>;
} = {}): Trophies {
  return { unlocked, stats: { ...ST0, ...stats } };
}

const ZERO_STATS: AchievementStats = {
  totalClicks: 0,
  balance: 0,
  purchases: 0,
  skinsOwned: 0,
  goldEquipped: 0,
  decorOwned: 0,
  catOwned: 0,
  videosOwned: 0,
  helpersTotal: 0,
  factories: 0,
  crits: 0,
  maxComboLevel: 0,
  goldenCaught: 0,
  resets: 0,
  achievementsUnlocked: 0,
};

/** `A({...})` of the notation: every metric 0 except the listed ones. */
function A(overrides: Partial<Record<AchievementMetric, number>> = {}): AchievementStats {
  return { ...ZERO_STATS, ...overrides };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

const CATALOG_IDS: readonly AchievementId[] = [
  "first-click",
  "clicks-100",
  "clicks-1000",
  "clicks-10000",
  "clicks-100000",
  "balance-1000",
  "balance-50000",
  "first-purchase",
  "purchases-10",
  "purchases-25",
  "skins-3",
  "skins-all",
  "gold-equipped",
  "first-decor",
  "decor-all",
  "cat-nap",
  "first-video",
  "videos-all",
  "first-helper",
  "helpers-10",
  "factory-owner",
  "first-crit",
  "crits-100",
  "combo-5",
  "combo-max",
  "first-golden",
  "golden-10",
  "reset-once",
  "achievements-10",
  "achievements-all",
];

const CATALOG: readonly Achievement[] = [
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
];

// ---------------------------------------------------------------------------
// Achievement catalog
// ---------------------------------------------------------------------------

describe("achievements: Achievement catalog", () => {
  it("Catalog ids and order", () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual(CATALOG_IDS);
    expect(ACHIEVEMENTS.length).toBe(30);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(30);
  });

  it("Catalog entries", () => {
    expect(ACHIEVEMENTS).toEqual(CATALOG);
    expect(getAchievement("clicks-1000")).toEqual({
      id: "clicks-1000",
      category: "clicks",
      metric: "totalClicks",
      threshold: 1000,
    });
    expect(getAchievement("gold-equipped")).toEqual({
      id: "gold-equipped",
      category: "skins",
      metric: "goldEquipped",
      threshold: 1,
    });
    expect(getAchievement("achievements-all")).toEqual({
      id: "achievements-all",
      category: "meta",
      metric: "achievementsUnlocked",
      threshold: 29,
    });
    for (const achievement of CATALOG) {
      expect(getAchievement(achievement.id)).toEqual(achievement);
    }
  });

  it("Unlock predicate and progress", () => {
    expect(isAchievementUnlocked(getAchievement("clicks-100"), A({ totalClicks: 99 }))).toBe(false);
    expect(isAchievementUnlocked(getAchievement("clicks-100"), A({ totalClicks: 100 }))).toBe(true);

    expect(
      [0, 25, 100, 4000].map((totalClicks) =>
        getAchievementProgress(getAchievement("clicks-100"), A({ totalClicks })),
      ),
    ).toEqual([0, 0.25, 1, 1]);
  });
});

// ---------------------------------------------------------------------------
// Achievement stats
// ---------------------------------------------------------------------------

describe("achievements: Achievement stats derived from the state and the trophy counters", () => {
  it("Fresh state has zero everywhere", () => {
    const stats = getAchievementStats(FRESH, T0);
    expect(stats).toStrictEqual(ZERO_STATS);
    expect(Object.values(stats).every((value) => value === 0)).toBe(true);
  });

  it("A rich state", () => {
    const R = S({
      balance: 1234,
      totalClicks: 90000,
      ownedSkins: ["soft-shadow", "squish", "gold"],
      enabledSkins: ["squish"],
      material: "gold",
      decor: [
        { id: "sleeping-cat", position: null },
        { id: "lava-lamp", position: { x: 0.5, y: 0.5 } },
      ],
      videos: [{ id: "video-runner", position: { x: 0.1, y: 0.1 } }],
      upgrades: ["double-click", "combo"],
      helpers: { monkey: 4, robot: 2, factory: 1 },
      levels: { crit: 2, "speed-monkey": 1 },
    });
    const RT = TR({ stats: { crits: 17, goldenCaught: 3, maxComboLevel: 8, resets: 2 } });
    // purchases per design D10 = ownedSkins 3 + decor 2 + videos 1 + upgrades 2
    //                          + helpers (4 + 2 + 1) + levels (2 + 1) = 18.
    // (specs/achievements/spec.md line 95 prints 16 for this state — arithmetic slip, reported.)
    expect(getAchievementStats(R, RT)).toStrictEqual({
      totalClicks: 90000,
      balance: 1234,
      purchases: 18,
      skinsOwned: 3,
      goldEquipped: 1,
      decorOwned: 2,
      catOwned: 1,
      videosOwned: 1,
      helpersTotal: 7,
      factories: 1,
      crits: 17,
      maxComboLevel: 8,
      goldenCaught: 3,
      resets: 2,
      achievementsUnlocked: 0,
    });
  });

  it("Gold owned but not equipped", () => {
    const stats = getAchievementStats(S({ ownedSkins: ["gold"], material: "classic" }), T0);
    expect(stats.goldEquipped).toBe(0);
    expect(stats.skinsOwned).toBe(1);
  });

  it("Cat detected only by its id", () => {
    expect(
      getAchievementStats(S({ decor: [{ id: "lava-lamp", position: null }] }), T0).catOwned,
    ).toBe(0);
    expect(
      getAchievementStats(S({ decor: [{ id: "sleeping-cat", position: null }] }), T0).catOwned,
    ).toBe(1);
  });

  it("Counters survive a wiped state", () => {
    const stats = getAchievementStats(
      FRESH,
      TR({ stats: { crits: 120, goldenCaught: 4, maxComboLevel: 10, resets: 2 } }),
    );
    expect(stats.crits).toBe(120);
    expect(stats.goldenCaught).toBe(4);
    expect(stats.maxComboLevel).toBe(10);
    expect(stats.resets).toBe(2);
    const stateDerived: readonly AchievementMetric[] = [
      "totalClicks",
      "balance",
      "purchases",
      "skinsOwned",
      "goldEquipped",
      "decorOwned",
      "catOwned",
      "videosOwned",
      "helpersTotal",
      "factories",
    ];
    expect(stateDerived.map((metric) => stats[metric])).toEqual(stateDerived.map(() => 0));
  });

  it("Stats do not mutate their inputs", () => {
    const state = deepFreeze(S({ totalClicks: 5 }));
    const trophies = deepFreeze(TR({ stats: { crits: 3 } }));
    expect(() => getAchievementStats(state, trophies)).not.toThrow();
    expect(state).toStrictEqual(S({ totalClicks: 5 }));
    expect(trophies).toStrictEqual(TR({ stats: { crits: 3 } }));
  });
});

// ---------------------------------------------------------------------------
// Fixed-point evaluation
// ---------------------------------------------------------------------------

describe("achievements: Fixed-point evaluation with sticky unlocks", () => {
  it("Nothing unlocks on a fresh state", () => {
    expect(evaluateAchievements([], getAchievementStats(FRESH, T0))).toStrictEqual({
      unlocked: [],
      newlyUnlocked: [],
    });
  });

  it("First click", () => {
    expect(
      evaluateAchievements([], getAchievementStats(S({ balance: 1, totalClicks: 1 }), T0)),
    ).toStrictEqual({ unlocked: ["first-click"], newlyUnlocked: ["first-click"] });
  });

  it("Several unlocks come back in catalog order", () => {
    expect(evaluateAchievements([], A({ totalClicks: 100, balance: 1000 }))).toStrictEqual({
      unlocked: ["first-click", "clicks-100", "balance-1000"],
      newlyUnlocked: ["first-click", "clicks-100", "balance-1000"],
    });
  });

  it("Already unlocked ids are not reported again", () => {
    expect(evaluateAchievements(["first-click"], A({ totalClicks: 100 }))).toStrictEqual({
      unlocked: ["first-click", "clicks-100"],
      newlyUnlocked: ["clicks-100"],
    });
  });

  it("Unlocks are sticky", () => {
    expect(
      evaluateAchievements(["clicks-1000", "balance-50000"], getAchievementStats(FRESH, T0)),
    ).toStrictEqual({ unlocked: ["clicks-1000", "balance-50000"], newlyUnlocked: [] });
  });

  it("Input order does not matter", () => {
    expect(evaluateAchievements(["balance-50000", "clicks-1000"], A()).unlocked).toEqual([
      "clicks-1000",
      "balance-50000",
    ]);
  });

  it("Unknown ids are dropped", () => {
    expect(
      evaluateAchievements(["not-an-achievement" as AchievementId, "first-click"], A()),
    ).toStrictEqual({ unlocked: ["first-click"], newlyUnlocked: [] });
  });

  it("The meta achievement counts the others", () => {
    expect(
      evaluateAchievements([], A({ totalClicks: 100000, balance: 50000, purchases: 25 }))
        .newlyUnlocked,
    ).toEqual([
      "first-click",
      "clicks-100",
      "clicks-1000",
      "clicks-10000",
      "clicks-100000",
      "balance-1000",
      "balance-50000",
      "first-purchase",
      "purchases-10",
      "purchases-25",
      "achievements-10",
    ]);
  });

  it("The last achievement closes the set", () => {
    const TWENTY_NINE = CATALOG_IDS.filter((id) => id !== "achievements-all");
    const result = evaluateAchievements(TWENTY_NINE, A());
    expect(result.newlyUnlocked).toEqual(["achievements-all"]);
    expect(result.unlocked).toEqual(CATALOG_IDS);
  });

  it("Evaluation does not mutate its inputs", () => {
    const unlocked = deepFreeze(["first-click"] as AchievementId[]);
    const stats = deepFreeze(A({ totalClicks: 100 }));
    expect(() => evaluateAchievements(unlocked, stats)).not.toThrow();
    expect(unlocked).toEqual(["first-click"]);
    expect(stats.achievementsUnlocked).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Toast queue
// ---------------------------------------------------------------------------

describe("achievements: Toast queue", () => {
  it("Constants and empty queue", () => {
    expect(ACHIEVEMENT_TOAST_MS).toBe(4000);
    expect(ACHIEVEMENT_TOAST_GAP_MS).toBe(300);
    expect(createToastQueue()).toStrictEqual({ current: null, remainingMs: 0, pending: [] });
    expect(createToastQueue()).not.toBe(createToastQueue());
  });

  it("Enqueue promotes the first id", () => {
    expect(enqueueToasts(createToastQueue(), ["first-click", "clicks-100"])).toStrictEqual({
      current: "first-click",
      remainingMs: 4000,
      pending: ["clicks-100"],
    });
  });

  it("Enqueue while a toast runs only appends", () => {
    const Q: ToastQueue = { current: "first-click", remainingMs: 1500, pending: ["clicks-100"] };
    expect(enqueueToasts(Q, ["balance-1000"])).toStrictEqual({
      current: "first-click",
      remainingMs: 1500,
      pending: ["clicks-100", "balance-1000"],
    });
  });

  it("Duplicates are ignored", () => {
    const Q: ToastQueue = { current: "first-click", remainingMs: 1500, pending: ["clicks-100"] };
    expect(enqueueToasts(Q, ["first-click", "clicks-100"])).toBe(Q);
    expect(enqueueToasts(Q, [])).toBe(Q);
  });

  it("One toast runs out and the next follows after the gap", () => {
    const Q: ToastQueue = { current: "first-click", remainingMs: 4000, pending: ["clicks-100"] };
    const steps: ToastQueue[] = [];
    let queue = Q;
    for (let i = 0; i < 4; i += 1) {
      queue = advanceToastQueue(queue, 1000);
      steps.push(queue);
    }
    expect(steps).toStrictEqual([
      { current: "first-click", remainingMs: 3000, pending: ["clicks-100"] },
      { current: "first-click", remainingMs: 2000, pending: ["clicks-100"] },
      { current: "first-click", remainingMs: 1000, pending: ["clicks-100"] },
      { current: null, remainingMs: 300, pending: ["clicks-100"] },
    ]);
    expect(advanceToastQueue(queue, 300)).toStrictEqual({
      current: "clicks-100",
      remainingMs: 4000,
      pending: [],
    });
  });

  it("The last toast leaves the queue idle", () => {
    const Q: ToastQueue = { current: "clicks-100", remainingMs: 100, pending: [] };
    const idle = advanceToastQueue(Q, 100);
    expect(idle).toStrictEqual({ current: null, remainingMs: 0, pending: [] });
    expect(advanceToastQueue(idle, 1000)).toBe(idle);
  });

  it("Elapsed time is clamped and never carried over", () => {
    const Q: ToastQueue = { current: "first-click", remainingMs: 4000, pending: ["clicks-100"] };
    expect(advanceToastQueue(Q, 5000)).toStrictEqual({
      current: "first-click",
      remainingMs: 3000,
      pending: ["clicks-100"],
    });
    expect(
      advanceToastQueue(
        { current: "first-click", remainingMs: 200, pending: ["clicks-100"] },
        1000,
      ),
    ).toStrictEqual({ current: null, remainingMs: 300, pending: ["clicks-100"] });
    expect(advanceToastQueue(Q, NaN)).toBe(Q);
    expect(advanceToastQueue(Q, -50)).toBe(Q);
  });
});

// ---------------------------------------------------------------------------
// Achievements are cosmetic only
// ---------------------------------------------------------------------------

describe("achievements: Unlocked achievements live in the trophy file", () => {
  it("The game state has no trophy fields", () => {
    expect(Object.keys(createInitialState())).toEqual([
      "balance",
      "totalClicks",
      "ownedSkins",
      "enabledSkins",
      "material",
      "decor",
      "videos",
      "upgrades",
      "helpers",
      "levels",
    ]);
  });
});

describe("achievements: Achievements are cosmetic only", () => {
  it("The economy does not know about trophies", () => {
    const B = S({ balance: 50, totalClicks: 99 });
    const T_FULL = TR({
      unlocked: CATALOG_IDS,
      stats: { crits: 100, goldenCaught: 10, maxComboLevel: 10, resets: 1 },
    });

    expect(getClickValue(getClickModifiers(B))).toBe(1);
    expect(getItemPrice(B, "monkey")).toBe(50);
    expect(isItemRevealed(B, "soft-shadow")).toBe(true);
    expect(getHelperClicksPerSecond(B)).toBe(0);

    const empty = getAchievementStats(B, T0);
    const full = getAchievementStats(B, T_FULL);
    const counters: readonly AchievementMetric[] = [
      "crits",
      "goldenCaught",
      "maxComboLevel",
      "resets",
    ];
    const differing = (Object.keys(empty) as AchievementMetric[]).filter(
      (metric) => empty[metric] !== full[metric],
    );
    expect(new Set(differing)).toEqual(new Set(counters));
  });
});
