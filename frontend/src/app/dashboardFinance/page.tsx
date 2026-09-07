"use client";

import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CircleDollarSign, Landmark, ReceiptText, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError, requestApi } from "../_lib/api-client";
import { formatRupiah, formatTanggal } from "../invoice/_lib/invoice";
import { readPersistentQueryValues, usePersistentQueryValues } from "../_hooks/use-persistent-query-values";

type FinanceDashboardData = {
  summary: { billed: number; vat: number; cashIn: number; cashOut: number; netCashFlow: number; outstanding: { amount: number; count: number }; overdue: { amount: number; count: number }; payable: { amount: number; count: number } };
  monthly: { cashIn: Array<{ month: string; amount: number }>; cashOut: Array<{ month: string; amount: number }> };
  aging: Array<{ bucket: string; amount: number; count: number }>;
  upcoming: Array<{ id: string; noInvoice: string; dueDate: string; amount: number; customerName: string }>;
};

const agingOrder = ["current", "1-30", "31-60", "61-90", "90+"];
const dashboardFilterDefaults = { months: "12" };

export default function FinanceDashboardPage() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const initialFilter = readPersistentQueryValues(searchParams, dashboardFilterDefaults);
  const [months, setMonths] = useState(initialFilter.months);
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const restoreFilter = useCallback((values: typeof dashboardFilterDefaults) => setMonths(values.months), []);
  usePersistentQueryValues({ basePath: "/dashboardFinance", values: { months }, defaults: dashboardFilterDefaults, onRestore: restoreFilter });

  const loadData = useCallback(async () => {
    setIsLoading(true); setError("");
    try { setData(await requestApi<FinanceDashboardData>(`/api/dashboards/finance?months=${months}`)); }
    catch (loadError) { setData(null); setError(loadError instanceof ApiRequestError ? loadError.message : t("financeDashboard.loadError")); }
    finally { setIsLoading(false); }
  }, [months, t]);
  useEffect(() => { void loadData(); }, [loadData]);

  const monthlyRows = useMemo(() => {
    const map = new Map<string, { month: string; cashIn: number; cashOut: number }>();
    data?.monthly.cashIn.forEach((row) => map.set(row.month, { month: row.month, cashIn: row.amount, cashOut: 0 }));
    data?.monthly.cashOut.forEach((row) => map.set(row.month, { ...(map.get(row.month) || { month: row.month, cashIn: 0, cashOut: 0 }), cashOut: row.amount }));
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);
  const maxCash = Math.max(...monthlyRows.flatMap((row) => [row.cashIn, row.cashOut]), 1);
  const agingRows = agingOrder.map((bucket) => data?.aging.find((row) => row.bucket === bucket) || { bucket, amount: 0, count: 0 });
  const maxAging = Math.max(...agingRows.map((row) => row.amount), 1);

  return <main className="erp-page space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{t("financeDashboard.title")}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("financeDashboard.description")}</p></div><label className="text-sm text-slate-600 dark:text-slate-300">{t("dashboard.period")}<select value={months} onChange={(event) => setMonths(event.target.value)} className="erp-field ml-2"><option value="6">{t("dashboard.lastMonths", { count: 6 })}</option><option value="12">{t("dashboard.lastMonths", { count: 12 })}</option><option value="24">{t("dashboard.lastMonths", { count: 24 })}</option></select></label></header>
    {isLoading ? <ApiLoadingState /> : error ? <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void loadData()} className="erp-button mt-3">{t("common.retry")}</button></section> : data ? <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [ArrowDownLeft, t("financeDashboard.cashIn"), data.summary.cashIn, "text-emerald-600"],
          [ArrowUpRight, t("financeDashboard.cashOut"), data.summary.cashOut, "text-red-600"],
          [Landmark, t("financeDashboard.netCashFlow"), data.summary.netCashFlow, data.summary.netCashFlow >= 0 ? "text-blue-600" : "text-red-600"],
          [ReceiptText, t("financeDashboard.vat"), data.summary.vat, "text-indigo-600"],
        ].map(([Icon, label, value, color]) => { const IconComponent = Icon as typeof CircleDollarSign; return <article key={String(label)} className="erp-panel p-4"><IconComponent className={`h-5 w-5 ${String(color)}`} /><p className="mt-3 text-xs font-medium uppercase text-slate-500">{String(label)}</p><p className="mt-1 text-lg font-semibold">{formatRupiah(Number(value), locale)}</p></article>; })}
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><WalletCards className="h-5 w-5 text-amber-600" /><p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{t("financeDashboard.outstanding")}</p><p className="text-xl font-semibold">{formatRupiah(data.summary.outstanding.amount, locale)}</p><p className="text-xs">{t("financeDashboard.documents", { count: data.summary.outstanding.count })}</p></article>
        <article className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"><AlertTriangle className="h-5 w-5 text-red-600" /><p className="mt-3 text-sm text-red-700 dark:text-red-300">{t("financeDashboard.overdue")}</p><p className="text-xl font-semibold">{formatRupiah(data.summary.overdue.amount, locale)}</p><p className="text-xs">{t("financeDashboard.documents", { count: data.summary.overdue.count })}</p></article>
        <article className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30"><CircleDollarSign className="h-5 w-5 text-violet-600" /><p className="mt-3 text-sm text-violet-700 dark:text-violet-300">{t("financeDashboard.payable")}</p><p className="text-xl font-semibold">{formatRupiah(data.summary.payable.amount, locale)}</p><p className="text-xs">{t("financeDashboard.documents", { count: data.summary.payable.count })}</p></article>
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <article className="erp-panel p-4"><h2 className="font-semibold">{t("financeDashboard.cashFlow")}</h2><div className="mt-5 space-y-4">{monthlyRows.map((row) => <div key={row.month} className="grid grid-cols-[5rem_1fr] gap-3 text-sm"><span>{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${row.month}-01T00:00:00Z`))}</span><div className="space-y-1.5"><div className="flex items-center gap-2"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(row.cashIn / maxCash * 100, 1)}%` }} /><span className="whitespace-nowrap text-xs">{formatRupiah(row.cashIn, locale)}</span></div><div className="flex items-center gap-2"><div className="h-2 rounded-full bg-red-400" style={{ width: `${Math.max(row.cashOut / maxCash * 100, 1)}%` }} /><span className="whitespace-nowrap text-xs">{formatRupiah(row.cashOut, locale)}</span></div></div></div>)}</div></article>
        <article className="erp-panel p-4"><h2 className="font-semibold">{t("financeDashboard.aging")}</h2><div className="mt-5 space-y-3">{agingRows.map((row) => <div key={row.bucket}><div className="flex justify-between gap-3 text-sm"><span>{t(`financeDashboard.aging.${row.bucket}`)}</span><span className="font-medium">{formatRupiah(row.amount, locale)}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(row.amount / maxAging * 100, row.amount ? 2 : 0)}%` }} /></div></div>)}</div></article>
      </section>
      <article className="erp-panel overflow-hidden"><div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h2 className="font-semibold">{t("financeDashboard.upcoming")}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="px-4 py-2">{t("field.noInvoice")}</th><th className="px-4 py-2">{t("field.namaCustomer")}</th><th className="px-4 py-2">{t("field.dueDate")}</th><th className="px-4 py-2 text-right">{t("field.grandTotal")}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.upcoming.length ? data.upcoming.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium">{row.noInvoice}</td><td className="px-4 py-3">{row.customerName}</td><td className="px-4 py-3">{formatTanggal(row.dueDate, locale)}</td><td className="px-4 py-3 text-right font-medium">{formatRupiah(row.amount, locale)}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{t("financeDashboard.upcomingEmpty")}</td></tr>}</tbody></table></div></article>
    </> : null}
  </main>;
}
