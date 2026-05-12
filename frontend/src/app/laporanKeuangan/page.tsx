"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError } from "../_lib/api-client";
import { fetchCustomerRows } from "../customer/_lib/customer";
import { fetchPembelianRows, type PembelianItem } from "../pembelian/_lib/pembelian";
import {
  defaultInvoiceFilter,
  fetchInvoiceExportRows,
  type InvoiceItem,
} from "../invoice/_lib/invoice";
import {
  buildPurchaseTotalByInvoiceId,
  calculateLaporanKeuanganMonthSummary,
  fetchLaporanKeuangan,
  formatLaporanKeuanganCurrency,
  formatLaporanKeuanganMonth,
  getCurrentMonthValue,
  getCurrentYearValue,
  getMonthDateRange,
  getYearMonthValues,
  saveLaporanKeuangan,
  type LaporanKeuanganItem,
  type LaporanKeuanganMonthSummary,
} from "./_lib/laporan-keuangan";

type ReportMode = "monthly" | "yearly";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type FormRow = {
  id: string;
  namaBiaya: string;
  jumlah: string;
};

let rowIdCounter = 0;

function getAmountDigits(value: number | string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatAmountInput(value: number | string | null | undefined) {
  const digits = getAmountDigits(value);

  if (!digits) {
    return "";
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function createFormRow(row?: { namaBiaya?: string; jumlah?: number | string }): FormRow {
  rowIdCounter += 1;

  return {
    id: `rincian-biaya-${Date.now()}-${rowIdCounter}`,
    namaBiaya: row?.namaBiaya || "",
    jumlah: formatAmountInput(row?.jumlah),
  };
}

function toFormRows(item: LaporanKeuanganItem | null) {
  if (!item?.rincianBiaya.length) {
    return [createFormRow()];
  }

  return item.rincianBiaya.map((row) => createFormRow(row));
}

function normalizeAmount(value: string) {
  const digits = getAmountDigits(value);

  if (!digits) {
    return null;
  }

  const number = Number(digits);

  return Number.isFinite(number) && number >= 0 ? number : null;
}

export default function LaporanKeuanganPage() {
  const { locale, t } = useI18n();
  const [reportMode, setReportMode] = useState<ReportMode>("monthly");
  const [bulan, setBulan] = useState(getCurrentMonthValue);
  const [tahun, setTahun] = useState(getCurrentYearValue);
  const [rows, setRows] = useState<FormRow[]>(() => [createFormRow()]);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceItem[]>([]);
  const [pembelianRows, setPembelianRows] = useState<PembelianItem[]>([]);
  const [yearlyRows, setYearlyRows] = useState<LaporanKeuanganMonthSummary[]>([]);
  const [customerLabelMap, setCustomerLabelMap] = useState<Map<string, string>>(new Map());
  const [lastSavedItem, setLastSavedItem] = useState<LaporanKeuanganItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [yearlyErrorMessage, setYearlyErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, variant: ToastState["variant"]) => {
    setToast({
      id: Date.now(),
      message,
      variant,
    });
  }, []);

  const loadLaporanKeuangan = useCallback(
    async (selectedBulan: string) => {
      if (!selectedBulan) {
        setRows([createFormRow()]);
        setInvoiceRows([]);
        setPembelianRows([]);
        setCustomerLabelMap(new Map());
        setLastSavedItem(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setActionErrorMessage("");

      try {
        const { tanggalDari, tanggalSampai } = getMonthDateRange(selectedBulan);
        const [item, invoices, customers, pembelians] = await Promise.all([
          fetchLaporanKeuangan(selectedBulan),
          fetchInvoiceExportRows({
            ...defaultInvoiceFilter,
            tanggalDari,
            tanggalSampai,
          }),
          fetchCustomerRows(),
          fetchPembelianRows(),
        ]);

        setLastSavedItem(item);
        setRows(toFormRows(item));
        setInvoiceRows(invoices);
        setPembelianRows(pembelians);
        setCustomerLabelMap(
          new Map(customers.map((customer) => [customer.id, customer.nama || customer.id]))
        );
      } catch (error) {
        setLastSavedItem(null);
        setRows([createFormRow()]);
        setInvoiceRows([]);
        setPembelianRows([]);
        setCustomerLabelMap(new Map());

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("laporanKeuangan.apiLoadError"));
          return;
        }

        setErrorMessage(t("laporanKeuangan.apiLoadError"));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const loadYearlyLaporanKeuangan = useCallback(
    async (selectedTahun: string) => {
      const monthValues = getYearMonthValues(selectedTahun);

      if (monthValues.length === 0) {
        setYearlyRows([]);
        setIsYearlyLoading(false);
        setYearlyErrorMessage("");
        return;
      }

      setIsYearlyLoading(true);
      setYearlyErrorMessage("");

      try {
        const [laporanKeuanganItems, invoiceRowsByMonth, pembelians] = await Promise.all([
          Promise.all(monthValues.map((monthValue) => fetchLaporanKeuangan(monthValue))),
          Promise.all(
            monthValues.map((monthValue) => {
              const { tanggalDari, tanggalSampai } = getMonthDateRange(monthValue);

              return fetchInvoiceExportRows({
                ...defaultInvoiceFilter,
                tanggalDari,
                tanggalSampai,
              });
            })
          ),
          fetchPembelianRows(),
        ]);

        setYearlyRows(
          monthValues.map((monthValue, index) =>
            calculateLaporanKeuanganMonthSummary({
              bulan: monthValue,
              invoiceRows: invoiceRowsByMonth[index] || [],
              laporanKeuangan: laporanKeuanganItems[index] || null,
              pembelianRows: pembelians,
            })
          )
        );
      } catch (error) {
        setYearlyRows([]);

        if (error instanceof ApiRequestError) {
          setYearlyErrorMessage(error.message || t("laporanKeuangan.apiLoadError"));
          return;
        }

        setYearlyErrorMessage(t("laporanKeuangan.apiLoadError"));
      } finally {
        setIsYearlyLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (reportMode === "monthly") {
      void loadLaporanKeuangan(bulan);
    }
  }, [bulan, loadLaporanKeuangan, reportMode]);

  useEffect(() => {
    if (reportMode === "yearly") {
      void loadYearlyLaporanKeuangan(tahun);
    }
  }, [loadYearlyLaporanKeuangan, reportMode, tahun]);

  const totalBiayaOperasional = useMemo(() => {
    return rows.reduce((total, row) => total + (normalizeAmount(row.jumlah) ?? 0), 0);
  }, [rows]);
  const invoiceGrandTotal = useMemo(() => {
    return invoiceRows.reduce((total, row) => total + Number(row.grandTotal || 0), 0);
  }, [invoiceRows]);
  const purchaseTotalByInvoiceId = useMemo(() => {
    return buildPurchaseTotalByInvoiceId(pembelianRows);
  }, [pembelianRows]);
  const purchaseTotal = useMemo(() => {
    return invoiceRows.reduce(
      (total, row) => total + (purchaseTotalByInvoiceId.get(row.id) || 0),
      0
    );
  }, [invoiceRows, purchaseTotalByInvoiceId]);
  const grossProfit = invoiceGrandTotal - purchaseTotal;
  const netProfit = grossProfit - totalBiayaOperasional;

  const selectedMonthLabel = useMemo(
    () => formatLaporanKeuanganMonth(bulan, locale),
    [bulan, locale]
  );
  const selectedYearLabel = tahun.trim() || "-";
  const yearlyTotals = useMemo<LaporanKeuanganMonthSummary>(() => {
    return yearlyRows.reduce(
      (total, row) => ({
        bulan: selectedYearLabel,
        totalInvoice: total.totalInvoice + row.totalInvoice,
        totalPembelian: total.totalPembelian + row.totalPembelian,
        grossProfit: total.grossProfit + row.grossProfit,
        totalBiayaOperasional:
          total.totalBiayaOperasional + row.totalBiayaOperasional,
        netProfit: total.netProfit + row.netProfit,
      }),
      {
        bulan: selectedYearLabel,
        totalInvoice: 0,
        totalPembelian: 0,
        grossProfit: 0,
        totalBiayaOperasional: 0,
        netProfit: 0,
      }
    );
  }, [selectedYearLabel, yearlyRows]);
  const activeSummary =
    reportMode === "yearly"
      ? yearlyTotals
      : {
          bulan,
          totalInvoice: invoiceGrandTotal,
          totalPembelian: purchaseTotal,
          grossProfit,
          totalBiayaOperasional,
          netProfit,
        };
  const activePeriodLabel = reportMode === "yearly" ? selectedYearLabel : selectedMonthLabel;
  const isActiveLoading = reportMode === "yearly" ? isYearlyLoading : isLoading;

  const canRemoveRow = rows.length > 1;

  function getReportModeButtonClassName(mode: ReportMode) {
    const isActive = reportMode === mode;

    return `rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-sky-600 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950"
        : "text-slate-600 hover:bg-sky-50 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;
  }

  function updateRow(id: string, field: keyof Omit<FormRow, "id">, value: string) {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function removeRow(id: string) {
    setRows((prevRows) => {
      if (prevRows.length <= 1) {
        return prevRows;
      }

      return prevRows.filter((row) => row.id !== id);
    });
  }

  const handleOpenExportPage = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (reportMode === "monthly" && !bulan) {
      return;
    }

    if (reportMode === "yearly" && getYearMonthValues(tahun).length === 0) {
      return;
    }

    const searchParams = new URLSearchParams(
      reportMode === "yearly" ? { mode: reportMode, tahun } : { mode: reportMode, bulan }
    );
    window.open(
      `/laporanKeuangan/export?${searchParams.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [bulan, reportMode, tahun]);

  async function handleSave() {
    setActionErrorMessage("");
    setToast(null);

    if (!bulan) {
      const message = t("laporanKeuangan.validation.bulanRequired");
      setActionErrorMessage(message);
      showToast(message, "error");
      return;
    }

    const normalizedRows = [];

    for (const row of rows) {
      const namaBiaya = row.namaBiaya.trim();
      const jumlah = normalizeAmount(row.jumlah);

      if (!namaBiaya) {
        const message = t("laporanKeuangan.validation.namaBiayaRequired");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      if (jumlah === null) {
        const message = t("laporanKeuangan.validation.jumlahInvalid");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      normalizedRows.push({ namaBiaya, jumlah });
    }

    setIsSaving(true);

    try {
      const savedItem = await saveLaporanKeuangan({
        bulan,
        rincianBiaya: normalizedRows,
      });

      setLastSavedItem(savedItem);
      setRows(toFormRows(savedItem));
      showToast(
        t("laporanKeuangan.toast.saveSuccess", {
          bulan: selectedMonthLabel,
        }),
        "success"
      );
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const message = error.message || t("laporanKeuangan.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      const message = t("laporanKeuangan.mutationError");
      setActionErrorMessage(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("nav.laporanKeuangan")}</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t("laporanKeuangan.page.description")}</p>
            </div>
            <button
              type="button"
              onClick={handleOpenExportPage}
              disabled={
                reportMode === "monthly" ? !bulan : getYearMonthValues(tahun).length === 0
              }
              className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-800 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {t("laporanKeuangan.exportPage.openButton")}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-sky-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("laporanKeuangan.reportMode.label")}
              </span>
              <div className="mt-1 inline-flex rounded-lg border border-sky-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setReportMode("monthly")}
                  className={getReportModeButtonClassName("monthly")}
                >
                  {t("laporanKeuangan.reportMode.monthly")}
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode("yearly")}
                  className={getReportModeButtonClassName("yearly")}
                >
                  {t("laporanKeuangan.reportMode.yearly")}
                </button>
              </div>
            </div>
            {reportMode === "monthly" ? (
              <label className="block min-w-48 text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("field.bulan")}
                <input
                  type="month"
                  value={bulan}
                  onChange={(event) => setBulan(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900/60"
                />
              </label>
            ) : (
              <label className="block min-w-48 text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("field.tahun")}
                <input
                  type="number"
                  min="1000"
                  max="9999"
                  value={tahun}
                  onChange={(event) => setTahun(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900/60"
                />
              </label>
            )}
          </div>
        </section>

        {reportMode === "monthly" ? (
          <section className="mt-5 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("laporanKeuangan.invoiceTable.title")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t("laporanKeuangan.invoiceTable.description", { bulan: selectedMonthLabel })}
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              {t("field.grossProfit")}: {formatLaporanKeuanganCurrency(grossProfit, locale)}
            </span>
          </div>

          {invoiceRows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {t("laporanKeuangan.invoiceTable.empty")}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[860px] table-fixed text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t("field.tanggal")}</th>
                    <th className="px-3 py-2">{t("field.noInvoice")}</th>
                    <th className="px-3 py-2">{t("field.namaCustomer")}</th>
                    <th className="px-3 py-2 text-right">{t("field.grandTotal")}</th>
                    <th className="px-3 py-2 text-right">{t("field.totalPembelian")}</th>
                    <th className="px-3 py-2 text-right">{t("field.grossProfit")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoiceRows.map((row) => {
                    const rowPembelian = purchaseTotalByInvoiceId.get(row.id) || 0;
                    const rowProfit = Number(row.grandTotal || 0) - rowPembelian;

                    return (
                      <tr key={row.id} className="text-slate-700 dark:text-slate-200">
                        <td className="truncate px-3 py-2">{row.tanggal ? row.tanggal.slice(0, 10) : "-"}</td>
                        <td className="truncate px-3 py-2 font-medium" title={row.noInvoice || "-"}>{row.noInvoice || "-"}</td>
                        <td className="truncate px-3 py-2" title={customerLabelMap.get(row.idCustomer) || row.idCustomer || "-"}>
                          {customerLabelMap.get(row.idCustomer) || row.idCustomer || "-"}
                        </td>
                        <td className="truncate px-3 py-2 text-right font-medium">
                          {formatLaporanKeuanganCurrency(row.grandTotal, locale)}
                        </td>
                        <td className="truncate px-3 py-2 text-right font-medium">
                          {formatLaporanKeuanganCurrency(rowPembelian, locale)}
                        </td>
                        <td className="truncate px-3 py-2 text-right font-medium">
                          {formatLaporanKeuanganCurrency(rowProfit, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  <tr>
                    <td className="truncate px-3 py-2 text-right" colSpan={3}>{t("field.grossProfit")}</td>
                    <td className="truncate px-3 py-2 text-right">{formatLaporanKeuanganCurrency(invoiceGrandTotal, locale)}</td>
                    <td className="truncate px-3 py-2 text-right">{formatLaporanKeuanganCurrency(purchaseTotal, locale)}</td>
                    <td className="truncate px-3 py-2 text-right">{formatLaporanKeuanganCurrency(grossProfit, locale)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("laporanKeuangan.yearlyTable.title")}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {t("laporanKeuangan.yearlyTable.description", { tahun: selectedYearLabel })}
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-sm font-medium ${
                yearlyTotals.netProfit >= 0
                  ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              }`}>
                {t("field.netProfit")}: {formatLaporanKeuanganCurrency(yearlyTotals.netProfit, locale)}
              </span>
            </div>

            {isYearlyLoading ? (
              <div className="py-8">
                <ApiLoadingState />
              </div>
            ) : null}

            {!isYearlyLoading && yearlyErrorMessage ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                <p>{yearlyErrorMessage}</p>
                <button
                  type="button"
                  onClick={() => void loadYearlyLaporanKeuangan(tahun)}
                  className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950/40"
                >
                  {t("common.retry")}
                </button>
              </div>
            ) : null}

            {!isYearlyLoading && !yearlyErrorMessage ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[920px] table-fixed text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">{t("field.bulan")}</th>
                      <th className="px-3 py-2 text-right">{t("field.totalInvoice")}</th>
                      <th className="px-3 py-2 text-right">{t("field.totalPembelian")}</th>
                      <th className="px-3 py-2 text-right">{t("field.grossProfit")}</th>
                      <th className="px-3 py-2 text-right">{t("field.totalBiayaOperasional")}</th>
                      <th className="px-3 py-2 text-right">{t("field.netProfit")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {yearlyRows.map((row) => (
                      <tr key={row.bulan} className="text-slate-700 dark:text-slate-200">
                        <td className="truncate px-3 py-2 font-medium">
                          {formatLaporanKeuanganMonth(row.bulan, locale)}
                        </td>
                        <td className="truncate px-3 py-2 text-right">
                          {formatLaporanKeuanganCurrency(row.totalInvoice, locale)}
                        </td>
                        <td className="truncate px-3 py-2 text-right">
                          {formatLaporanKeuanganCurrency(row.totalPembelian, locale)}
                        </td>
                        <td className="truncate px-3 py-2 text-right">
                          {formatLaporanKeuanganCurrency(row.grossProfit, locale)}
                        </td>
                        <td className="truncate px-3 py-2 text-right">
                          {formatLaporanKeuanganCurrency(row.totalBiayaOperasional, locale)}
                        </td>
                        <td className={`truncate px-3 py-2 text-right font-semibold ${
                          row.netProfit >= 0
                            ? "text-sky-700 dark:text-sky-300"
                            : "text-red-700 dark:text-red-300"
                        }`}>
                          {formatLaporanKeuanganCurrency(row.netProfit, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                    <tr>
                      <td className="truncate px-3 py-2">{t("laporanKeuangan.yearlyTable.total")}</td>
                      <td className="truncate px-3 py-2 text-right">{formatLaporanKeuanganCurrency(yearlyTotals.totalInvoice, locale)}</td>
                      <td className="truncate px-3 py-2 text-right">{formatLaporanKeuanganCurrency(yearlyTotals.totalPembelian, locale)}</td>
                      <td className="truncate px-3 py-2 text-right">{formatLaporanKeuanganCurrency(yearlyTotals.grossProfit, locale)}</td>
                      <td className="truncate px-3 py-2 text-right">{formatLaporanKeuanganCurrency(yearlyTotals.totalBiayaOperasional, locale)}</td>
                      <td className={`truncate px-3 py-2 text-right ${
                        yearlyTotals.netProfit >= 0
                          ? "text-sky-700 dark:text-sky-300"
                          : "text-red-700 dark:text-red-300"
                      }`}>
                        {formatLaporanKeuanganCurrency(yearlyTotals.netProfit, locale)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
          </section>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {reportMode === "monthly" ? (
            <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <div className="border-b border-sky-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("laporanKeuangan.form.title")}</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{t("laporanKeuangan.form.description")}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8">
                <ApiLoadingState />
              </div>
            ) : null}

            {!isLoading && errorMessage ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => void loadLaporanKeuangan(bulan)}
                  className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950/40"
                >
                  {t("common.retry")}
                </button>
              </div>
            ) : null}

            {!isLoading ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 sm:grid-cols-[5rem_minmax(0,1fr)_11rem]">
                  <span>{t("common.action")}</span>
                  <span>{t("field.namaBiaya")}</span>
                  <span>{t("field.jumlah")}</span>
                </div>

                {rows.map((row) => (
                  <div key={row.id} className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)_11rem]">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={!canRemoveRow}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      {t("common.delete")}
                    </button>
                    <input
                      type="text"
                      value={row.namaBiaya}
                      onChange={(event) => updateRow(row.id, "namaBiaya", event.target.value)}
                      placeholder={t("laporanKeuangan.placeholder.namaBiaya")}
                      className="min-w-0 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900/60"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      value={row.jumlah}
                      onChange={(event) => updateRow(row.id, "jumlah", formatAmountInput(event.target.value))}
                      placeholder="0"
                      className="min-w-0 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900/60"
                    />
                  </div>
                ))}

                {actionErrorMessage ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                    {actionErrorMessage}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-sky-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setRows((prevRows) => [...prevRows, createFormRow()])}
                    className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-800 transition hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {t("laporanKeuangan.addRow")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                  >
                    {isSaving ? t("common.loading") : t("common.saveChanges")}
                  </button>
                </div>
              </div>
            ) : null}
            </section>
          ) : (
            <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("laporanKeuangan.yearlyInfo.title")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                {t("laporanKeuangan.yearlyInfo.description")}
              </p>
            </section>
          )}

          <aside className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {t(reportMode === "yearly" ? "laporanKeuangan.summary.yearlyTitle" : "laporanKeuangan.summary.title")}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {isActiveLoading ? t("common.loading") : activePeriodLabel}
            </h2>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">{t("field.totalInvoice")}</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatLaporanKeuanganCurrency(activeSummary.totalInvoice, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">{t("field.totalPembelian")}</dt>
                <dd className="mt-1 text-2xl font-semibold text-red-700 dark:text-red-300">
                  {formatLaporanKeuanganCurrency(activeSummary.totalPembelian, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">{t("field.grossProfit")}</dt>
                <dd className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatLaporanKeuanganCurrency(activeSummary.grossProfit, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">{t("field.totalBiayaOperasional")}</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatLaporanKeuanganCurrency(activeSummary.totalBiayaOperasional, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">{t("field.netProfit")}</dt>
                <dd className={`mt-1 text-2xl font-semibold ${activeSummary.netProfit >= 0 ? "text-sky-700 dark:text-sky-300" : "text-red-700 dark:text-red-300"}`}>
                  {formatLaporanKeuanganCurrency(activeSummary.netProfit, locale)}
                </dd>
              </div>
              {reportMode === "monthly" ? (
                <div>
                  <dt className="text-sm text-slate-500 dark:text-slate-400">{t("laporanKeuangan.summary.savedStatus")}</dt>
                  <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    {lastSavedItem ? t("laporanKeuangan.summary.saved") : t("laporanKeuangan.summary.notSaved")}
                  </dd>
                </div>
              ) : null}
            </dl>

            {reportMode === "monthly" ? (
              <div className="mt-5 border-t border-sky-100 pt-4 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("laporanKeuangan.summary.rincian")}</p>
                <ul className="mt-3 space-y-2">
                  {rows.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0 text-slate-600 dark:text-slate-300">{row.namaBiaya.trim() || "-"}</span>
                      <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">
                        {formatLaporanKeuanganCurrency(normalizeAmount(row.jumlah) ?? 0, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <AppToast
        isOpen={Boolean(toast)}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        closeLabel={t("common.close")}
        toastKey={toast?.id}
        onClose={() => setToast(null)}
      />
    </>
  );
}
