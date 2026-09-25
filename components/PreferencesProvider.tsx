"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  resolveTheme,
  toggleLanguage as flipLanguage,
  toggleTheme as flipTheme,
} from "@/lib/game/preferences";
import type { Language, Theme } from "@/lib/game/types";
import { t, type TranslationKey } from "@/lib/i18n";
import {
  getPreferencesSnapshot,
  getServerPreferences,
  subscribePreferences,
  writeLanguage,
  writeTheme,
} from "./preferences-store";
import { useMediaQuery } from "./useMediaQuery";

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** "reduced" mirrors `prefers-reduced-motion: reduce` and the `data-motion` attribute (D17). */
export type Motion = "full" | "reduced";

interface PreferencesContextValue {
  readonly theme: Theme;
  readonly language: Language;
  readonly motion: Motion;
  readonly toggleTheme: () => void;
  readonly toggleLanguage: () => void;
  readonly t: Translate;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(
    subscribePreferences,
    getPreferencesSnapshot,
    getServerPreferences,
  );
  const systemPrefersDark = useMediaQuery(DARK_QUERY);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  // A saved choice wins permanently; without one the system preference is followed live (D8).
  const theme = resolveTheme(stored.theme, systemPrefersDark);
  const language = stored.language;
  const motion: Motion = prefersReducedMotion ? "reduced" : "full";

  // React owns the <html> attributes once mounted. This also re-applies them after the dev-mode
  // Strict Mode remount, which drops the attributes set by the pre-paint script.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("lang", language);
    root.setAttribute("data-motion", motion);
  }, [theme, language, motion]);

  const toggleTheme = useCallback(() => {
    writeTheme(flipTheme(theme));
  }, [theme]);

  const toggleLanguage = useCallback(() => {
    writeLanguage(flipLanguage(language));
  }, [language]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      language,
      motion,
      toggleTheme,
      toggleLanguage,
      t: (key, params) => t(language, key, params),
    }),
    [theme, language, motion, toggleTheme, toggleLanguage],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used inside <PreferencesProvider>");
  }
  return value;
}

/** Translation function bound to the current language. */
export function useT(): Translate {
  return usePreferences().t;
}
