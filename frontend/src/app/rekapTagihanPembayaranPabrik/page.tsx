"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppDateInput } from "../_components/app-date-input";
import { ExportCurrencyValue } from "../_components/export-currency-value";
import { ApiRequestError } from "../_lib/api-client";
import { formatAppDate } from "../_lib/date";
import { useI18n } from "../_i18n/provider";
import { readPersistentQueryValues, usePersistentQueryValues } from "../_hooks/use-persistent-query-values";
import { fetchCustomerRows, type CustomerItem } from "../customer/_lib/customer";
import {
  defaultInvoiceFilter,
  fetchInvoiceExportRows,
  type InvoiceItem,
} from "../invoice/_lib/invoice";

type RecapRow = {
  key: string;
  namaPabrik: string;
  totalPembayaran: number;
  outstandingTagihan: number;
};

function getCurrentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthDateRange(value: string) {
  const [yearText, monthText] = String(value || "").split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return {
      tanggalDari: "",
      tanggalSampai: "",
    };
  }

  const lastDate = new Date(year, month, 0).getDate();

  return {
    tanggalDari: `${year}-${String(month).padStart(2, "0")}-01`,
    tanggalSampai: `${year}-${String(month).padStart(2, "0")}-${String(lastDate).padStart(2, "0")}`,
  };
}

function normalizeText(value: string) {
  return String(value || "").trim().toLowerCase();
}

function formatReportMonth(value: string, locale: "id" | "en") {
  const { tanggalDari } = getMonthDateRange(value);
  const monthText = tanggalDari ? formatAppDate(tanggalDari, locale, "MMMM yyyy") : value;
  return monthText === "-" ? value.toUpperCase() : monthText.toUpperCase();
}

function formatReportMonthName(value: string, locale: "id" | "en") {
  const { tanggalDari } = getMonthDateRange(value);
  const monthText = tanggalDari ? formatAppDate(tanggalDari, locale, "MMMM") : value;
  return monthText === "-" ? value.toUpperCase() : monthText.toUpperCase();
}

function getDateKey(value: string | null) {
  const formatted = formatAppDate(value, "en", "yyyy-MM-dd");
  return formatted === "-" ? "" : formatted;
}

function buildCustomerLabelMap(customerRows: CustomerItem[]) {
  const map = new Map<string, string>();

  customerRows.forEach((customer) => {
    const id = String(customer.id || "").trim();
    const nama = String(customer.nama || "").trim();

    if (id) {
      map.set(id, nama || id);
    }
  });

  return map;
}

function getCustomerLabel(row: InvoiceItem, customerLabelMap: Map<string, string>) {
  return customerLabelMap.get(row.idCustomer) || row.idCustomer || "-";
}

function getRecapGroupKey(row: InvoiceItem, customerLabelMap: Map<string, string>) {
  const customerLabel = getCustomerLabel(row, customerLabelMap);
  return row.idCustomer || customerLabel;
}

function ensureRecapRow(
  rows: Map<string, RecapRow>,
  row: InvoiceItem,
  customerLabelMap: Map<string, string>
) {
  const key = getRecapGroupKey(row, customerLabelMap);
  const currentRow = rows.get(key);

  if (currentRow) {
    return currentRow;
  }

  const recapRow = {
    key,
    namaPabrik: getCustomerLabel(row, customerLabelMap),
    totalPembayaran: 0,
    outstandingTagihan: 0,
  };

  rows.set(key, recapRow);
  return recapRow;
}

function isInvoiceOutstandingAtMonthEnd(row: InvoiceItem, monthEndKey: string) {
  const invoiceDateKey = getDateKey(row.tanggal);

  if (!invoiceDateKey || invoiceDateKey > monthEndKey) {
    return false;
  }

  const paymentDateKey = getDateKey(row.tanggalBayar);
  return !row.isPaid || !paymentDateKey || paymentDateKey > monthEndKey;
}

function isInvoicePaidInMonth(row: InvoiceItem, monthStartKey: string, monthEndKey: string) {
  const paymentDateKey = getDateKey(row.tanggalBayar);
  return row.isPaid && Boolean(paymentDateKey) && paymentDateKey >= monthStartKey && paymentDateKey <= monthEndKey;
}

