import { DEFAULT_LANGUAGE, LANGUAGE_KEY, resolveLanguage } from "./language";
import type { Language } from "./language";
import { notifyChange, readStored, writeStored } from "./profileStore";

let memoryLanguage: Language | null = null;

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

export function readLanguage(): Language {
  if (memoryLanguage !== null) return memoryLanguage;
  return resolveLanguage(readStored(LANGUAGE_KEY), browserLanguages());
}

export function serverLanguage(): Language {
  return DEFAULT_LANGUAGE;
}

export function saveLanguage(language: Language): void {
  memoryLanguage = language;
  writeStored(LANGUAGE_KEY, language);
  if (readStored(LANGUAGE_KEY) === language) memoryLanguage = null;
  notifyChange();
}
