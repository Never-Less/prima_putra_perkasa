"use client";

import { useI18n } from "../_i18n/provider";

type ApiLoadingStateProps = {
  label?: string;
  className?: string;
};

export function ApiLoadingState({ label, className = "" }: ApiLoadingStateProps) {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100 ${className}`}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700 dark:border-sky-800 dark:border-t-sky-300" />
      <span>{label || t("common.loading")}</span>
    </div>
  );
}
