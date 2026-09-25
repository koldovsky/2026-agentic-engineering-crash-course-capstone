import type {
  Language,
  LoadPreferences,
  ParseLanguage,
  ParseTheme,
  ResolveLanguage,
  ResolveTheme,
  SaveLanguage,
  SaveTheme,
  ToggleLanguage,
  ToggleTheme,
} from "./types";

export const THEME_KEY = "dopamine-clicker:theme";
export const LANGUAGE_KEY = "dopamine-clicker:lang";
export const DEFAULT_LANGUAGE: Language = "uk";

export const parseTheme: ParseTheme = (raw) =>
  raw === "light" || raw === "dark" ? raw : null;

export const resolveTheme: ResolveTheme = (stored, systemPrefersDark) =>
  stored ?? (systemPrefersDark ? "dark" : "light");

export const toggleTheme: ToggleTheme = (current) => (current === "light" ? "dark" : "light");

export const parseLanguage: ParseLanguage = (raw) => (raw === "uk" || raw === "en" ? raw : null);

export const resolveLanguage: ResolveLanguage = (stored) => stored ?? DEFAULT_LANGUAGE;

export const toggleLanguage: ToggleLanguage = (current) => (current === "uk" ? "en" : "uk");

/** Reads a key, swallowing storage errors (private mode, disabled storage — design D5). */
function readItem(storage: { getItem(key: string): string | null }, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(
  storage: { setItem(key: string, value: string): void },
  key: string,
  value: string,
): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export const loadPreferences: LoadPreferences = (storage) => ({
  theme: parseTheme(readItem(storage, THEME_KEY)),
  language: resolveLanguage(parseLanguage(readItem(storage, LANGUAGE_KEY))),
});

export const saveTheme: SaveTheme = (storage, theme) => writeItem(storage, THEME_KEY, theme);

export const saveLanguage: SaveLanguage = (storage, language) =>
  writeItem(storage, LANGUAGE_KEY, language);
