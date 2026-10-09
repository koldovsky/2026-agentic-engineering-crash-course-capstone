import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATTEMPTS_KEY_BASE } from "./attempts";
import { BEST_KEY_BASE, LEGACY_BEST_SCORES_KEY } from "./bestScores";
import { PROFILES_BACKUP_KEY, PROFILES_KEY, profileKey, serializeProfiles } from "./profiles";
import {
  deleteProfileData,
  ensureStoredProfile,
  logAttempt,
  readProfiles,
  removeStoredProfile,
  saveBestScore,
  saveProfiles,
  storageAvailable,
} from "./profileStore";

function memoryStorage(failingKeys: string[] = []) {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failingKeys.includes(key)) throw new Error("quota exceeded");
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    keys: () => [...map.keys()],
  };
}

function installStorage(failingKeys: string[] = []) {
  const storage = memoryStorage(failingKeys);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} });
  return storage;
}

const twoProfiles = { profiles: [{ id: "a", name: "Ann" }, { id: "b", name: "Bob" }], activeId: "a" };

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("ensureStoredProfile and the legacy migration (spec R10, R11, R16)", () => {
  it("creates a Default profile on first use", () => {
    installStorage();
    ensureStoredProfile();
    expect(readProfiles().profiles.map((p) => p.name)).toEqual(["Default"]);
  });

  it("moves the legacy best scores into the first profile and removes the old key", () => {
    const storage = installStorage();
    storage.setItem(LEGACY_BEST_SCORES_KEY, '{"junior":60,"senior":30}');
    ensureStoredProfile();
    const { activeId } = readProfiles();
    expect(JSON.parse(storage.getItem(profileKey(BEST_KEY_BASE, activeId!))!)).toEqual({ junior: 60, senior: 30 });
    expect(storage.getItem(LEGACY_BEST_SCORES_KEY)).toBeNull();
  });

  it("merges the legacy scores into the active profile by per-level maximum", () => {
    const storage = installStorage();
    saveProfiles(twoProfiles);
    storage.setItem(profileKey(BEST_KEY_BASE, "a"), '{"junior":90,"middle":10}');
    storage.setItem(LEGACY_BEST_SCORES_KEY, '{"junior":80,"senior":5}');
    ensureStoredProfile();
    expect(JSON.parse(storage.getItem(profileKey(BEST_KEY_BASE, "a"))!)).toEqual({ junior: 90, middle: 10, senior: 5 });
    expect(storage.getItem(profileKey(BEST_KEY_BASE, "b"))).toBeNull();
  });

  it("keeps the legacy key when the merged scores cannot be written", () => {
    const storage = installStorage([profileKey(BEST_KEY_BASE, "a")]);
    saveProfiles(twoProfiles);
    storage.setItem(LEGACY_BEST_SCORES_KEY, '{"junior":80}');
    ensureStoredProfile();
    expect(storage.getItem(LEGACY_BEST_SCORES_KEY)).toBe('{"junior":80}');
  });

  it("backs up unreadable profile text before replacing it", () => {
    const storage = installStorage();
    storage.setItem(PROFILES_KEY, "garbage{");
    ensureStoredProfile();
    expect(storage.getItem(PROFILES_BACKUP_KEY)).toBe("garbage{");
    expect(readProfiles().profiles.map((p) => p.name)).toEqual(["Default"]);
  });
});

describe("removeStoredProfile (spec R11)", () => {
  it("removes the profile and all of its data keys", () => {
    const storage = installStorage();
    saveProfiles(twoProfiles);
    storage.setItem(profileKey(ATTEMPTS_KEY_BASE, "a"), "[]");
    storage.setItem(profileKey(BEST_KEY_BASE, "a"), "{}");
    storage.setItem(profileKey(BEST_KEY_BASE, "b"), '{"junior":1}');
    removeStoredProfile("a");
    expect(readProfiles()).toEqual({ profiles: [{ id: "b", name: "Bob" }], activeId: "b" });
    expect(storage.keys().filter((key) => key.endsWith(":a"))).toEqual([]);
    expect(storage.getItem(profileKey(BEST_KEY_BASE, "b"))).toBe('{"junior":1}');
  });

  it("keeps the data when the removal cannot be saved", () => {
    const storage = installStorage();
    saveProfiles(twoProfiles);
    storage.setItem(profileKey(ATTEMPTS_KEY_BASE, "a"), "[1]");
    vi.stubGlobal("localStorage", {
      ...storage,
      setItem: (key: string, value: string) => {
        if (key === PROFILES_KEY) throw new Error("quota exceeded");
        storage.setItem(key, value);
      },
    });
    removeStoredProfile("a");
    expect(storage.getItem(profileKey(ATTEMPTS_KEY_BASE, "a"))).toBe("[1]");
    expect(storage.getItem(PROFILES_KEY)).toBe(serializeProfiles(twoProfiles));
  });
});

describe("per-profile saving (spec R12, R16)", () => {
  it("saves best scores and attempts under the active profile only", () => {
    const storage = installStorage();
    saveProfiles(twoProfiles);
    saveBestScore("junior", 40);
    saveBestScore("junior", 25);
    logAttempt({ at: 1, level: "junior", total: 1, correct: 1, percent: 100, results: [{ id: "j1", topic: "T", correct: true }] });
    expect(JSON.parse(storage.getItem(profileKey(BEST_KEY_BASE, "a"))!)).toEqual({ junior: 40 });
    expect(JSON.parse(storage.getItem(profileKey(ATTEMPTS_KEY_BASE, "a"))!)).toHaveLength(1);
    expect(storage.getItem(profileKey(BEST_KEY_BASE, "b"))).toBeNull();
    expect(storage.getItem(profileKey(ATTEMPTS_KEY_BASE, "b"))).toBeNull();
  });

  it("deleteProfileData removes every data key of one profile", () => {
    const storage = installStorage();
    storage.setItem(profileKey(ATTEMPTS_KEY_BASE, "a"), "[]");
    storage.setItem(profileKey(BEST_KEY_BASE, "a"), "{}");
    deleteProfileData("a");
    expect(storage.keys()).toEqual([]);
  });
});

describe("storageAvailable (spec R11)", () => {
  it("is true when a test value can be written and removed", () => {
    const storage = installStorage();
    expect(storageAvailable()).toBe(true);
    expect(storage.keys()).toEqual([]);
  });

  it("is false when writing throws", () => {
    installStorage(["java-trainer-storage-probe"]);
    expect(storageAvailable()).toBe(false);
  });

  it("is false when localStorage does not exist", () => {
    expect(storageAvailable()).toBe(false);
  });
});
