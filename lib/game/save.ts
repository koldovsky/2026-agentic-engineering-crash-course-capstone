import { SHOP_CATALOG } from "./shop";
import { createInitialState } from "./state";
import type {
  ClearGame,
  ClickUpgradeItem,
  CurrentSaveVersion,
  DecorId,
  DecorItem,
  DecorPosition,
  FeatureUpgradeItem,
  HelperId,
  HelperItem,
  LeveledUpgradeId,
  LeveledUpgradeItem,
  PlacedDecor,
  PlacedVideo,
  SkinId,
  SkinItem,
  StackSkinId,
  UpgradeId,
  VideoDecorId,
  VideoDecorItem,
  KeyValueStorage,
  LoadGame,
  LoadStatus,
  MigrateSave,
  MigrateV1ToV2,
  MigrateV2ToV3,
  MigrateV3ToV4,
  MigrationTable,
  ParseSave,
  SaveBackupKey,
  SaveGame,
  SaveKey,
  SerializeGame,
  UnknownSaveFile,
  ValidateGameState,
} from "./types";

export const SAVE_KEY: SaveKey = "dopamine-clicker:save";
export const SAVE_BACKUP_KEY: SaveBackupKey = "dopamine-clicker:save:bad";
export const CURRENT_SAVE_VERSION: CurrentSaveVersion = 4;

/** Built-in MIGRATIONS[1]: v1 payload -> v2 payload with default shop fields (design, Migration Plan). */
export const migrateV1ToV2: MigrateV1ToV2 = (state) => {
  if (typeof state !== "object" || state === null || Array.isArray(state)) {
    return state;
  }
  const v1 = state as Record<string, unknown>;
  // Values are copied as they are; validateGameState decides whether they are acceptable.
  return {
    balance: v1.balance,
    totalClicks: v1.totalClicks,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    upgrades: [],
    helpers: { monkey: 0 },
  };
};

/** Built-in MIGRATIONS[2]: v2 payload -> v3 payload (robot / factory 0, all levels 0; design D16). */
export const migrateV2ToV3: MigrateV2ToV3 = (state) => {
  if (!isRecord(state)) {
    return state;
  }
  const v2 = state;
  return {
    balance: v2.balance,
    totalClicks: v2.totalClicks,
    ownedSkins: v2.ownedSkins,
    enabledSkins: v2.enabledSkins,
    material: v2.material,
    decor: v2.decor,
    upgrades: v2.upgrades,
    // Stage 2 knew only monkeys; the new helper types and every level start at 0.
    helpers: isRecord(v2.helpers)
      ? { monkey: v2.helpers.monkey, robot: 0, factory: 0 }
      : v2.helpers,
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
  };
};

/** Built-in MIGRATIONS[3]: v3 payload -> v4 payload (adds `videos: []`, nothing else; design D11). */
export const migrateV3ToV4: MigrateV3ToV4 = (state) => {
  if (!isRecord(state)) {
    return state;
  }
  const v3 = state;
  // Values are copied as they are; validateGameState decides whether they are acceptable.
  return {
    balance: v3.balance,
    totalClicks: v3.totalClicks,
    ownedSkins: v3.ownedSkins,
    enabledSkins: v3.enabledSkins,
    material: v3.material,
    decor: v3.decor,
    // Stage 3 knew no videos; a stray `videos` key of a hand-edited save is dropped.
    videos: [],
    upgrades: v3.upgrades,
    helpers: v3.helpers,
    levels: v3.levels,
  };
};

/** Built-in migration table, keyed by source version. */
export const MIGRATIONS: MigrationTable = Object.freeze({
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
});

/** v4 envelope writer: exactly the ten schema keys, no runtime values (design D2, D11). */
export const serializeGame: SerializeGame = (state) =>
  JSON.stringify({
    version: CURRENT_SAVE_VERSION,
    state: {
      balance: state.balance,
      totalClicks: state.totalClicks,
      ownedSkins: state.ownedSkins,
      enabledSkins: state.enabledSkins,
      material: state.material,
      decor: state.decor.map(pickPlaced),
      videos: state.videos.map(pickPlaced),
      upgrades: state.upgrades,
      helpers: pickHelpers(state.helpers),
      levels: pickLevels(state.levels),
    },
  });

/** One placed decor / video entry with exactly `id` and `position` (extra keys dropped). */
function pickPlaced<T extends PlacedDecor | PlacedVideo>(entry: T): T {
  return {
    id: entry.id,
    position: entry.position === null ? null : { x: entry.position.x, y: entry.position.y },
  } as T;
}

