import { usePreferences } from "./PreferencesProvider";

/** Icon-only theme switch; the label always names the theme the click would turn on (design D10). */
export function ThemeToggle() {
  const { theme, toggleTheme, t } = usePreferences();
  const label = theme === "light" ? t("theme.switchToDark") : t("theme.switchToLight");

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 text-lg hover:border-foreground/40"
    >
      <span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>
    </button>
  );
}
