"use client";

import { AlertTriangle, Building2, CalendarDays, CircleDollarSign } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppDateInput } from "../_components/app-date-input";
import { readPersistentQueryValues, usePersistentQueryValues } from "../_hooks/use-persistent-query-values";
import { useI18n } from "../_i18n/provider";
import { requestApi } from "../_lib/api-client";
import { formatRupiah, formatTanggal, type PembelianItem } from "../pembelian/_lib/pembelian";
import { fetchSupplierRows, type SupplierItem } from "../supplier/_lib/supplier";

type WarningLevel = "normal" | "warning" | "critical";

type OutstandingPembelian = PembelianItem & {
  overdueDays: number;
  warningLevel: WarningLevel;
};

type OutstandingResponse = {
  pembelians?: OutstandingPembelian[];
  summary?: { totalRows?: number; totalHutang?: number };
};

const supplierDebtFilterDefaults = {
  supplierId: "",
  dueMonth: "",
  warningLevel: "",
  noteSearch: "",
  groupBy: "supplier",
};

function monthKey(value: string | null) {
  return String(value || "").slice(0, 7) || "-";
}

function formatMonthTitle(value: string, locale: "id" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

export default function HutangSupplierPage() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const initialFilter = readPersistentQueryValues(searchParams, supplierDebtFilterDefaults);
  const [rows, setRows] = useState<OutstandingPembelian[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [supplierId, setSupplierId] = useState(initialFilter.supplierId);
  const [dueMonth, setDueMonth] = useState(initialFilter.dueMonth);
  const [warningLevel, setWarningLevel] = useState(initialFilter.warningLevel);
  const [noteSearch, setNoteSearch] = useState(initialFilter.noteSearch);
  const [groupBy, setGroupBy] = useState<"supplier" | "month">(
    initialFilter.groupBy === "month" ? "month" : "supplier"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const restoreFilter = useCallback((values: typeof supplierDebtFilterDefaults) => {
    setSupplierId(values.supplierId);
    setDueMonth(values.dueMonth);
    setWarningLevel(values.warningLevel);
    setNoteSearch(values.noteSearch);
    setGroupBy(values.groupBy === "month" ? "month" : "supplier");
  }, []);

  usePersistentQueryValues({
    basePath: "/hutangSupplier",
    values: { supplierId, dueMonth, warningLevel, noteSearch, groupBy },
    defaults: supplierDebtFilterDefaults,
    onRestore: restoreFilter,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();
      if (supplierId) params.set("supplierId", supplierId);
      if (dueMonth) params.set("dueMonth", dueMonth);
      if (warningLevel) params.set("overdueLevel", warningLevel);

      const [response, supplierRows] = await Promise.all([
        requestApi<OutstandingResponse>(`/api/pembelian/outstanding${params.size ? `?${params}` : ""}`),
        fetchSupplierRows(),
      ]);

      setRows(Array.isArray(response?.pembelians) ? response.pembelians : []);
      setSuppliers(supplierRows);
    } catch {
      setRows([]);
      setErrorMessage(t("supplierDebt.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [dueMonth, supplierId, t, warningLevel]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const search = noteSearch.trim().toLowerCase();
    return search
      ? rows.filter((row) => String(row.noNota || "").toLowerCase().includes(search))
      : rows;
  }, [noteSearch, rows]);

  const groups = useMemo(() => {
    const map = new Map<string, OutstandingPembelian[]>();

    filteredRows.forEach((row) => {
      const key =
        groupBy === "supplier"
          ? `${row.idSupplier || row.namaSupplier}|${row.namaSupplier || "-"}`
          : monthKey(row.tanggalJatuhTempo);
      map.set(key, [...(map.get(key) || []), row]);
    });

    return Array.from(map.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [filteredRows, groupBy]);

  const totalHutang = filteredRows.reduce((total, row) => total + Number(row.nilaiNota || 0), 0);
  const criticalCount = filteredRows.filter((row) => row.warningLevel === "critical").length;
  const warningCount = filteredRows.filter((row) => row.warningLevel === "warning").length;
  const inputClass = "erp-field w-full";

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{t("supplierDebt.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("supplierDebt.description")}</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <CircleDollarSign className="h-5 w-5 text-blue-600" />
          <p className="mt-3 text-xs text-slate-500">{t("supplierDebt.total")}</p>
          <p className="text-lg font-semibold">{formatRupiah(totalHutang, locale)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t("supplierDebt.warning")}</p>
          <p className="text-lg font-semibold">{warningCount}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="mt-3 text-xs text-red-700 dark:text-red-300">{t("supplierDebt.critical")}</p>
          <p className="text-lg font-semibold">{criticalCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            {t("field.namaSupplier")}
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={inputClass}>
              <option value="">{t("common.all")}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.namaSupplier}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t("field.dueMonth")}
            <AppDateInput mode="month" value={dueMonth} onValueChange={setDueMonth} className={inputClass} />
          </label>
          <label className="text-sm">
            {t("field.warningLevel")}
            <select value={warningLevel} onChange={(event) => setWarningLevel(event.target.value)} className={inputClass}>
              <option value="">{t("common.all")}</option>
              <option value="normal">{t("supplierDebt.normal")}</option>
              <option value="warning">{t("supplierDebt.warning")}</option>
              <option value="critical">{t("supplierDebt.critical")}</option>
            </select>
          </label>
          <label className="text-sm">
            {t("field.noNota")}
            <input value={noteSearch} onChange={(event) => setNoteSearch(event.target.value)} className={inputClass} placeholder={t("supplierDebt.searchNota")} />
          </label>
          <label className="text-sm">
            {t("field.groupBy")}
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as "supplier" | "month")} className={inputClass}>
              <option value="supplier">{t("field.namaSupplier")}</option>
              <option value="month">{t("field.dueMonth")}</option>
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <ApiLoadingState />
      ) : errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</p>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          {t("supplierDebt.empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([key, groupRows]) => {
            const title = groupBy === "supplier" ? key.split("|")[1] : formatMonthTitle(key, locale);
            const groupTotal = groupRows.reduce((total, row) => total + Number(row.nilaiNota || 0), 0);

            return (
              <section key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 dark:bg-slate-900">
                  <h2 className="flex items-center gap-2 font-semibold">
                    {groupBy === "supplier" ? <Building2 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                    {title}
                  </h2>
                  <span className="text-sm font-semibold">{formatRupiah(groupTotal, locale)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="border-y border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2">{t("field.noNota")}</th>
                        {groupBy === "month" ? <th className="px-4 py-2">{t("field.namaSupplier")}</th> : null}
                        <th className="px-4 py-2">{t("field.tanggalNota")}</th>
                        <th className="px-4 py-2">{t("field.tanggalJatuhTempo")}</th>
                        <th className="px-4 py-2">{t("field.lamaHutang")}</th>
                        <th className="px-4 py-2 text-right">{t("field.nilaiNota")}</th>
                        <th className="px-4 py-2">{t("field.warningLevel")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {groupRows.map((row) => (
                        <tr
                          key={row.id}
                          className={row.warningLevel === "critical" ? "bg-red-50/70 dark:bg-red-950/20" : row.warningLevel === "warning" ? "bg-amber-50/70 dark:bg-amber-950/20" : ""}
                        >
                          <td className="px-4 py-3 font-medium">{row.noNota || "-"}</td>
                          {groupBy === "month" ? <td className="px-4 py-3">{row.namaSupplier || "-"}</td> : null}
                          <td className="px-4 py-3">{formatTanggal(row.tanggalNota, locale)}</td>
                          <td className="px-4 py-3">{formatTanggal(row.tanggalJatuhTempo, locale)}</td>
                          <td className="px-4 py-3">{row.lamaHutang} {t("common.days")}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatRupiah(row.nilaiNota, locale)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.warningLevel === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : row.warningLevel === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                              {row.overdueDays > 0
                                ? t("supplierDebt.overdueDays", { days: row.overdueDays })
                                : t("supplierDebt.notOverdue")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
