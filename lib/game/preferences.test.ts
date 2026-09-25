import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_KEY,
  loadPreferences,
  parseLanguage,
  parseTheme,
  resolveLanguage,
  resolveTheme,
  saveLanguage,
  saveTheme,
  THEME_KEY,
  toggleLanguage,
  toggleTheme,
} from "./preferences";
import type { KeyValueStorage } from "./types";

function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
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

describe("preferences: constants", () => {
  it("storage keys and default language", () => {
    expect(THEME_KEY).toBe("dopamine-clicker:theme");
    expect(LANGUAGE_KEY).toBe("dopamine-clicker:lang");
    expect(DEFAULT_LANGUAGE).toBe("uk");
  });
});

describe("theme: Theme resolution", () => {
  it("Parse saved theme", () => {
    const raws = ["light", "dark", null, "", "Dark", "blue", "system"];
    expect(raws.map((raw) => parseTheme(raw))).toEqual([
      "light",
      "dark",
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("No saved choice follows system", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("Saved choice wins over system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("Toggle", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });

  it("Load and save theme preference", () => {
    const storage = createMemoryStorage();
    expect(loadPreferences(storage)).toEqual({ theme: null, language: "uk" });
    expect(saveTheme(storage, "dark")).toBe(true);
    expect(storage.getItem("dopamine-clicker:theme")).toBe("dark");
    expect(loadPreferences(storage).theme).toBe("dark");
  });

  it("Theme storage errors never throw", () => {
    const storage = createThrowingStorage();
    let prefs: unknown;
    expect(() => {
      prefs = loadPreferences(storage);
    }).not.toThrow();
    expect(prefs).toEqual({ theme: null, language: "uk" });
    let saved: boolean | undefined;
    expect(() => {
      saved = saveTheme(storage, "light");
    }).not.toThrow();
    expect(saved).toBe(false);
  });
});

describe("localization: Language preference", () => {
  it("Parse and resolve language", () => {
    const raws = ["uk", "en", null, "", "EN", "ua", "de"];
    expect(raws.map((raw) => parseLanguage(raw))).toEqual(["uk", "en", null, null, null, null, null]);
    expect(resolveLanguage(null)).toBe("uk");
    expect(resolveLanguage("en")).toBe("en");
  });

  it("Toggle language", () => {
    expect(toggleLanguage("uk")).toBe("en");
    expect(toggleLanguage("en")).toBe("uk");
  });

  it("Load and save language preference", () => {
    const storage = createMemoryStorage({ "dopamine-clicker:lang": "de" });
    expect(loadPreferences(storage).language).toBe("uk");
    expect(saveLanguage(storage, "en")).toBe(true);
    expect(storage.getItem("dopamine-clicker:lang")).toBe("en");
    expect(loadPreferences(storage).language).toBe("en");
  });

  it("Language save error returns false and never throws", () => {
    const storage = createThrowingStorage();
    let saved: boolean | undefined;
    expect(() => {
      saved = saveLanguage(storage, "en");
    }).not.toThrow();
    expect(saved).toBe(false);
  });
});
