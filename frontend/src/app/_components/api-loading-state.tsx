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
      className={`flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3 text-sm text-sky-900 ${className}`}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
      <span>{label || t("common.loading")}</span>
    </div>
  );
}
