"use client";

import { ChevronDown, ChevronUp, History, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { useI18n } from "../_i18n/provider";
import { requestApi } from "../_lib/api-client";

export type AuditEntityType = "purchaseOrder" | "suratJalan" | "invoice" | "pembelian";

type AuditChange = { field: string; before: unknown; after: unknown };
type AuditLogItem = {
  id: string;
  action: "create" | "update" | "delete";
  actor?: { username?: string; role?: string };
  changes: AuditChange[];
  createdAt: string;
};

function AuditValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span>-</span>;
  if (typeof value === "object") {
    return <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-2 text-[11px] dark:bg-slate-950">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <span className="break-words">{String(value)}</span>;
}

export function DocumentAuditLog({ entityType, entityId }: { entityType: AuditEntityType; entityId: string }) {
  const { locale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await requestApi<{ logs?: AuditLogItem[] }>(`/api/audit-logs?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);
      setLogs(Array.isArray(response?.logs) ? response.logs : []);
    } catch {
      setErrorMessage(t("auditLog.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [entityId, entityType, t]);

  const toggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) void loadLogs();
  };

  return <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div className="flex items-center justify-between gap-3 p-4">
      <button type="button" onClick={toggleOpen} className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
        <History className="h-4 w-4 text-sky-600" />{t("auditLog.title")}{isOpen ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
      </button>
      {isOpen ? <button type="button" onClick={() => void loadLogs()} disabled={isLoading} title={t("common.refresh")} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"><RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /></button> : null}
    </div>
    {isOpen ? <div className="border-t border-slate-200 p-4 dark:border-slate-800">
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : isLoading && logs.length === 0 ? <p className="text-sm text-slate-500">{t("common.loading")}</p> : logs.length === 0 ? <p className="text-sm text-slate-500">{t("auditLog.empty")}</p> : <ol className="space-y-3">
        {logs.map((log) => <li key={log.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${log.action === "create" ? "bg-emerald-100 text-emerald-700" : log.action === "delete" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}>{t(`auditLog.action.${log.action}`)}</span><span className="text-sm font-medium text-slate-800 dark:text-slate-100">{log.actor?.username || t("auditLog.system")}</span></div><time className="text-xs text-slate-500">{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</time></div>
          {log.changes.length > 0 ? <div className="mt-3 space-y-2">{log.changes.map((change, index) => <details key={`${change.field}-${index}`} className="rounded border border-slate-100 p-2 dark:border-slate-800"><summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">{t("auditLog.fieldChanged", { field: change.field })}</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><div><p className="mb-1 text-[11px] uppercase text-slate-400">{t("auditLog.before")}</p><AuditValue value={change.before} /></div><div><p className="mb-1 text-[11px] uppercase text-slate-400">{t("auditLog.after")}</p><AuditValue value={change.after} /></div></div></details>)}</div> : null}
        </li>)}
      </ol>}
    </div> : null}
  </section>;
}
