import { describe, expect, it } from "vitest";
import {
  clearGame,
  CURRENT_SAVE_VERSION,
  loadGame,
  migrateSave,
  migrateV1ToV2,
  migrateV2ToV3,
  migrateV3ToV4,
  MIGRATIONS,
  parseSave,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  saveGame,
  serializeGame,
  validateGameState,
} from "./save";
import type {
  GameState,
  GameStateV2,
  GameStateV3,
  HelperId,
  KeyValueStorage,
  LeveledUpgradeId,
  MigrationTable,
  ParseSaveOptions,
} from "./types";

// ---------------------------------------------------------------------------
// Fakes and notation (openspec/changes/add-content-v3/design.md: FRESH, S({...}) with
// merged `helpers` / `levels`, S2({...}), S3({...}), V2(...), V3(...), V4(...);
// specs/game-persistence: RAW_V1(b, t), L0)
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

function createThrowingStorage(overrides: Partial<KeyValueStorage> = {}): KeyValueStorage {
  return {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    ...overrides,
  };
}

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

/** `L0` of the spec notation: the fresh level map. */
const L0 = FRESH.levels;

function S({ helpers, levels, ...rest }: StateOverrides = {}): GameState {
  const base = fresh();
  return {
    ...base,
    ...rest,
    helpers: { ...base.helpers, ...helpers },
    levels: { ...base.levels, ...levels },
  };
}

/** The Stage 2 (v2) payload shape; no merging of `helpers` (design notation S2). */
function S2(overrides: Partial<GameStateV2> = {}): GameStateV2 {
  return {
    balance: 0,
    totalClicks: 0,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    upgrades: [],
    helpers: { monkey: 0 },
    ...overrides,
  };
}

function V2(state: GameStateV2): string {
  return JSON.stringify({ version: 2, state });
}

/** The Stage 3 (v3) payload shape: the v4 state without `videos` (design notation S3). */
type V3Overrides = Partial<Omit<GameStateV3, "helpers" | "levels">> & {
  readonly helpers?: Partial<Record<HelperId, number>>;
  readonly levels?: Partial<Record<LeveledUpgradeId, number>>;
};

function S3({ helpers, levels, ...rest }: V3Overrides = {}): GameStateV3 {
  return {
    balance: 0,
    totalClicks: 0,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    upgrades: [],
    ...rest,
    helpers: { monkey: 0, robot: 0, factory: 0, ...helpers },
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0, ...levels },
  };
}

function V3(state: GameStateV3): string {
  return JSON.stringify({ version: 3, state });
}

function V4(state: GameState): string {
  return JSON.stringify({ version: 4, state });
}

function RAW_V1(balance: number, totalClicks: number): string {
  return `{"version":1,"state":{"balance":${balance},"totalClicks":${totalClicks}}}`;
}

const addBonus: MigrationTable = {
  1: (s) => ({ ...(s as Record<string, unknown>), bonus: 0 }),
};

// ---------------------------------------------------------------------------
// Versioned save format
// ---------------------------------------------------------------------------

