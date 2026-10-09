import { ATTEMPTS_KEY_BASE, appendAttempt, parseAttempts } from "./attempts";
import { BEST_KEY_BASE, LEGACY_BEST_SCORES_KEY, mergeStoredBestScores, parseBestScores, withBestScore } from "./bestScores";
import type { Attempt } from "./attempts";
import {
  PROFILES_BACKUP_KEY,
  PROFILES_KEY,
  PROFILE_DATA_KEY_BASES,
  ensureProfile,
  parseProfiles,
  profileKey,
  removeProfile,
  serializeProfiles,
} from "./profiles";
import type { ProfilesState } from "./profiles";
import type { Level } from "./types";

const CHANGE_EVENT = "java-trainer-change";

export function subscribeToStore(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
  notifyChange();
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
  notifyChange();
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function readProfiles(): ProfilesState {
  return parseProfiles(readStored(PROFILES_KEY));
}

export function saveProfiles(state: ProfilesState): void {
  writeStored(PROFILES_KEY, serializeProfiles(state));
}

function migrateLegacyBestScores(): void {
  const legacyText = readStored(LEGACY_BEST_SCORES_KEY);
  const { activeId } = readProfiles();
  if (legacyText === null || activeId === null) return;
  const key = profileKey(BEST_KEY_BASE, activeId);
  const merged = mergeStoredBestScores(readStored(key), legacyText);
  writeStored(key, merged);
  if (readStored(key) === merged) removeStored(LEGACY_BEST_SCORES_KEY);
}

export function ensureStoredProfile(): void {
  const storedText = readStored(PROFILES_KEY);
  const state = parseProfiles(storedText);
  if (state.profiles.length === 0) {
    if (storedText !== null && storedText !== serializeProfiles(state)) {
      writeStored(PROFILES_BACKUP_KEY, storedText);
    }
    saveProfiles(ensureProfile(state, newId));
  }
  migrateLegacyBestScores();
}

export function deleteProfileData(id: string): void {
  for (const base of PROFILE_DATA_KEY_BASES) removeStored(profileKey(base, id));
}

export function logAttempt(attempt: Attempt): void {
  const { activeId } = readProfiles();
  if (activeId === null) return;
  const key = profileKey(ATTEMPTS_KEY_BASE, activeId);
  writeStored(key, JSON.stringify(appendAttempt(parseAttempts(readStored(key)), attempt)));
}

export function saveBestScore(level: Level, percent: number): void {
  const { activeId } = readProfiles();
  if (activeId === null) return;
  const key = profileKey(BEST_KEY_BASE, activeId);
  writeStored(key, JSON.stringify(withBestScore(parseBestScores(readStored(key)), level, percent)));
}

export function removeStoredProfile(id: string): void {
  saveProfiles(removeProfile(readProfiles(), id));
  if (!readProfiles().profiles.some((profile) => profile.id === id)) deleteProfileData(id);
}

const STORAGE_PROBE_KEY = "java-trainer-storage-probe";

export function storageAvailable(): boolean {
  try {
    localStorage.setItem(STORAGE_PROBE_KEY, "1");
    localStorage.removeItem(STORAGE_PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}
