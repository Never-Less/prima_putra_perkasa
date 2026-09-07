"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n } from "../_i18n/provider";
import { useTheme } from "../_theme/provider";

type ThemeToggleProps = {
  className?: string;
  fullWidth?: boolean;
};

export function ThemeToggle({ className = "", fullWidth = false }: ThemeToggleProps) {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      className={`erp-button ${fullWidth ? "w-full justify-start" : ""} ${className}`}
    >
      {isDark ? <Moon aria-hidden="true" className="h-4 w-4" /> : <Sun aria-hidden="true" className="h-4 w-4" />}
      <span>
        {t("nav.theme")}: {isDark ? t("theme.dark") : t("theme.light")}
      </span>
    </button>
  );
}
