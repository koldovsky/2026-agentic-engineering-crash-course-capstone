import { DEFAULT_LANGUAGE } from "./language";
import type { Language } from "./language";
import { EN } from "./messages.en";
import { UK } from "./messages.uk";

export type { MessageKey } from "./messages.en";
export type Dictionaries = Record<Language, Record<string, string>>;
export type Params = Record<string, string | number>;
export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

export const DICTIONARIES: Dictionaries = { en: EN, uk: UK };

function fill(template: string, params: Params): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

export function translate(
  language: Language,
  key: string,
  params: Params = {},
  dictionaries: Dictionaries = DICTIONARIES,
): string {
  const text = dictionaries[language][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  return fill(text, params);
}

export function plural(language: Language, count: number, forms: PluralForms): string {
  const category = new Intl.PluralRules(language).select(count) as keyof PluralForms;
  return forms[category] ?? forms.other;
}

export function translatePlural(
  language: Language,
  baseKey: string,
  count: number,
  params: Params = {},
): string {
  const category = new Intl.PluralRules(language).select(count);
  const key = `${baseKey}.${category}`;
  const chosenKey = key in DICTIONARIES[language] ? key : `${baseKey}.other`;
  return translate(language, chosenKey, { count, ...params });
}