// Known ids in catalog order: the validator both checks against them and sorts by them (D13).
const SKIN_IDS: readonly SkinId[] = SHOP_CATALOG.filter(
  (item): item is SkinItem => item.kind === "skin",
).map((item) => item.id);
const STACK_SKIN_IDS: readonly StackSkinId[] = SHOP_CATALOG.filter(
  (item): item is SkinItem => item.kind === "skin" && item.slot === "stack",
).map((item) => item.id as StackSkinId);
const DECOR_IDS: readonly DecorId[] = SHOP_CATALOG.filter(
  (item): item is DecorItem => item.kind === "decor",
).map((item) => item.id);
/** One-time upgrades stored in `upgrades`: click upgrades and feature upgrades (design D14). */
const UPGRADE_IDS: readonly UpgradeId[] = SHOP_CATALOG.filter(
  (item): item is ClickUpgradeItem | FeatureUpgradeItem =>
    item.kind === "click-upgrade" || item.kind === "feature-upgrade",
).map((item) => item.id);
const HELPER_IDS: readonly HelperId[] = SHOP_CATALOG.filter(
  (item): item is HelperItem => item.kind === "helper",
).map((item) => item.id);
const LEVELED_ITEMS: readonly LeveledUpgradeItem[] = SHOP_CATALOG.filter(
  (item): item is LeveledUpgradeItem => item.kind === "leveled-upgrade",
);
const VIDEO_IDS: readonly VideoDecorId[] = SHOP_CATALOG.filter(
  (item): item is VideoDecorItem => item.kind === "video-decor",
).map((item) => item.id);

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Exactly the three helper counts, in catalog order (extra keys dropped). */
function pickHelpers(helpers: Readonly<Record<HelperId, number>>): Record<HelperId, number> {
  return { monkey: helpers.monkey, robot: helpers.robot, factory: helpers.factory };
}

/** Exactly the four upgrade levels, in catalog order (extra keys dropped). */
function pickLevels(
  levels: Readonly<Record<LeveledUpgradeId, number>>,
): Record<LeveledUpgradeId, number> {
  return {
    crit: levels.crit,
    "speed-monkey": levels["speed-monkey"],
    "speed-robot": levels["speed-robot"],
    "speed-factory": levels["speed-factory"],
  };
}

/** Known ids only, no duplicates, re-sorted into catalog order (design D13). */
function normalizeIds<T extends string>(value: unknown, known: readonly T[]): T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const ids = value as unknown[];
  const isKnown = ids.every((id): id is T => known.includes(id as T));
  if (!isKnown || new Set(ids).size !== ids.length) {
    return null;
  }
  return known.filter((id) => ids.includes(id));
}

function normalizePosition(value: unknown): DecorPosition | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const { x, y } = value;
  const inRange = (n: unknown): n is number => typeof n === "number" && n >= 0 && n <= 1;
  return inRange(x) && inRange(y) ? { x, y } : undefined;
}

/**
 * Decor and video entries: known ids, no duplicates, valid positions, catalog order, extra keys
 * dropped (design D11: videos follow the decor rules exactly).
 */
function normalizePlaced<T extends string>(
  value: unknown,
  known: readonly T[],
): { id: T; position: DecorPosition | null }[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const entries = new Map<T, { id: T; position: DecorPosition | null }>();
  for (const raw of value as unknown[]) {
    if (!isRecord(raw)) {
      return null;
    }
    const id = raw.id as T;
    const position = normalizePosition(raw.position);
    if (!known.includes(id) || entries.has(id) || position === undefined) {
      return null;
    }
    entries.set(id, { id, position });
  }
  return known
    .filter((id) => entries.has(id))
    .map((id) => entries.get(id) as { id: T; position: DecorPosition | null });
}

/** Exactly the three helper counts, each a non-negative safe integer (design D15). */
function normalizeHelpers(value: unknown): Record<HelperId, number> | null {
  if (!isRecord(value) || !HELPER_IDS.every((id) => isCount(value[id]))) {
    return null;
  }
  return pickHelpers(value as unknown as Record<HelperId, number>);
}

/**
 * Exactly the four levels, each an integer in [0, maxLevel]; a speed-up level above 0 needs at
 * least one helper of its type (design D15).
 */
