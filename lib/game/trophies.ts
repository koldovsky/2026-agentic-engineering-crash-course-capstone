import { ACHIEVEMENTS } from "./achievements";
import type {
  AchievementId,
  ClearTrophies,
  CreateInitialTrophies,
  CurrentTrophiesVersion,
  KeyValueStorage,
  LoadStatus,
  LoadTrophies,
  ParseTrophies,
  SaveTrophies,
  SerializeTrophies,
  TrophiesBackupKey,
  TrophiesKey,
  TrophiesLoadResult,
  TrophyStats,
  ValidateTrophies,
} from "./types";

// The trophy file is deliberately independent of the game save (design D12): this module must not
// import from `save.ts`, and no game module may import from here.

export const TROPHIES_KEY: TrophiesKey = "dopamine-clicker:trophies";
export const TROPHIES_BACKUP_KEY: TrophiesBackupKey = "dopamine-clicker:trophies:bad";
export const CURRENT_TROPHIES_VERSION: CurrentTrophiesVersion = 1;

/** Highest combo level the game can reach (COMBO_MAX_LEVEL); kept local to avoid an import cycle. */
const MAX_COMBO_LEVEL = 10;

const ACHIEVEMENT_IDS: readonly AchievementId[] = ACHIEVEMENTS.map((achievement) => achievement.id);

export const createInitialTrophies: CreateInitialTrophies = () => ({
  unlocked: [],
  stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 },
});

export const serializeTrophies: SerializeTrophies = (trophies) =>
  JSON.stringify({
    version: CURRENT_TROPHIES_VERSION,
    trophies: {
      unlocked: trophies.unlocked,
      stats: {
        crits: trophies.stats.crits,
        goldenCaught: trophies.stats.goldenCaught,
        maxComboLevel: trophies.stats.maxComboLevel,
        resets: trophies.stats.resets,
      },
    },
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Known ids only (unknown ones dropped), no duplicates, re-sorted into catalog order. */
function normalizeUnlocked(value: unknown): AchievementId[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const ids = value as unknown[];
  if (new Set(ids).size !== ids.length) {
    return null;
  }
  return ACHIEVEMENT_IDS.filter((id) => ids.includes(id));
}

/** Exactly the four counters; `maxComboLevel` additionally capped at COMBO_MAX_LEVEL. */
function normalizeStats(value: unknown): TrophyStats | null {
  if (!isRecord(value)) {
    return null;
  }
  const { crits, goldenCaught, maxComboLevel, resets } = value;
  if (!isCount(crits) || !isCount(goldenCaught) || !isCount(maxComboLevel) || !isCount(resets)) {
    return null;
  }
  if (maxComboLevel > MAX_COMBO_LEVEL) {
    return null;
  }
  return { crits, goldenCaught, maxComboLevel, resets };
}

export const validateTrophies: ValidateTrophies = (value) => {
  if (!isRecord(value)) {
    return null;
  }
  const unlocked = normalizeUnlocked(value.unlocked);
  const stats = normalizeStats(value.stats);
  if (unlocked === null || stats === null) {
    return null;
  }
  return { unlocked, stats };
};

function freshTrophies(status: LoadStatus): TrophiesLoadResult {
  return { trophies: createInitialTrophies(), status };
}

export const parseTrophies: ParseTrophies = (raw) => {
  if (raw === null) {
    return freshTrophies("fresh");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return freshTrophies("corrupted");
  }

  if (!isRecord(parsed) || parsed.version !== CURRENT_TROPHIES_VERSION) {
    return freshTrophies("corrupted");
  }

  const trophies = validateTrophies(parsed.trophies);
  if (trophies === null) {
    return freshTrophies("corrupted");
  }

  return { trophies, status: "loaded" };
};

/** Keeps the last corrupted raw value for manual recovery; a failed write is ignored (D12). */
function backupCorruptedTrophies(storage: KeyValueStorage, raw: string): void {
  try {
    storage.setItem(TROPHIES_BACKUP_KEY, raw);
  } catch {
    // Storage full or unavailable — the backup is best effort.
  }
}

export const loadTrophies: LoadTrophies = (storage) => {
  let raw: string | null = null;
  try {
    raw = storage.getItem(TROPHIES_KEY);
  } catch {
    return freshTrophies("fresh");
  }

  const result = parseTrophies(raw);
  if (result.status === "corrupted" && raw !== null) {
    backupCorruptedTrophies(storage, raw);
  }
  return result;
};

export const saveTrophies: SaveTrophies = (storage, trophies) => {
  try {
    storage.setItem(TROPHIES_KEY, serializeTrophies(trophies));
    return true;
  } catch {
    return false;
  }
};

export const clearTrophies: ClearTrophies = (storage) => {
  try {
    storage.removeItem(TROPHIES_KEY);
  } catch {
    // Clearing must never throw; the in-memory trophies are replaced either way.
  }
};
