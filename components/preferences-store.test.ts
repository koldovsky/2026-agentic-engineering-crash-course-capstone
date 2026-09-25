import { LANGUAGE_KEY, THEME_KEY } from "@/lib/game/preferences";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPreferencesSnapshot,
  getServerPreferences,
  subscribePreferences,
  writeLanguage,
  writeTheme,
} from "./preferences-store";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("preferences-store", () => {
  it("server snapshot follows the system default until hydration", () => {
    expect(getServerPreferences()).toEqual({ theme: null, language: "uk" });
  });

  it("writeTheme and writeLanguage persist to storage and are reflected in the next snapshot", () => {
    writeTheme("dark");
    writeLanguage("en");

    expect(getPreferencesSnapshot()).toEqual({ theme: "dark", language: "en" });
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(window.localStorage.getItem(LANGUAGE_KEY)).toBe("en");
  });

  it("keeps an in-memory fallback so the toggle still works when storage rejects the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    writeTheme("dark");

    // The write to storage failed, but the toggle still takes effect for the session.
    expect(getPreferencesSnapshot().theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("drops the in-memory fallback again once a later write to storage succeeds", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    writeTheme("dark");
    expect(getPreferencesSnapshot().theme).toBe("dark");

    setItem.mockRestore();
    writeTheme("light");

    expect(getPreferencesSnapshot().theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("notifies subscribers on every write", () => {
    const listener = vi.fn();
    const unsubscribe = subscribePreferences(listener);

    writeLanguage("en");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    writeLanguage("uk");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