function buildRecapRows(
  paidInvoiceRows: InvoiceItem[],
  invoiceRowsUntilMonthEnd: InvoiceItem[],
  customerLabelMap: Map<string, string>,
  pabrikSearch: string,
  locale: "id" | "en",
  monthStartKey: string,
  monthEndKey: string
) {
  const rows = new Map<string, RecapRow>();

  paidInvoiceRows
    .filter((row) => isInvoicePaidInMonth(row, monthStartKey, monthEndKey))
    .forEach((row) => {
      const recapRow = ensureRecapRow(rows, row, customerLabelMap);
      recapRow.totalPembayaran += Number(row.grandTotal || 0);
    });

  invoiceRowsUntilMonthEnd
    .filter((row) => isInvoiceOutstandingAtMonthEnd(row, monthEndKey))
    .forEach((row) => {
      const recapRow = ensureRecapRow(rows, row, customerLabelMap);
      recapRow.outstandingTagihan += Number(row.grandTotal || 0);
    });

  const normalizedSearch = normalizeText(pabrikSearch);

  return Array.from(rows.values())
    .filter((row) => row.totalPembayaran > 0 || row.outstandingTagihan > 0)
    .filter((row) => {
      if (!normalizedSearch) {
        return true;
      }

      return normalizeText(row.namaPabrik).includes(normalizedSearch);
    })
    .sort((left, right) =>
      left.namaPabrik.localeCompare(right.namaPabrik, locale === "en" ? "en" : "id", {
        sensitivity: "base",
      })
    );
}

