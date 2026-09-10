"use client";

import type { ReactNode } from "react";
import { Keyboard, LockKeyhole } from "lucide-react";
import { useI18n } from "../_i18n/provider";

export function SpreadsheetFrame({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="spreadsheet-frame" data-readonly={disabled || undefined}>
      {children}
      <div className="spreadsheet-footer">
        {disabled ? <LockKeyhole aria-hidden="true" /> : <Keyboard aria-hidden="true" />}
        <span>{t(disabled ? "spreadsheet.readOnly" : "spreadsheet.hint")}</span>
      </div>
    </div>
  );
}
