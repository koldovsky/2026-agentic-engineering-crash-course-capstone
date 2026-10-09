export const LANGUAGES = ["en", "uk"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_KEY = "java-trainer-language";
export const DEFAULT_LANGUAGE: Language = "en";
export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", uk: "Українська" };
export const LANGUAGE_LOCALES: Record<Language, string> = { en: "en-GB", uk: "uk-UA" };

function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primarySubtag = tag.toLowerCase().split("-")[0];
    if (isLanguage(primarySubtag)) return primarySubtag;
  }
  return DEFAULT_LANGUAGE;
}

export function parseLanguage(raw: string | null): Language | null {
  return raw !== null && isLanguage(raw) ? raw : null;
}

export function resolveLanguage(storedText: string | null, preferred: readonly string[]): Language {
  return parseLanguage(storedText) ?? detectLanguage(preferred);
}
