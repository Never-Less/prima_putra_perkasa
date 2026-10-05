"use client";

import type { ReactNode, RefObject } from "react";
import { Keyboard, LockKeyhole } from "lucide-react";
import { useI18n } from "../_i18n/provider";
import type { SpreadsheetActions } from "../_lib/spreadsheet-controller";

type ActionProps = { actionsRef: RefObject<SpreadsheetActions | null>; disabled?: boolean };

export function SpreadsheetToolbar({ actionsRef, disabled = false }: ActionProps) {
  const { t } = useI18n();
  const actions = ["undo", "redo", "insertAbove", "insertBelow", "deleteRows", "fillDown", "fillRight"] as const;
  return <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2" role="toolbar" aria-label={t("spreadsheet.actions")}>
    {actions.map((action) => <button key={action} type="button" disabled={disabled}
      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40"
      onMouseDown={(event) => event.preventDefault()} onClick={() => actionsRef.current?.[action]()}>
      {t("spreadsheet." + action)}
    </button>)}
  </div>;
}

export function SpreadsheetShortcutHelp() {
  const { t } = useI18n();
  return <details className="px-3 py-2 text-xs text-slate-500">
    <summary className="cursor-pointer">{t("spreadsheet.shortcuts")}</summary>
    <p className="mt-2 leading-6">{t("spreadsheet.shortcutHelp")}</p>
  </details>;
}

export function SpreadsheetFrame({ children, disabled = false, actionsRef }: { children: ReactNode } & ActionProps) {
  const { t } = useI18n();
  return <div className="spreadsheet-frame" data-readonly={disabled || undefined}>
    <SpreadsheetToolbar actionsRef={actionsRef} disabled={disabled} />
    {children}
    <div className="spreadsheet-footer">
      {disabled ? <LockKeyhole aria-hidden="true" /> : <Keyboard aria-hidden="true" />}
      <span>{t(disabled ? "spreadsheet.readOnly" : "spreadsheet.hint")}</span>
    </div>
    <SpreadsheetShortcutHelp />
  </div>;
}