function normalizeLevels(
  value: unknown,
  helpers: Record<HelperId, number>,
): Record<LeveledUpgradeId, number> | null {
  if (!isRecord(value)) {
    return null;
  }
  for (const item of LEVELED_ITEMS) {
    const level = value[item.id];
    if (!isCount(level) || level > item.maxLevel) {
      return null;
    }
    if (level > 0 && item.helper !== null && helpers[item.helper] < 1) {
      return null;
    }
  }
  return pickLevels(value as unknown as Record<LeveledUpgradeId, number>);
}

/** v4 validator with normalization (design D11, D15). */
export const validateGameState: ValidateGameState = (value) => {
  if (!isRecord(value) || !isCount(value.balance) || !isCount(value.totalClicks)) {
    return null;
  }

  const ownedSkins = normalizeIds(value.ownedSkins, SKIN_IDS);
  const enabledSkins = normalizeIds(value.enabledSkins, STACK_SKIN_IDS);
  const decor = normalizePlaced(value.decor, DECOR_IDS);
  const videos = normalizePlaced(value.videos, VIDEO_IDS);
  const upgrades = normalizeIds(value.upgrades, UPGRADE_IDS);
  if (
    ownedSkins === null ||
    enabledSkins === null ||
    decor === null ||
    videos === null ||
    upgrades === null
  ) {
    return null;
  }
  if (!enabledSkins.every((id) => ownedSkins.includes(id))) {
    return null;
  }

  const material = value.material;
  const materialOwned = material === "classic" || ownedSkins.includes(material as SkinId);
  if ((material !== "classic" && material !== "gold") || !materialOwned) {
    return null;
  }

  if (upgrades.includes("triple-click") && !upgrades.includes("double-click")) {
    return null;
  }

  const helpers = normalizeHelpers(value.helpers);
  if (helpers === null) {
    return null;
  }
  const levels = normalizeLevels(value.levels, helpers);
  if (levels === null) {
    return null;
  }

  // Exactly the ten schema keys: a stray `achievements` / `stats` key is dropped (design D12).
  return {
    balance: value.balance,
    totalClicks: value.totalClicks,
    ownedSkins,
    enabledSkins,
    material,
    decor,
    videos,
    upgrades,
    helpers,
    levels,
  };
};

export const migrateSave: MigrateSave = (file, migrations, targetVersion) => {
  if (file.version > targetVersion) {
    return null;
  }
  let version = file.version;
  let state = file.state;
  while (version < targetVersion) {
    const migration = migrations[version];
    if (!migration) {
      return null;
    }
    try {
      state = migration(state);
    } catch {
      return null;
    }
    version += 1;
  }
  return { version, state };
};

function fresh(status: LoadStatus) {
  return { state: createInitialState(), status };
}

/** Envelope shape check: `{ version: <integer>, state: <anything> }`. */
function toEnvelope(parsed: unknown): UnknownSaveFile | null {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  if (!Number.isInteger(record.version) || !("state" in record)) {
    return null;
  }
  return { version: record.version as number, state: record.state };
}

export const parseSave: ParseSave = (raw, options) => {
  if (raw === null) {
    return fresh("fresh");
  }
  const migrations = options?.migrations ?? MIGRATIONS;
  const targetVersion = options?.targetVersion ?? CURRENT_SAVE_VERSION;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fresh("corrupted");
  }

  const envelope = toEnvelope(parsed);
  if (envelope === null) {
    return fresh("corrupted");
  }

  const migrated = migrateSave(envelope, migrations, targetVersion);
  if (migrated === null) {
    return fresh("corrupted");
  }

  const state = validateGameState(migrated.state);
  if (state === null) {
    return fresh("corrupted");
  }

  return { state, status: envelope.version === targetVersion ? "loaded" : "migrated" };
};

export const loadGame: LoadGame = (storage, options) => {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return fresh("fresh");
  }

  const result = parseSave(raw, options);
  if (result.status === "corrupted" && raw !== null) {
    backupCorruptedSave(storage, raw);
  }
  return result;
};

/** Keeps the last corrupted raw value for manual recovery; a failed write is ignored (D4). */
function backupCorruptedSave(storage: KeyValueStorage, raw: string): void {
  try {
    storage.setItem(SAVE_BACKUP_KEY, raw);
  } catch {
    // Storage full or unavailable — the backup is best effort.
  }
}

export const saveGame: SaveGame = (storage, state) => {
  try {
    storage.setItem(SAVE_KEY, serializeGame(state));
    return true;
  } catch {
    return false;
  }
};

export const clearGame: ClearGame = (storage) => {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // Reset must never throw; the in-memory state is reset either way.
  }
};
