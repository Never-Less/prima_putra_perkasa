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
      className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 ${className}`}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
      <span>{label || t("common.loading")}</span>
    </div>
  );
}
