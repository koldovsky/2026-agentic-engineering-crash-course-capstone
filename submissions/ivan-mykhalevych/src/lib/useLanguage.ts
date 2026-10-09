"use client";

import { useSyncExternalStore } from "react";
import type { Language } from "./language";
import { readLanguage, serverLanguage } from "./languageStore";
import { subscribeToStore } from "./profileStore";
import { translate, translatePlural } from "./translate";
import type { MessageKey, Params } from "./translate";

export function useLanguage(): Language {
  return useSyncExternalStore(subscribeToStore, readLanguage, serverLanguage);
}

export function useT() {
  const language = useLanguage();
  return {
    language,
    t: (key: MessageKey, params?: Params) => translate(language, key, params),
    tn: (baseKey: string, count: number, params?: Params) => translatePlural(language, baseKey, count, params),
  };
}