describe("game-persistence: Versioned save format", () => {
  it("Constants", () => {
    expect(SAVE_KEY).toBe("dopamine-clicker:save");
    expect(SAVE_BACKUP_KEY).toBe("dopamine-clicker:save:bad");
    expect(CURRENT_SAVE_VERSION).toBe(4);
  });

  it("Serialize state", () => {
    expect(JSON.parse(serializeGame(S({ balance: 12, totalClicks: 30 })))).toStrictEqual({
      version: 4,
      state: S({ balance: 12, totalClicks: 30 }),
    });
  });

  it("Serialize writes only schema fields", () => {
    const withRuntime = {
      ...S({
        balance: 1,
        totalClicks: 1,
        decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }],
        videos: [{ id: "video-runner", position: null }],
      }),
      carry: 400,
      clickCarry: 0.5,
      savedAt: 123,
      combo: { level: 3, lastClickAt: 5 },
      golden: { nextSpawnMs: 0, visible: null, bonusMs: 1000 },
      toasts: { current: "first-click", remainingMs: 4000, pending: [] },
      achievements: ["first-click"],
      stats: { crits: 9, goldenCaught: 0, maxComboLevel: 0, resets: 0 },
      helpers: { monkey: 1, robot: 2, factory: 3, extra: 4 },
      levels: { ...L0, crit: 2, bonus: 1 },
    } as unknown as GameState;
    expect(JSON.parse(serializeGame(withRuntime))).toStrictEqual({
      version: 4,
      state: S({
        balance: 1,
        totalClicks: 1,
        decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }],
        videos: [{ id: "video-runner", position: null }],
        helpers: { monkey: 1, robot: 2, factory: 3 },
        levels: { crit: 2 },
      }),
    });
  });

  it("Save writes to the save key", () => {
    const storage = createMemoryStorage();
    expect(saveGame(storage, S({ balance: 5, totalClicks: 5 }))).toBe(true);
    expect(JSON.parse(storage.getItem("dopamine-clicker:save") as string)).toStrictEqual({
      version: 4,
      state: S({ balance: 5, totalClicks: 5 }),
    });
    expect([...storage.data.keys()]).toEqual(["dopamine-clicker:save"]);
    expect(new Set(storage.writtenKeys)).toEqual(new Set(["dopamine-clicker:save"]));
  });

  it("Save survives a storage write error", () => {
    const storage = createThrowingStorage({
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    let result: boolean | undefined;
    expect(() => {
      result = saveGame(storage, S({ balance: 1, totalClicks: 1 }));
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it("Round trip", () => {
    const F = S({
      balance: 1234,
      totalClicks: 90000,
      ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"],
      enabledSkins: ["squish", "jumping-cap"],
      material: "gold",
      decor: [
        { id: "sleeping-cat", position: { x: 0.125, y: 0.5 } },
        { id: "lava-lamp", position: null },
        { id: "hydraulic-press", position: { x: 0.75, y: 0.0625 } },
      ],
      videos: [
        { id: "video-runner", position: { x: 0.25, y: 0.75 } },
        { id: "video-rain", position: null },
      ],
      upgrades: ["double-click", "triple-click", "combo", "golden-button"],
      helpers: { monkey: 7, robot: 2, factory: 1 },
      levels: { crit: 2, "speed-monkey": 3, "speed-robot": 1, "speed-factory": 0 },
    });
    const storage = createMemoryStorage();
    saveGame(storage, F);
    expect(loadGame(storage)).toStrictEqual({ state: F, status: "loaded" });
  });
});

// ---------------------------------------------------------------------------
// State validation
// ---------------------------------------------------------------------------

describe("game-persistence: State validation", () => {
  it("Valid state accepted", () => {
    expect(validateGameState(FRESH)).toStrictEqual(FRESH);
  });

  it("Extra fields dropped", () => {
    const result = validateGameState({ ...S({ balance: 2, totalClicks: 3 }), extra: "x" });
    expect(result).toStrictEqual(S({ balance: 2, totalClicks: 3 }));
    expect(result).not.toHaveProperty("extra");
  });

  it("Normalization", () => {
    const input = {
      ...S({
        totalClicks: 300,
        ownedSkins: ["gold", "jumping-cap", "soft-shadow"],
        enabledSkins: ["jumping-cap", "soft-shadow"],
        material: "gold",
        decor: [
          { id: "lava-lamp", position: { x: 0.5, y: 0.5 } },
          { id: "sleeping-cat", position: null },
        ],
        upgrades: ["golden-button", "triple-click", "combo", "double-click"],
      }),
      decor: [
        { id: "lava-lamp", position: { x: 0.5, y: 0.5, z: 1 } },
        { id: "sleeping-cat", position: null, hidden: true },
      ],
      helpers: { monkey: 2, robot: 1, factory: 0, cat: 5 },
      levels: { ...L0, crit: 1, "speed-cat": 2 },
      extra: "x",
    };
    expect(validateGameState(input)).toStrictEqual(
      S({
        totalClicks: 300,
        ownedSkins: ["soft-shadow", "jumping-cap", "gold"],
        enabledSkins: ["soft-shadow", "jumping-cap"],
        material: "gold",
        decor: [
          { id: "sleeping-cat", position: null },
          { id: "lava-lamp", position: { x: 0.5, y: 0.5 } },
        ],
        upgrades: ["double-click", "triple-click", "combo", "golden-button"],
        helpers: { monkey: 2, robot: 1 },
        levels: { crit: 1 },
      }),
    );
  });

  it("Position bounds are inclusive", () => {
    const input = S({ decor: [{ id: "lava-lamp", position: { x: 0, y: 1 } }] });
    expect(validateGameState(input)).toStrictEqual(input);
  });

  it("Maximum levels with owned helpers accepted", () => {
    const input = S({
      totalClicks: 100000,
      helpers: { monkey: 1, robot: 1, factory: 1 },
      levels: { crit: 3, "speed-monkey": 3, "speed-robot": 3, "speed-factory": 3 },
    });
    expect(validateGameState(input)).toStrictEqual(input);
  });

  it("Valid video field accepted", () => {
    const input = S({
      totalClicks: 30000,
      videos: [
        { id: "video-runner", position: { x: 0, y: 1 } },
        { id: "video-rain", position: null },
      ],
    });
    expect(validateGameState(input)).toStrictEqual(input);
  });

  it("Videos are normalized like decor", () => {
    const input = {
      ...S({ totalClicks: 30000 }),
      videos: [
        { id: "video-rain", position: null, muted: true },
        { id: "video-runner", position: { x: 0.5, y: 0.5, z: 1 } },
      ],
      achievements: ["first-click"],
      stats: { crits: 3 },
    };
    const result = validateGameState(input);
    expect(result).toStrictEqual(
      S({
        totalClicks: 30000,
        videos: [
          { id: "video-runner", position: { x: 0.5, y: 0.5 } },
          { id: "video-rain", position: null },
        ],
      }),
    );
    expect(result).not.toHaveProperty("achievements");
    expect(result).not.toHaveProperty("stats");
  });

  it.each([
    ["videos undefined", { ...FRESH, videos: undefined }],
    ["videos not an array", { ...FRESH, videos: {} }],
    ["video entry is a string", { ...FRESH, videos: ["video-runner"] }],
    ["unknown video", { ...FRESH, videos: [{ id: "video-nope", position: null }] }],
    [
      "duplicate video",
      {
        ...FRESH,
        videos: [
          { id: "video-runner", position: null },
          { id: "video-runner", position: null },
        ],
      },
    ],
    ["video without position", { ...FRESH, videos: [{ id: "video-runner" }] }],
    ["video x above 1", { ...FRESH, videos: [{ id: "video-runner", position: { x: 1.5, y: 0 } }] }],
    ["video x string", { ...FRESH, videos: [{ id: "video-runner", position: { x: "0.5", y: 0 } }] }],
  ])("Invalid video fields rejected: %s", (_label, value) => {
    expect(validateGameState(value)).toBeNull();
  });

  it.each([
    ["null", null],
    ["42", 42],
    ['"text"', "text"],
    ["[]", []],
    ["{}", {}],
    ["v1 payload", { balance: 0, totalClicks: 0 }],
    ["v2 payload", S2({})],
    ["v3 payload without videos", S3({})],
    ["balance undefined", { ...FRESH, balance: undefined }],
    ["totalClicks undefined", { ...FRESH, totalClicks: undefined }],
    ["negative balance", { ...FRESH, balance: -1 }],
    ["negative totalClicks", { ...FRESH, totalClicks: -1 }],
    ["fractional balance", { ...FRESH, balance: 1.5 }],
    ["string balance", { ...FRESH, balance: "5" }],
    ["NaN balance", { ...FRESH, balance: NaN }],
    ["Infinity balance", { ...FRESH, balance: Infinity }],
    ["unsafe integer totalClicks", { ...FRESH, totalClicks: 9007199254740992 }],
  ])("Invalid states rejected: %s", (_label, value) => {
    expect(validateGameState(value)).toBeNull();
  });

  it.each([
    ["ownedSkins not an array", { ...FRESH, ownedSkins: "soft-shadow" }],
    ["unknown skin", { ...FRESH, ownedSkins: ["ripple"] }],
    ["duplicate skin", { ...FRESH, ownedSkins: ["squish", "squish"] }],
    ["enabled but not owned", { ...FRESH, enabledSkins: ["squish"] }],
    ["gold in enabledSkins", { ...FRESH, ownedSkins: ["gold"], enabledSkins: ["gold"] }],
    ["gold material without gold", { ...FRESH, material: "gold" }],
    ["unknown material", { ...FRESH, material: "lava" }],
    ["material undefined", { ...FRESH, material: undefined }],
    ["decor not an array", { ...FRESH, decor: {} }],
    ["decor entry is a string", { ...FRESH, decor: ["lava-lamp"] }],
    ["unknown decor", { ...FRESH, decor: [{ id: "dvd-logo", position: null }] }],
    [
      "duplicate decor",
      {
        ...FRESH,
        decor: [
          { id: "lava-lamp", position: null },
          { id: "lava-lamp", position: null },
        ],
      },
    ],
    ["decor without position", { ...FRESH, decor: [{ id: "lava-lamp" }] }],
    ["position without y", { ...FRESH, decor: [{ id: "lava-lamp", position: { x: 0.5 } }] }],
    ["x above 1", { ...FRESH, decor: [{ id: "lava-lamp", position: { x: 1.5, y: 0 } }] }],
    ["x below 0", { ...FRESH, decor: [{ id: "lava-lamp", position: { x: -0.1, y: 0 } }] }],
    ["x NaN", { ...FRESH, decor: [{ id: "lava-lamp", position: { x: NaN, y: 0 } }] }],
    ["x string", { ...FRESH, decor: [{ id: "lava-lamp", position: { x: "0.5", y: 0 } }] }],
    ["triple without double", { ...FRESH, upgrades: ["triple-click"] }],
    ["crit is a level, not an upgrade", { ...FRESH, upgrades: ["crit"] }],
    ["speed-up is a level, not an upgrade", { ...FRESH, upgrades: ["speed-monkey"] }],
    ["duplicate upgrade", { ...FRESH, upgrades: ["double-click", "double-click"] }],
    ["duplicate feature upgrade", { ...FRESH, upgrades: ["combo", "combo"] }],
    ["helpers null", { ...FRESH, helpers: null }],
    ["helpers array", { ...FRESH, helpers: [] }],
    ["helpers empty", { ...FRESH, helpers: {} }],
    ["v2 helpers", { ...FRESH, helpers: { monkey: 0 } }],
    ["helpers without factory", { ...FRESH, helpers: { monkey: 0, robot: 0 } }],
    ["negative monkeys", { ...FRESH, helpers: { monkey: -1, robot: 0, factory: 0 } }],
    ["fractional monkeys", { ...FRESH, helpers: { monkey: 1.5, robot: 0, factory: 0 } }],
    ["negative robots", { ...FRESH, helpers: { monkey: 0, robot: -1, factory: 0 } }],
    ["string factories", { ...FRESH, helpers: { monkey: 0, robot: 0, factory: "1" } }],
  ])("Invalid shop fields rejected: %s", (_label, value) => {
    expect(validateGameState(value)).toBeNull();
  });

  it.each([
    ["levels undefined", { ...FRESH, levels: undefined }],
    ["levels null", { ...FRESH, levels: null }],
    ["levels array", { ...FRESH, levels: [] }],
    ["levels empty", { ...FRESH, levels: {} }],
    [
      "missing level key",
      { ...FRESH, levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0 } },
    ],
    ["crit above max", { ...FRESH, levels: { ...L0, crit: 4 } }],
    ["crit negative", { ...FRESH, levels: { ...L0, crit: -1 } }],
    ["crit fractional", { ...FRESH, levels: { ...L0, crit: 1.5 } }],
    ["crit string", { ...FRESH, levels: { ...L0, crit: "1" } }],
    ["speed-up without its helper", { ...FRESH, levels: { ...L0, "speed-monkey": 1 } }],
    [
      "speed-robot without robots",
      {
        ...FRESH,
        helpers: { monkey: 1, robot: 0, factory: 0 },
        levels: { ...L0, "speed-robot": 2 },
      },
    ],
  ])("Invalid levels rejected: %s", (_label, value) => {
    expect(validateGameState(value)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Loading with fallback
// ---------------------------------------------------------------------------

describe("game-persistence: Loading with fallback", () => {
  it("Nothing stored", () => {
    expect(loadGame(createMemoryStorage())).toStrictEqual({ state: FRESH, status: "fresh" });
  });

  it("Storage read throws", () => {
    const storage = createThrowingStorage({
      getItem: () => {
        throw new Error("SecurityError");
      },
    });
    let result: unknown;
    expect(() => {
      result = loadGame(storage);
    }).not.toThrow();
    expect(result).toStrictEqual({ state: FRESH, status: "fresh" });
  });

  it.each([
    "{not json",
    "",
    "null",
    "42",
    "[]",
    "{}",
    '{"version":1}',
    '{"state":{"balance":1,"totalClicks":1}}',
    '{"version":"1","state":{"balance":1,"totalClicks":1}}',
    '{"version":1,"state":{"balance":-5,"totalClicks":1}}',
    '{"version":2,"state":{"balance":10,"totalClicks":10}}',
    '{"version":3,"state":{"balance":10,"totalClicks":10}}',
    '{"version":4,"state":{"balance":10,"totalClicks":10}}',
  ])("Corrupted raw values: %j", (raw) => {
    expect(parseSave(raw)).toStrictEqual({ state: FRESH, status: "corrupted" });
  });

  it("Null raw value is fresh, not corrupted", () => {
    expect(parseSave(null)).toStrictEqual({ state: FRESH, status: "fresh" });
  });

  it("Future version falls back", () => {
    const raw = JSON.stringify({ version: 5, state: S({ balance: 10, totalClicks: 10 }) });
    expect(parseSave(raw)).toStrictEqual({ state: FRESH, status: "corrupted" });
  });

  it("Version 0 falls back", () => {
    expect(parseSave('{"version":0,"state":{"balance":10,"totalClicks":10}}')).toStrictEqual({
      state: FRESH,
      status: "corrupted",
    });
  });

  it("Current version loads", () => {
    const state = S({
      balance: 4,
      totalClicks: 200,
      upgrades: ["double-click", "combo"],
      levels: { crit: 1 },
    });
    expect(parseSave(V4(state))).toStrictEqual({ state, status: "loaded" });
  });

  it("Loading does not read or change theme and language keys", () => {
    const storage = createMemoryStorage({
      "dopamine-clicker:save": "{not json",
      "dopamine-clicker:theme": "dark",
      "dopamine-clicker:lang": "en",
    });
    loadGame(storage);
    expect(storage.getItem("dopamine-clicker:theme")).toBe("dark");
    expect(storage.getItem("dopamine-clicker:lang")).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// Corrupted-save backup
// ---------------------------------------------------------------------------

describe("game-persistence: Corrupted-save backup", () => {
  it("Invalid JSON is backed up", () => {
    const storage = createMemoryStorage({ "dopamine-clicker:save": "{not json" });
    expect(loadGame(storage)).toStrictEqual({ state: FRESH, status: "corrupted" });
    expect(storage.getItem("dopamine-clicker:save:bad")).toBe("{not json");
    expect(storage.getItem("dopamine-clicker:save")).toBe("{not json");
  });

  it("Failed validation is backed up", () => {
    const storage = createMemoryStorage({ "dopamine-clicker:save": RAW_V1(-5, 1) });
    expect(loadGame(storage).status).toBe("corrupted");
    expect(storage.getItem("dopamine-clicker:save:bad")).toBe(RAW_V1(-5, 1));
  });

  it("Future version is backed up", () => {
    const raw = '{"version":5,"state":{"balance":10,"totalClicks":10}}';
    const storage = createMemoryStorage({ "dopamine-clicker:save": raw });
    expect(loadGame(storage).status).toBe("corrupted");
    expect(storage.getItem("dopamine-clicker:save:bad")).toBe(raw);
  });

  it("Failed migration is backed up", () => {
    const storage = createMemoryStorage({ "dopamine-clicker:save": RAW_V1(8, 9) });
    const options: ParseSaveOptions = {
      migrations: {
        1: () => {
          throw new Error("boom");
        },
      },
      targetVersion: 2,
    };
    expect(loadGame(storage, options)).toStrictEqual({ state: FRESH, status: "corrupted" });
    expect(storage.getItem("dopamine-clicker:save:bad")).toBe(RAW_V1(8, 9));
  });

  it("New backup overwrites the previous one", () => {
    const storage = createMemoryStorage({
      "dopamine-clicker:save:bad": "old",
      "dopamine-clicker:save": "[]",
    });
    loadGame(storage);
    expect(storage.getItem("dopamine-clicker:save:bad")).toBe("[]");
  });

  it("No backup for fresh, loaded or migrated", () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage({
      "dopamine-clicker:save": V4(S({ balance: 3, totalClicks: 3 })),
    });
    const c = createMemoryStorage({ "dopamine-clicker:save": RAW_V1(3, 3) });
    const d = createMemoryStorage({
      "dopamine-clicker:save": V2(S2({ balance: 3, totalClicks: 3 })),
    });
    const e = createMemoryStorage({
      "dopamine-clicker:save": V3(S3({ balance: 3, totalClicks: 3 })),
    });
    expect([
      loadGame(a).status,
      loadGame(b).status,
      loadGame(c).status,
      loadGame(d).status,
      loadGame(e).status,
    ]).toEqual(["fresh", "loaded", "migrated", "migrated", "migrated"]);
    for (const storage of [a, b, c, d, e]) {
      expect(storage.getItem("dopamine-clicker:save:bad")).toBeNull();
    }
  });

  it("Existing backup untouched by a valid load", () => {
    const storage = createMemoryStorage({
      "dopamine-clicker:save:bad": "old",
      "dopamine-clicker:save": V4(S({ balance: 3, totalClicks: 3 })),
    });
    expect(loadGame(storage).status).toBe("loaded");
    expect(storage.getItem("dopamine-clicker:save:bad")).toBe("old");
  });

  it("Backup write failure does not throw", () => {
    const storage = createThrowingStorage({
      getItem: (key) => (key === "dopamine-clicker:save" ? "{not json" : null),
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    let result: unknown;
    expect(() => {
      result = loadGame(storage);
    }).not.toThrow();
    expect(result).toStrictEqual({ state: FRESH, status: "corrupted" });
  });

  it("Parsing a raw string never writes storage", () => {
    expect(parseSave("{not json")).toStrictEqual({ state: FRESH, status: "corrupted" });
  });
});

// ---------------------------------------------------------------------------
// Migration hook
// ---------------------------------------------------------------------------

describe("game-persistence: Migration hook", () => {
  it("Built-in table", () => {
    expect(Object.keys(MIGRATIONS)).toEqual(["1", "2", "3"]);
    expect(MIGRATIONS[1]).toBe(migrateV1ToV2);
    expect(MIGRATIONS[2]).toBe(migrateV2ToV3);
    expect(MIGRATIONS[3]).toBe(migrateV3ToV4);
  });

  it("Same version passes through unchanged", () => {
    expect(migrateSave({ version: 1, state: { balance: 3, totalClicks: 4 } }, {}, 1)).toEqual({
      version: 1,
      state: { balance: 3, totalClicks: 4 },
    });
  });

  it("One step", () => {
    expect(migrateSave({ version: 1, state: { balance: 3, totalClicks: 4 } }, addBonus, 2)).toEqual(
      { version: 2, state: { balance: 3, totalClicks: 4, bonus: 0 } },
    );
  });

  it("Chained steps run in order", () => {
    const table: MigrationTable = {
      1: (s) => ({ ...(s as Record<string, unknown>), log: ["1to2"] }),
      2: (s) => {
        const prev = s as Record<string, unknown> & { log: string[] };
        return { ...prev, log: [...prev.log, "2to3"] };
      },
    };
    expect(migrateSave({ version: 1, state: { balance: 0, totalClicks: 0 } }, table, 3)).toEqual({
      version: 3,
      state: { balance: 0, totalClicks: 0, log: ["1to2", "2to3"] },
    });
  });

  it("Missing step fails", () => {
    const table: MigrationTable = { 1: (s) => s };
    expect(migrateSave({ version: 1, state: { balance: 0, totalClicks: 0 } }, table, 3)).toBeNull();
  });

  it("Throwing step fails", () => {
    const table: MigrationTable = {
      1: () => {
        throw new Error("boom");
      },
    };
    let result: unknown = "unset";
    expect(() => {
      result = migrateSave({ version: 1, state: { balance: 0, totalClicks: 0 } }, table, 2);
    }).not.toThrow();
    expect(result).toBeNull();
  });

  it("Newer than target fails", () => {
    expect(migrateSave({ version: 5, state: { balance: 0, totalClicks: 0 } }, {}, 4)).toBeNull();
  });

  it("Migrated load reports status migrated", () => {
    expect(parseSave(RAW_V1(8, 9))).toStrictEqual({
      state: S({ balance: 8, totalClicks: 9 }),
      status: "migrated",
    });
  });

  it("Migrated state that fails validation is corrupted", () => {
    expect(
      parseSave(RAW_V1(8, 9), {
        migrations: { 1: () => ({ balance: -1, totalClicks: 0 }) },
        targetVersion: 2,
      }),
    ).toStrictEqual({ state: FRESH, status: "corrupted" });
  });
});

// ---------------------------------------------------------------------------
// Stage 1 saves migrate to v2
// ---------------------------------------------------------------------------

describe("game-persistence: Stage 1 saves migrate to v2", () => {
  it("Migrate a v1 payload", () => {
    expect(migrateV1ToV2({ balance: 7, totalClicks: 9 })).toStrictEqual(
      S2({ balance: 7, totalClicks: 9 }),
    );
  });

  it("Extra v1 keys are dropped", () => {
    const result = migrateV1ToV2({ balance: 1, totalClicks: 2, foo: 3 });
    expect(result).toStrictEqual(S2({ balance: 1, totalClicks: 2 }));
    expect(result).not.toHaveProperty("foo");
  });

  it("Values are passed through for later validation", () => {
    expect(migrateV1ToV2({ balance: -5, totalClicks: 1 })).toStrictEqual(
      S2({ balance: -5, totalClicks: 1 }),
    );
  });

  it("Non-object payloads are returned unchanged", () => {
    const A = [1];
    expect(migrateV1ToV2(null)).toBeNull();
    expect(migrateV1ToV2(42)).toBe(42);
    expect(migrateV1ToV2("x")).toBe("x");
    expect(migrateV1ToV2(A)).toBe(A);
    expect(parseSave('{"version":1,"state":null}')).toStrictEqual({
      state: FRESH,
      status: "corrupted",
    });
  });

  it("Loading a v1 save does not rewrite it", () => {
    const storage = createMemoryStorage({ "dopamine-clicker:save": RAW_V1(40, 12) });
    expect(loadGame(storage)).toStrictEqual({
      state: S({ balance: 40, totalClicks: 12 }),
      status: "migrated",
    });
    expect(storage.getItem("dopamine-clicker:save")).toBe(RAW_V1(40, 12));
    expect(storage.getItem("dopamine-clicker:save:bad")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stage 2 saves migrate to v3
// ---------------------------------------------------------------------------

describe("game-persistence: Stage 2 saves migrate to v3", () => {
  it("Migrate a v2 payload", () => {
    expect(
      migrateV2ToV3(
        S2({
          balance: 7,
          totalClicks: 900,
          ownedSkins: ["squish", "gold"],
          enabledSkins: ["squish"],
          material: "gold",
          decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }],
          upgrades: ["double-click"],
          helpers: { monkey: 3 },
        }),
      ),
    ).toStrictEqual(
      S3({
        balance: 7,
        totalClicks: 900,
        ownedSkins: ["squish", "gold"],
        enabledSkins: ["squish"],
        material: "gold",
        decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }],
        upgrades: ["double-click"],
        helpers: { monkey: 3 },
      }),
    );
  });

  it("Extra v2 keys are dropped and new fields start at 0", () => {
    const result = migrateV2ToV3({
      ...S2({}),
      foo: 1,
      helpers: { monkey: 2, robot: 5 },
      levels: { crit: 3 },
    });
    expect(result).toStrictEqual(S3({ helpers: { monkey: 2 } }));
    expect(result).not.toHaveProperty("foo");
  });

  it("Values are passed through for later validation", () => {
    expect(migrateV2ToV3({ ...S2({}), balance: -5 })).toStrictEqual({ ...S3({}), balance: -5 });
    expect(migrateV2ToV3({ ...S2({}), helpers: null })).toStrictEqual({
      ...S3({}),
      helpers: null,
    });
  });

  it("Non-object payloads are returned unchanged", () => {
    const A = [1];
    expect(migrateV2ToV3(null)).toBeNull();
    expect(migrateV2ToV3(42)).toBe(42);
    expect(migrateV2ToV3("x")).toBe("x");
    expect(migrateV2ToV3(A)).toBe(A);
  });

  it("v2 save loads as migrated", () => {
    expect(
      parseSave(
        V2(S2({ balance: 12, totalClicks: 80, upgrades: ["double-click"], helpers: { monkey: 2 } })),
      ),
    ).toStrictEqual({
      state: S({
        balance: 12,
        totalClicks: 80,
        upgrades: ["double-click"],
        helpers: { monkey: 2 },
      }),
      status: "migrated",
    });
  });

  it("Invalid v2 save is corrupted", () => {
    expect(parseSave(V2(S2({ totalClicks: 250, upgrades: ["triple-click"] })))).toStrictEqual({
      state: FRESH,
      status: "corrupted",
    });
  });

  it("Loading a v2 save does not rewrite it", () => {
    const raw = V2(S2({ balance: 40, totalClicks: 70 }));
    const storage = createMemoryStorage({ "dopamine-clicker:save": raw });
    expect(loadGame(storage).status).toBe("migrated");
    expect(storage.getItem("dopamine-clicker:save")).toBe(raw);
    expect(storage.getItem("dopamine-clicker:save:bad")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stage 3 saves migrate to v4
// ---------------------------------------------------------------------------

describe("game-persistence: Stage 3 saves migrate to v4", () => {
  it("Migrate a v3 payload", () => {
    expect(
      migrateV3ToV4(
        S3({
          balance: 7,
          totalClicks: 900,
          ownedSkins: ["squish", "gold"],
          enabledSkins: ["squish"],
          material: "gold",
          decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }],
          upgrades: ["double-click", "combo"],
          helpers: { monkey: 3, robot: 1 },
          levels: { crit: 2 },
        }),
      ),
    ).toStrictEqual(
      S({
        balance: 7,
        totalClicks: 900,
        ownedSkins: ["squish", "gold"],
        enabledSkins: ["squish"],
        material: "gold",
        decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }],
        upgrades: ["double-click", "combo"],
        helpers: { monkey: 3, robot: 1 },
        levels: { crit: 2 },
      }),
    );
  });

  it("Extra v3 keys are dropped and videos start empty", () => {
    const result = migrateV3ToV4({
      ...S3({}),
      foo: 1,
      videos: [{ id: "video-runner", position: null }],
      achievements: ["first-click"],
      stats: { crits: 9 },
    });
    expect(result).toStrictEqual(FRESH);
    expect(result).not.toHaveProperty("foo");
    expect(result).not.toHaveProperty("achievements");
    expect(result).not.toHaveProperty("stats");
  });

  it("Values are passed through for later validation", () => {
    expect(migrateV3ToV4({ ...S3({}), balance: -5 })).toStrictEqual({ ...FRESH, balance: -5 });
    expect(migrateV3ToV4({ ...S3({}), levels: null })).toStrictEqual({ ...FRESH, levels: null });
  });

  it("Non-object payloads are returned unchanged", () => {
    const A = [1];
    expect(migrateV3ToV4(null)).toBeNull();
    expect(migrateV3ToV4(42)).toBe(42);
    expect(migrateV3ToV4("x")).toBe("x");
    expect(migrateV3ToV4(A)).toBe(A);
  });

  it("v3 save loads as migrated", () => {
    expect(
      parseSave(
        V3(
          S3({
            balance: 12,
            totalClicks: 9000,
            upgrades: ["combo"],
            helpers: { robot: 2 },
            levels: { crit: 3, "speed-robot": 1 },
          }),
        ),
      ),
    ).toStrictEqual({
      state: S({
        balance: 12,
        totalClicks: 9000,
        upgrades: ["combo"],
        helpers: { robot: 2 },
        levels: { crit: 3, "speed-robot": 1 },
      }),
      status: "migrated",
    });
  });

  it("Invalid v3 save is corrupted", () => {
    expect(parseSave(V3(S3({ totalClicks: 250, upgrades: ["triple-click"] })))).toStrictEqual({
      state: FRESH,
      status: "corrupted",
    });
  });

  it("Loading a v3 save does not rewrite it", () => {
    const raw = V3(S3({ balance: 40, totalClicks: 70 }));
    const storage = createMemoryStorage({ "dopamine-clicker:save": raw });
    expect(loadGame(storage).status).toBe("migrated");
    expect(storage.getItem("dopamine-clicker:save")).toBe(raw);
    expect(storage.getItem("dopamine-clicker:save:bad")).toBeNull();
  });

  it("A v4 save is loaded as is", () => {
    const state = S({
      balance: 5,
      totalClicks: 5,
      videos: [{ id: "video-runner", position: null }],
    });
    expect(parseSave(V4(state))).toStrictEqual({ state, status: "loaded" });
  });
});

// ---------------------------------------------------------------------------
// Reset progress
// ---------------------------------------------------------------------------

describe("game-persistence: Reset progress with confirmation", () => {
  it("Clear removes only the save key", () => {
    const storage = createMemoryStorage({
      "dopamine-clicker:save": V4(S({ balance: 3, totalClicks: 3 })),
      "dopamine-clicker:save:bad": "{not json",
      "dopamine-clicker:theme": "dark",
      "dopamine-clicker:lang": "en",
    });
    clearGame(storage);
    expect(storage.getItem("dopamine-clicker:save")).toBeNull();
    expect(storage.getItem("dopamine-clicker:save:bad")).toBe("{not json");
    expect(storage.getItem("dopamine-clicker:theme")).toBe("dark");
    expect(storage.getItem("dopamine-clicker:lang")).toBe("en");
  });

  it("Clear survives a storage error", () => {
    const storage = createThrowingStorage({
      removeItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(() => clearGame(storage)).not.toThrow();
  });
});
