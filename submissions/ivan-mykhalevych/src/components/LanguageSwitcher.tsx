"use client";

import { useEffect } from "react";
import { LANGUAGES, LANGUAGE_NAMES, parseLanguage } from "@/lib/language";
import { saveLanguage } from "@/lib/languageStore";
import { useT } from "@/lib/useLanguage";

export default function LanguageSwitcher() {
  const { language, t } = useT();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <select
      aria-label={t("language.label")}
      value={language}
      onChange={(event) => {
        const chosen = parseLanguage(event.target.value);
        if (chosen) saveLanguage(chosen);
      }}
      className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm backdrop-blur"
    >
      {LANGUAGES.map((code) => (
        <option key={code} value={code}>
          {LANGUAGE_NAMES[code]}
        </option>
      ))}
    </select>
  );
}
