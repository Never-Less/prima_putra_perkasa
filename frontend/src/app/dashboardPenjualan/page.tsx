"use client";

import { BarChart3, CircleDollarSign, ReceiptText, TrendingUp, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError, requestApi } from "../_lib/api-client";
import { formatRupiah } from "../invoice/_lib/invoice";
import { readPersistentQueryValues, usePersistentQueryValues } from "../_hooks/use-persistent-query-values";

type SalesDashboardData = {
  summary: { revenue: number; invoiceCount: number; averageInvoice: number; paidCount: number; unpaidCount: number; paidAmount: number; unpaidAmount: number };
  monthly: Array<{ month: string; revenue: number; invoiceCount: number }>;
  topCustomers: Array<{ customerId: string; name: string; revenue: number; invoiceCount: number }>;
  topProducts: Array<{ name: string; specification: string; unit: string; quantity: number; revenue: number }>;
};
const dashboardFilterDefaults = { months: "12" };

export default function SalesDashboardPage() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const initialFilter = readPersistentQueryValues(searchParams, dashboardFilterDefaults);
  const [months, setMonths] = useState(initialFilter.months);
  const [data, setData] = useState<SalesDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const restoreFilter = useCallback((values: typeof dashboardFilterDefaults) => setMonths(values.months), []);
  usePersistentQueryValues({ basePath: "/dashboardPenjualan", values: { months }, defaults: dashboardFilterDefaults, onRestore: restoreFilter });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setData(await requestApi<SalesDashboardData>(`/api/dashboards/sales?months=${months}`));
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof ApiRequestError ? loadError.message : t("salesDashboard.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [months, t]);

  useEffect(() => { void loadData(); }, [loadData]);
  const maxMonthly = useMemo(() => Math.max(...(data?.monthly.map((row) => row.revenue) || [0]), 1), [data]);
  const maxCustomer = useMemo(() => Math.max(...(data?.topCustomers.map((row) => row.revenue) || [0]), 1), [data]);

  return <main className="erp-page space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{t("salesDashboard.title")}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("salesDashboard.description")}</p></div>
      <label className="text-sm text-slate-600 dark:text-slate-300">{t("dashboard.period")}<select value={months} onChange={(event) => setMonths(event.target.value)} className="erp-field ml-2"><option value="6">{t("dashboard.lastMonths", { count: 6 })}</option><option value="12">{t("dashboard.lastMonths", { count: 12 })}</option><option value="24">{t("dashboard.lastMonths", { count: 24 })}</option></select></label>
    </header>
    {isLoading ? <ApiLoadingState /> : error ? <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void loadData()} className="erp-button mt-3">{t("common.retry")}</button></section> : data ? <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [CircleDollarSign, t("salesDashboard.revenue"), formatRupiah(data.summary.revenue, locale)],
          [ReceiptText, t("salesDashboard.invoiceCount"), String(data.summary.invoiceCount)],
          [TrendingUp, t("salesDashboard.averageInvoice"), formatRupiah(data.summary.averageInvoice, locale)],
          [UsersRound, t("salesDashboard.unpaid"), `${data.summary.unpaidCount} · ${formatRupiah(data.summary.unpaidAmount, locale)}`],
        ].map(([Icon, label, value]) => { const IconComponent = Icon as typeof CircleDollarSign; return <article key={String(label)} className="erp-panel p-4"><IconComponent className="h-5 w-5 text-blue-600" /><p className="mt-3 text-xs font-medium uppercase text-slate-500">{String(label)}</p><p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{String(value)}</p></article>; })}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <article className="erp-panel p-4"><h2 className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4" />{t("salesDashboard.monthlyTrend")}</h2><div className="mt-5 space-y-3">{data.monthly.map((row) => <div key={row.month} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm"><span>{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${row.month}-01T00:00:00Z`))}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max((row.revenue / maxMonthly) * 100, 2)}%` }} /></div><span className="text-right font-medium">{formatRupiah(row.revenue, locale)}</span></div>)}</div></article>
        <article className="erp-panel p-4"><h2 className="font-semibold">{t("salesDashboard.paymentStatus")}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30"><p className="text-sm text-emerald-700 dark:text-emerald-300">{t("invoice.status.paid")}</p><p className="mt-1 text-xl font-semibold">{data.summary.paidCount}</p><p className="text-sm">{formatRupiah(data.summary.paidAmount, locale)}</p></div><div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30"><p className="text-sm text-amber-700 dark:text-amber-300">{t("invoice.status.unpaid")}</p><p className="mt-1 text-xl font-semibold">{data.summary.unpaidCount}</p><p className="text-sm">{formatRupiah(data.summary.unpaidAmount, locale)}</p></div></div></article>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <article className="erp-panel p-4"><h2 className="font-semibold">{t("salesDashboard.topCustomers")}</h2><div className="mt-4 space-y-3">{data.topCustomers.map((row, index) => <div key={row.customerId || row.name} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm"><span className="text-slate-400">{index + 1}</span><div><p className="truncate font-medium">{row.name}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-indigo-500" style={{ width: `${Math.max((row.revenue / maxCustomer) * 100, 2)}%` }} /></div></div><span className="font-medium">{formatRupiah(row.revenue, locale)}</span></div>)}</div></article>
        <article className="erp-panel overflow-hidden"><div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h2 className="font-semibold">{t("salesDashboard.topProducts")}</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="px-4 py-2">{t("field.namaBarang")}</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">{t("salesDashboard.revenue")}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.topProducts.map((row) => <tr key={`${row.name}-${row.specification}-${row.unit}`}><td className="px-4 py-3"><p className="font-medium">{row.name}</p><p className="text-xs text-slate-500">{row.specification}</p></td><td className="px-4 py-3 text-right">{row.quantity} {row.unit}</td><td className="px-4 py-3 text-right font-medium">{formatRupiah(row.revenue, locale)}</td></tr>)}</tbody></table></div></article>
      </section>
    </> : null}
  </main>;
}
