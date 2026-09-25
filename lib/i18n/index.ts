import { Language } from "@/lib/game/types";
import { TranslationKey, dictionaries } from "./dictionaries";

// Re-export types and dictionaries for convenience
export type { TranslationKey, Dictionary } from "./dictionaries";
export { dictionaries, uk, en } from "./dictionaries";

/**
 * Translate a key to the given language, optionally replacing `{name}` placeholders with params.
 * Placeholders without a matching param remain unchanged.
 */
export const t = (
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string => {
  const template = dictionaries[language][key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
};

/**
 * Format a number according to the language's conventions.
 * - `uk`: uses U+00A0 (no-break space) as thousands separator
 * - `en`: uses comma as thousands separator
 *
 * ICU may emit a narrow no-break space (U+202F) or a plain space as the Ukrainian group
 * separator depending on the runtime; both are normalized to U+00A0 so the output is stable.
 */
export const formatNumber = (value: number, language: Language): string => {
  const formatted = new Intl.NumberFormat(language).format(value);
  return language === "uk" ? formatted.replace(/[\s ]/g, " ") : formatted;
};
