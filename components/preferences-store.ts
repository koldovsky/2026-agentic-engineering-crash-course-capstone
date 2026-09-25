import {
  DEFAULT_LANGUAGE,
  loadPreferences,
  saveLanguage,
  saveTheme,
} from "@/lib/game/preferences";
import type { Language, Preferences, Theme } from "@/lib/game/types";

// `localStorage` seen as an external store: React reads it through useSyncExternalStore instead of
// copying it into state inside an effect. The snapshot is cached because getSnapshot must return a
// stable value between writes.

const listeners = new Set<() => void>();
let snapshot: Preferences | null = null;

const SERVER_PREFERENCES: Preferences = { theme: null, language: DEFAULT_LANGUAGE };

// In-memory fallback for a write storage rejected (private mode, quota, disabled storage — D5):
// without it, re-reading storage after a failed write would show the old value and the toggle
// would silently do nothing. `undefined` means "no override, trust storage"; set only when the
// matching save* call returned false, cleared again once a write for that field succeeds.
let themeOverride: Theme | undefined;
let languageOverride: Language | undefined;

export function subscribePreferences(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readSnapshot(): Preferences {
  const stored = loadPreferences(window.localStorage);
  return {
    theme: themeOverride ?? stored.theme,
    language: languageOverride ?? stored.language,
  };
}

export function getPreferencesSnapshot(): Preferences {
  snapshot ??= readSnapshot();
  return snapshot;
}

/** Used for SSR and the hydration render, where storage does not exist yet. */
export function getServerPreferences(): Preferences {
  return SERVER_PREFERENCES;
}

function emit(): void {
  snapshot = null;
  for (const listener of listeners) {
    listener();
  }
}

export function writeTheme(theme: Theme): void {
  const persisted = saveTheme(window.localStorage, theme);
  themeOverride = persisted ? undefined : theme;
  emit();
}

export function writeLanguage(language: Language): void {
  const persisted = saveLanguage(window.localStorage, language);
  languageOverride = persisted ? undefined : language;
  emit();
}
