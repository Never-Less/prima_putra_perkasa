"use client";

import { AlertTriangle, CalendarDays, CircleDollarSign, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { useI18n } from "../_i18n/provider";
import { requestApi } from "../_lib/api-client";
import { fetchCustomerRows, type CustomerItem } from "../customer/_lib/customer";
import { formatRupiah, formatTanggal, type InvoiceItem } from "../invoice/_lib/invoice";
import { readPersistentQueryValues, usePersistentQueryValues } from "../_hooks/use-persistent-query-values";

type WarningLevel = "normal" | "warning" | "critical";
type OutstandingInvoice = InvoiceItem & {
  customerName: string;
  overdueDays: number;
  warningLevel: WarningLevel;
};

type OutstandingResponse = {
  invoices?: OutstandingInvoice[];
  summary?: { totalRows?: number; totalOutstanding?: number };
};
const outstandingFilterDefaults = { customerId: "", dueMonth: "", warningLevel: "", invoiceSearch: "", groupBy: "customer" };

function monthKey(value: string) {
  return String(value || "").slice(0, 7) || "-";
}

export default function TagihanBelumDibayarPage() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const initialFilter = readPersistentQueryValues(searchParams, outstandingFilterDefaults);
  const [rows, setRows] = useState<OutstandingInvoice[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [customerId, setCustomerId] = useState(initialFilter.customerId);
  const [dueMonth, setDueMonth] = useState(initialFilter.dueMonth);
  const [warningLevel, setWarningLevel] = useState(initialFilter.warningLevel);
  const [invoiceSearch, setInvoiceSearch] = useState(initialFilter.invoiceSearch);
  const [groupBy, setGroupBy] = useState<"customer" | "month">(initialFilter.groupBy === "month" ? "month" : "customer");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const restoreFilter = useCallback((values: typeof outstandingFilterDefaults) => { setCustomerId(values.customerId); setDueMonth(values.dueMonth); setWarningLevel(values.warningLevel); setInvoiceSearch(values.invoiceSearch); setGroupBy(values.groupBy === "month" ? "month" : "customer"); }, []);
  usePersistentQueryValues({ basePath: "/tagihanBelumDibayar", values: { customerId, dueMonth, warningLevel, invoiceSearch, groupBy }, defaults: outstandingFilterDefaults, onRestore: restoreFilter });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (customerId) params.set("customerId", customerId);
      if (dueMonth) params.set("dueMonth", dueMonth);
      if (warningLevel) params.set("overdueLevel", warningLevel);
      const [response, customerRows] = await Promise.all([
        requestApi<OutstandingResponse>(`/api/invoices/outstanding${params.size ? `?${params}` : ""}`),
        fetchCustomerRows(),
      ]);
      setRows(Array.isArray(response?.invoices) ? response.invoices : []);
      setCustomers(customerRows);
    } catch {
      setRows([]);
      setErrorMessage(t("outstanding.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, dueMonth, t, warningLevel]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const search = invoiceSearch.trim().toLowerCase();
    return search
      ? rows.filter((row) => row.noInvoice.toLowerCase().includes(search))
      : rows;
  }, [invoiceSearch, rows]);

  const groups = useMemo(() => {
    const map = new Map<string, OutstandingInvoice[]>();
    filteredRows.forEach((row) => {
      const key = groupBy === "customer" ? `${row.idCustomer}|${row.customerName}` : monthKey(row.dueDate);
      map.set(key, [...(map.get(key) || []), row]);
    });
    return Array.from(map.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [filteredRows, groupBy]);

  const totalOutstanding = filteredRows.reduce((total, row) => total + Number(row.grandTotal || 0), 0);
  const criticalCount = filteredRows.filter((row) => row.warningLevel === "critical").length;
  const warningCount = filteredRows.filter((row) => row.warningLevel === "warning").length;
  const inputClass = "erp-field w-full";

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{t("outstanding.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("outstanding.description")}</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><CircleDollarSign className="h-5 w-5 text-blue-600" /><p className="mt-3 text-xs text-slate-500">{t("outstanding.total")}</p><p className="text-lg font-semibold">{formatRupiah(totalOutstanding, locale)}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><AlertTriangle className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t("outstanding.warning")}</p><p className="text-lg font-semibold">{warningCount}</p></div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"><AlertTriangle className="h-5 w-5 text-red-600" /><p className="mt-3 text-xs text-red-700 dark:text-red-300">{t("outstanding.critical")}</p><p className="text-lg font-semibold">{criticalCount}</p></div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">{t("field.namaCustomer")}<select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={inputClass}><option value="">{t("common.all")}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.nama}</option>)}</select></label>
          <label className="text-sm">{t("field.dueMonth")}<input type="month" value={dueMonth} onChange={(event) => setDueMonth(event.target.value)} className={inputClass} /></label>
          <label className="text-sm">{t("field.warningLevel")}<select value={warningLevel} onChange={(event) => setWarningLevel(event.target.value)} className={inputClass}><option value="">{t("common.all")}</option><option value="normal">{t("outstanding.normal")}</option><option value="warning">{t("outstanding.warning")}</option><option value="critical">{t("outstanding.critical")}</option></select></label>
          <label className="text-sm">{t("field.noInvoice")}<input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} className={inputClass} placeholder={t("outstanding.searchInvoice")} /></label>
          <label className="text-sm">{t("field.groupBy")}<select value={groupBy} onChange={(event) => setGroupBy(event.target.value as "customer" | "month")} className={inputClass}><option value="customer">{t("field.namaCustomer")}</option><option value="month">{t("field.dueMonth")}</option></select></label>
        </div>
      </section>

      {isLoading ? <ApiLoadingState /> : errorMessage ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</p> : groups.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950">{t("outstanding.empty")}</p> : (
        <div className="space-y-4">
          {groups.map(([key, groupRows]) => {
            const title = groupBy === "customer" ? key.split("|")[1] : new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
            const groupTotal = groupRows.reduce((total, row) => total + Number(row.grandTotal || 0), 0);
            return <section key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 dark:bg-slate-900"><h2 className="flex items-center gap-2 font-semibold">{groupBy === "customer" ? <UsersRound className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}{title}</h2><span className="text-sm font-semibold">{formatRupiah(groupTotal, locale)}</span></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-y border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800"><tr><th className="px-4 py-2">{t("field.noInvoice")}</th>{groupBy === "month" ? <th className="px-4 py-2">{t("field.namaCustomer")}</th> : null}<th className="px-4 py-2">{t("field.tanggal")}</th><th className="px-4 py-2">{t("field.dueDate")}</th><th className="px-4 py-2">{t("field.paymentTerm")}</th><th className="px-4 py-2 text-right">{t("field.grandTotal")}</th><th className="px-4 py-2">{t("field.warningLevel")}</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{groupRows.map((row) => <tr key={row.id} className={row.warningLevel === "critical" ? "bg-red-50/70 dark:bg-red-950/20" : row.warningLevel === "warning" ? "bg-amber-50/70 dark:bg-amber-950/20" : ""}><td className="px-4 py-3 font-medium">{row.noInvoice}</td>{groupBy === "month" ? <td className="px-4 py-3">{row.customerName}</td> : null}<td className="px-4 py-3">{formatTanggal(row.tanggal, locale)}</td><td className="px-4 py-3">{formatTanggal(row.dueDate, locale)}</td><td className="px-4 py-3">{row.paymentTerm.type === "net" ? `Net ${row.paymentTerm.netDays}` : row.paymentTerm.type === "dpNet" ? `DP ${row.paymentTerm.downPaymentPercent}%, Net ${row.paymentTerm.remainingPaymentPercent}% / ${row.paymentTerm.netDays} ${t("common.days")}` : t(`paymentTerm.${row.paymentTerm.type}`)}</td><td className="px-4 py-3 text-right font-medium">{formatRupiah(row.grandTotal, locale)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${row.warningLevel === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : row.warningLevel === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>{row.overdueDays > 0 ? t("outstanding.overdueDays", { days: row.overdueDays }) : t("outstanding.notOverdue")}</span></td></tr>)}</tbody>
              </table></div>
            </section>;
          })}
        </div>
      )}
    </main>
  );
}