export default function RekapTagihanPembayaranPabrikPage() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const [queryDefaults] = useState(() => ({ month: getCurrentMonthValue(), search: "" }));
  const initialQuery = readPersistentQueryValues(searchParams, queryDefaults);
  const [selectedMonth, setSelectedMonth] = useState(initialQuery.month);
  const [pabrikSearch, setPabrikSearch] = useState(initialQuery.search);
  const [paidInvoiceRows, setPaidInvoiceRows] = useState<InvoiceItem[]>([]);
  const [invoiceRowsUntilMonthEnd, setInvoiceRowsUntilMonthEnd] = useState<InvoiceItem[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const restoreQuery = useCallback((values: typeof queryDefaults) => { setSelectedMonth(values.month); setPabrikSearch(values.search); }, []);
  usePersistentQueryValues({ basePath: "/rekapTagihanPembayaranPabrik", values: { month: selectedMonth, search: pabrikSearch }, defaults: queryDefaults, onRestore: restoreQuery });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("rekapTagihanPembayaranPabrik.reportTitle");

    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  useEffect(() => {
    let isCancelled = false;
    const { tanggalDari, tanggalSampai } = getMonthDateRange(selectedMonth);

    async function loadReportData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [paidRows, outstandingSourceRows, customers] = await Promise.all([
          fetchInvoiceExportRows({
            ...defaultInvoiceFilter,
            isPaid: "true",
            tanggalBayarDari: tanggalDari,
            tanggalBayarSampai: tanggalSampai,
          }),
          fetchInvoiceExportRows({
            ...defaultInvoiceFilter,
            tanggalSampai,
          }),
          fetchCustomerRows(),
        ]);

        if (isCancelled) {
          return;
        }

        setPaidInvoiceRows(paidRows);
        setInvoiceRowsUntilMonthEnd(outstandingSourceRows);
        setCustomerRows(customers);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("rekapTagihanPembayaranPabrik.loadError"));
        } else {
          setErrorMessage(t("rekapTagihanPembayaranPabrik.loadError"));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReportData();

    return () => {
      isCancelled = true;
    };
  }, [selectedMonth, t]);

  const { tanggalDari, tanggalSampai } = getMonthDateRange(selectedMonth);
  const customerLabelMap = useMemo(() => buildCustomerLabelMap(customerRows), [customerRows]);
  const pabrikNameOptions = useMemo(
    () =>
      customerRows
        .map((customer) => String(customer.nama || "").trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, locale === "en" ? "en" : "id", { sensitivity: "base" })),
    [customerRows, locale]
  );
  const recapRows = useMemo(
    () =>
      buildRecapRows(
        paidInvoiceRows,
        invoiceRowsUntilMonthEnd,
        customerLabelMap,
        pabrikSearch,
        locale,
        tanggalDari,
        tanggalSampai
      ),
    [
      customerLabelMap,
      invoiceRowsUntilMonthEnd,
      locale,
      paidInvoiceRows,
      pabrikSearch,
      tanggalDari,
      tanggalSampai,
    ]
  );
  const totalPembayaran = useMemo(
    () => recapRows.reduce((total, row) => total + row.totalPembayaran, 0),
    [recapRows]
  );
  const totalOutstandingTagihan = useMemo(
    () => recapRows.reduce((total, row) => total + row.outstandingTagihan, 0),
    [recapRows]
  );
  const emptyRowCount = Math.max(0, 12 - recapRows.length);
  const reportMonth = formatReportMonth(selectedMonth, locale);
  const reportMonthName = formatReportMonthName(selectedMonth, locale);

  return (
    <>
      <style jsx global>{`
        @page {
          size: letter portrait;
          margin: 12mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <main className="export-normal-weight erp-page mx-auto min-h-screen max-w-7xl print:max-w-none print:px-0 print:py-0">
        <section className="erp-panel p-4 print:hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {t("brand.name")}
              </p>
              <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
                {t("nav.rekapTagihanPembayaranPabrik")}
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                {t("rekapTagihanPembayaranPabrik.page.description")}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[180px_minmax(240px,1fr)_auto_auto] lg:min-w-[680px]">
              <label className="self-end">
                <span className="sr-only">{t("field.bulan")}</span>
                <AppDateInput
                  mode="month"
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                  placeholder={t("field.bulan")}
                  className="erp-field w-full px-3 py-2"
                />
              </label>

              <label className="self-end">
                <span className="sr-only">{t("rekapTagihanPembayaranPabrik.pabrikSearchLabel")}</span>
                <input
                  type="search"
                  value={pabrikSearch}
                  list="rekap-tagihan-pembayaran-pabrik-options"
                  placeholder={t("rekapTagihanPembayaranPabrik.pabrikSearchLabel")}
                  onChange={(event) => setPabrikSearch(event.target.value)}
                  className="erp-field w-full px-3 py-2"
                />
                <datalist id="rekap-tagihan-pembayaran-pabrik-options">
                  {pabrikNameOptions.map((pabrikName) => (
                    <option key={pabrikName} value={pabrikName} />
                  ))}
                </datalist>
              </label>

              <button
                type="button"
                onClick={() => setPabrikSearch("")}
                className="self-end rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {t("common.resetFilter")}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="self-end rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                {t("common.print")}
              </button>
            </div>
          </div>
        </section>

        {isLoading ? (
          <section className="mt-4 print:hidden">
            <ApiLoadingState />
          </section>
        ) : null}

        {!isLoading && errorMessage ? (
          <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">
            {errorMessage}
          </section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <section className="mt-4 bg-white p-4 text-black shadow-sm print:mt-0 print:p-0 print:shadow-none">
            <div className="overflow-x-auto print:overflow-visible">
              <div className="min-w-[780px] print:min-w-0">
                <div className="text-left text-[16px] font-bold uppercase tracking-wide print:text-[18px]">
                  <h2>{t("rekapTagihanPembayaranPabrik.reportTitle")}</h2>
                  <p className="mt-3">{t("rekapTagihanPembayaranPabrik.periodTitle", { month: reportMonth })}</p>
                </div>

                <table className="mt-7 w-full table-fixed border-collapse text-[13px]">
                  <colgroup>
                    <col style={{ width: "38%" }} />
                    <col style={{ width: "31%" }} />
                    <col style={{ width: "31%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("field.namaPabrik").toUpperCase()}
                      </th>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("rekapTagihanPembayaranPabrik.paymentColumn", {
                          month: reportMonthName,
                        })}
                      </th>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("rekapTagihanPembayaranPabrik.outstandingColumn", {
                          month: reportMonthName,
                        })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="border border-black px-2 py-8 text-center text-sm">
                          {t("rekapTagihanPembayaranPabrik.empty")}
                        </td>
                      </tr>
                    ) : (
                      recapRows.map((row) => (
                        <tr key={row.key}>
                          <td className="border border-black px-2 py-1.5 align-top">
                            {row.namaPabrik}
                          </td>
                          <td className="border border-black px-2 py-1.5 align-top">
                            <ExportCurrencyValue value={row.totalPembayaran} locale={locale} />
                          </td>
                          <td className="border border-black px-2 py-1.5 align-top">
                            <ExportCurrencyValue value={row.outstandingTagihan} locale={locale} />
                          </td>
                        </tr>
                      ))
                    )}

                    {Array.from({ length: emptyRowCount }).map((_, index) => (
                      <tr key={`empty-recap-row-${index}`} className="h-7">
                        <td className="border border-black px-2 py-1.5" />
                        <td className="border border-black px-2 py-1.5" />
                        <td className="border border-black px-2 py-1.5" />
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="border border-black px-2 py-2 text-[15px] font-medium">
                        {t("rekapTagihanPembayaranPabrik.totalLabel")}
                      </td>
                      <td className="border border-black px-2 py-2 text-[15px] font-semibold">
                        <ExportCurrencyValue value={totalPembayaran} locale={locale} />
                      </td>
                      <td className="border border-black px-2 py-2 text-[15px] font-semibold">
                        <ExportCurrencyValue value={totalOutstandingTagihan} locale={locale} />
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-8 space-y-1 text-sm print:hidden">
                  <p>
                    {t("rekapTagihanPembayaranPabrik.outstandingNote", {
                      month: reportMonthName,
                    })}
                  </p>
                  <p>
                    {t("rekapTagihanPembayaranPabrik.paymentNote", {
                      month: reportMonthName,
                    })}
                  </p>
                </div>

                <p className="mt-6 text-sm print:hidden">
                  {t("rekapTagihanPembayaranPabrik.filteredSummary", {
                    rows: recapRows.length,
                  })}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
