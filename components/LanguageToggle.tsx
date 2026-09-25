import { usePreferences } from "./PreferencesProvider";

/** Shows the current language (УКР / ENG) and switches to the other one (design D13). */
export function LanguageToggle() {
  const { toggleLanguage, t } = usePreferences();

  return (
    <button
      type="button"
      data-testid="lang-toggle"
      aria-label={t("language.switch")}
      onClick={toggleLanguage}
      className="h-10 rounded-full border border-foreground/15 px-3 text-sm font-semibold hover:border-foreground/40"
    >
      {t("language.short")}
    </button>
  );
}
