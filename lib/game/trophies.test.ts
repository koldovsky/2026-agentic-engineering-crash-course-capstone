import { describe, expect, it } from "vitest";
import { evaluateAchievements, getAchievementStats } from "./achievements";
import {
  clearTrophies,
  createInitialTrophies,
  CURRENT_TROPHIES_VERSION,
  loadTrophies,
  parseTrophies,
  saveTrophies,
  serializeTrophies,
  TROPHIES_BACKUP_KEY,
  TROPHIES_KEY,
  validateTrophies,
} from "./trophies";
import type {
  AchievementId,
  GameState,
  HelperId,
  KeyValueStorage,
  LeveledUpgradeId,
  Trophies,
  TrophyStats,
} from "./types";

// ---------------------------------------------------------------------------
// Fakes and notation (openspec/changes/add-content-v3/design.md: T0, TR({...}), TF(...), ST0,
// FRESH, S({...}))
// ---------------------------------------------------------------------------

interface FakeStorage extends KeyValueStorage {
  readonly data: Map<string, string>;
  readonly writtenKeys: string[];
}

function createMemoryStorage(initial: Record<string, string> = {}): FakeStorage {
  const data = new Map<string, string>(Object.entries(initial));
  const writtenKeys: string[] = [];
  return {
    data,
    writtenKeys,
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
      writtenKeys.push(key);
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function createThrowingStorage(): KeyValueStorage {
  return {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      throw new Error("SecurityError");
    },
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

function TF(trophies: unknown): string {
  return JSON.stringify({ version: 1, trophies });
}

const ALL_IDS: readonly AchievementId[] = [
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

// ---------------------------------------------------------------------------
// Trophy file format and validation
// ---------------------------------------------------------------------------

describe("game-persistence: Trophy file format and validation", () => {
  it("Constants and the empty trophy case", () => {
    expect(TROPHIES_KEY).toBe("dopamine-clicker:trophies");
    expect(TROPHIES_BACKUP_KEY).toBe("dopamine-clicker:trophies:bad");
    expect(CURRENT_TROPHIES_VERSION).toBe(1);

    expect(createInitialTrophies()).toStrictEqual({
      unlocked: [],
      stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 },
    });

    const a = createInitialTrophies();
    const b = createInitialTrophies();
    expect(a).not.toBe(b);
    expect(a.unlocked).not.toBe(b.unlocked);
    expect(a.stats).not.toBe(b.stats);
  });

  it("Serialize trophies", () => {
    expect(
      JSON.parse(serializeTrophies(TR({ unlocked: ["first-click", "cat-nap"], stats: { crits: 5, resets: 2 } }))),
    ).toStrictEqual({
      version: 1,
      trophies: {
        unlocked: ["first-click", "cat-nap"],
        stats: { crits: 5, goldenCaught: 0, maxComboLevel: 0, resets: 2 },
      },
    });
  });

  it("Serialize writes only schema fields", () => {
    const withExtras = {
      ...TR({ unlocked: ["first-click"] }),
      savedAt: 123,
      stats: { ...ST0, crits: 1, streak: 7 },
    } as unknown as Trophies;
    const parsed = JSON.parse(serializeTrophies(withExtras));
    expect(parsed).toStrictEqual({
      version: 1,
      trophies: TR({ unlocked: ["first-click"], stats: { crits: 1 } }),
    });
    expect(parsed.trophies).not.toHaveProperty("savedAt");
    expect(parsed.trophies.stats).not.toHaveProperty("streak");
  });

  it("Valid trophy files accepted", () => {
    const full = TR({
      unlocked: ALL_IDS,
      stats: { crits: 9007199254740991, goldenCaught: 12, maxComboLevel: 10, resets: 3 },
    });
    expect(validateTrophies(T0)).toStrictEqual(T0);
    expect(validateTrophies(TR({ unlocked: ["first-click"] }))).toStrictEqual(
      TR({ unlocked: ["first-click"] }),
    );
    expect(validateTrophies(full)).toStrictEqual(full);
  });

  it("Trophies are normalized", () => {
    const result = validateTrophies({
      unlocked: ["cat-nap", "first-click", "not-real"],
      stats: { crits: 1, goldenCaught: 0, maxComboLevel: 0, resets: 0, streak: 7 },
      extra: "x",
    });
    expect(result).toStrictEqual(TR({ unlocked: ["first-click", "cat-nap"], stats: { crits: 1 } }));
    expect(result).not.toHaveProperty("extra");
  });

  it.each([
    ["null", null],
    ["42", 42],
    ['"text"', "text"],
    ["[]", []],
    ["{}", {}],
    ["no stats", { unlocked: [] }],
    ["no unlocked", { stats: ST0 }],
    ["unlocked is a string", { unlocked: "first-click", stats: ST0 }],
    ["duplicate id", { unlocked: ["first-click", "first-click"], stats: ST0 }],
    ["stats null", { unlocked: [], stats: null }],
    ["stats array", { unlocked: [], stats: [] }],
    ["stats empty", { unlocked: [], stats: {} }],
    [
      "missing counter",
      { unlocked: [], stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0 } },
    ],
    ["negative crits", { unlocked: [], stats: { ...ST0, crits: -1 } }],
    ["fractional crits", { unlocked: [], stats: { ...ST0, crits: 1.5 } }],
    ["string crits", { unlocked: [], stats: { ...ST0, crits: "1" } }],
    ["NaN crits", { unlocked: [], stats: { ...ST0, crits: NaN } }],
    ["combo level above 10", { unlocked: [], stats: { ...ST0, maxComboLevel: 11 } }],
    ["combo level below 0", { unlocked: [], stats: { ...ST0, maxComboLevel: -1 } }],
  ])("Invalid trophy files rejected: %s", (_label, value) => {
    expect(validateTrophies(value)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Loading trophies with fallback
// ---------------------------------------------------------------------------

describe("game-persistence: Loading trophies with fallback", () => {
  it("Nothing stored", () => {
    const storage = createMemoryStorage();
    expect(loadTrophies(storage)).toStrictEqual({ trophies: T0, status: "fresh" });
    expect(storage.writtenKeys).toEqual([]);
  });

  it("Round trip", () => {
    const F = TR({
      unlocked: ["first-click", "clicks-100", "cat-nap"],
      stats: { crits: 42, goldenCaught: 3, maxComboLevel: 10, resets: 1 },
    });
    const storage = createMemoryStorage();
    expect(saveTrophies(storage, F)).toBe(true);
    expect(loadTrophies(storage)).toStrictEqual({ trophies: F, status: "loaded" });
    expect(JSON.parse(storage.getItem("dopamine-clicker:trophies") as string)).toStrictEqual({
      version: 1,
      trophies: F,
    });
    expect([...storage.data.keys()]).toEqual(["dopamine-clicker:trophies"]);
  });

  it("Corrupted trophy file is backed up", () => {
    const storage = createMemoryStorage({ "dopamine-clicker:trophies": "{not json" });
    expect(loadTrophies(storage)).toStrictEqual({ trophies: T0, status: "corrupted" });
    expect(storage.getItem("dopamine-clicker:trophies:bad")).toBe("{not json");
    expect(storage.getItem("dopamine-clicker:trophies")).toBe("{not json");
  });

  it("Unknown version is corrupted", () => {
    expect(
      parseTrophies(
        '{"version":2,"trophies":{"unlocked":[],"stats":{"crits":0,"goldenCaught":0,"maxComboLevel":0,"resets":0}}}',
      ),
    ).toStrictEqual({ trophies: T0, status: "corrupted" });
    expect(parseTrophies('{"version":0,"trophies":{}}')).toStrictEqual({
      trophies: T0,
      status: "corrupted",
    });
  });

  it("Invalid payload is corrupted", () => {
    expect(parseTrophies(TF({ unlocked: ["first-click", "first-click"], stats: ST0 }))).toStrictEqual(
      { trophies: T0, status: "corrupted" },
    );
    expect(parseTrophies(TF({ unlocked: [], stats: { ...ST0, resets: -1 } }))).toStrictEqual({
      trophies: T0,
      status: "corrupted",
    });
  });

  it("Null raw value is fresh, not corrupted", () => {
    expect(parseTrophies(null)).toStrictEqual({ trophies: T0, status: "fresh" });
  });

  it("Parsing a raw string never writes storage", () => {
    expect(parseTrophies("{not json")).toStrictEqual({ trophies: T0, status: "corrupted" });
  });

  it("Storage errors never throw", () => {
    const storage = createThrowingStorage();
    let loaded: unknown;
    let saved: boolean | undefined;
    expect(() => {
      loaded = loadTrophies(storage);
      saved = saveTrophies(storage, TR({ unlocked: ["first-click"] }));
      clearTrophies(storage);
    }).not.toThrow();
    expect(loaded).toStrictEqual({ trophies: T0, status: "fresh" });
    expect(saved).toBe(false);
  });

  it("Clearing removes only the trophy key", () => {
    const storage = createMemoryStorage({
      "dopamine-clicker:trophies": TF(TR({ unlocked: ["first-click"] })),
      "dopamine-clicker:trophies:bad": "{bad",
      "dopamine-clicker:save": JSON.stringify({ version: 4, state: FRESH }),
      "dopamine-clicker:theme": "dark",
    });
    clearTrophies(storage);
    expect(storage.getItem("dopamine-clicker:trophies")).toBeNull();
    expect(storage.getItem("dopamine-clicker:trophies:bad")).toBe("{bad");
    expect(storage.getItem("dopamine-clicker:save")).toBe(
      JSON.stringify({ version: 4, state: FRESH }),
    );
    expect(storage.getItem("dopamine-clicker:theme")).toBe("dark");
  });
});

// ---------------------------------------------------------------------------
// Reset keeps the trophy case (game-persistence "Reset progress with confirmation", design D12)
// ---------------------------------------------------------------------------

describe("game-persistence: Reset trophies keep the unlocked ids", () => {
  it("Reset trophies keep the unlocked ids", () => {
    const B = S({
      balance: 500,
      totalClicks: 1200,
      decor: [{ id: "sleeping-cat", position: null }],
    });
    const BT = TR({
      unlocked: [
        "first-click",
        "clicks-100",
        "clicks-1000",
        "first-purchase",
        "first-decor",
        "cat-nap",
      ],
      stats: { crits: 30, goldenCaught: 2, maxComboLevel: 7, resets: 0 },
    });

    const statsAfter: TrophyStats = { ...ST0, resets: BT.stats.resets + 1 };
    const unlockedAfter = evaluateAchievements(
      BT.unlocked,
      getAchievementStats(B, { unlocked: BT.unlocked, stats: statsAfter }),
    ).unlocked;

    expect({ unlocked: unlockedAfter, stats: statsAfter }).toStrictEqual(
      TR({
        unlocked: [
          "first-click",
          "clicks-100",
          "clicks-1000",
          "first-purchase",
          "first-decor",
          "cat-nap",
          "reset-once",
        ],
        stats: { resets: 1 },
      }),
    );

    const afterWipe = evaluateAchievements(
      unlockedAfter,
      getAchievementStats(FRESH, { unlocked: unlockedAfter, stats: statsAfter }),
    );
    expect(afterWipe.unlocked).toStrictEqual(unlockedAfter);
    expect(afterWipe.newlyUnlocked).toEqual([]);
  });
});
