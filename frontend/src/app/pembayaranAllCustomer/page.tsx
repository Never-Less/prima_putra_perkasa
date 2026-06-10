"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppDateInput } from "../_components/app-date-input";
import { ExportCurrencyValue } from "../_components/export-currency-value";
import { ApiRequestError } from "../_lib/api-client";
import { formatAppDate } from "../_lib/date";
import { useI18n } from "../_i18n/provider";
import { fetchCustomerRows, type CustomerItem } from "../customer/_lib/customer";
import {
  defaultInvoiceFilter,
  fetchInvoiceExportRows,
  type InvoiceItem,
} from "../invoice/_lib/invoice";

type PaymentReportGroup = {
  key: string;
  tanggalBayar: string;
  namaCustomer: string;
  rows: InvoiceItem[];
  totalBayar: number;
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

function formatPaymentDate(value: string | null, locale: "id" | "en") {
  return formatAppDate(value, locale === "en" ? "en" : "id", "dd-MMM-yy");
}

function getPaymentDateKey(value: string | null) {
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

function buildPaymentReportGroups(
  invoiceRows: InvoiceItem[],
  customerLabelMap: Map<string, string>,
  customerSearch: string
) {
  const normalizedCustomerSearch = normalizeText(customerSearch);
  const sortedRows = [...invoiceRows]
    .filter((row) => row.isPaid && row.tanggalBayar)
    .filter((row) => {
      if (!normalizedCustomerSearch) {
        return true;
      }

      const customerLabel = customerLabelMap.get(row.idCustomer) || row.idCustomer || "-";
      return normalizeText(customerLabel).includes(normalizedCustomerSearch);
    })
    .sort((left, right) => {
      const leftDate = getPaymentDateKey(left.tanggalBayar);
      const rightDate = getPaymentDateKey(right.tanggalBayar);

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }

      const leftCustomer = customerLabelMap.get(left.idCustomer) || left.idCustomer || "";
      const rightCustomer = customerLabelMap.get(right.idCustomer) || right.idCustomer || "";

      if (leftCustomer !== rightCustomer) {
        return leftCustomer.localeCompare(rightCustomer, "id", { sensitivity: "base" });
      }

      return String(left.noInvoice || "").localeCompare(String(right.noInvoice || ""), "id", {
        sensitivity: "base",
      });
    });
  const groupMap = new Map<string, PaymentReportGroup>();

  sortedRows.forEach((row) => {
    const dateKey = getPaymentDateKey(row.tanggalBayar);
    const customerLabel = customerLabelMap.get(row.idCustomer) || row.idCustomer || "-";
    const groupKey = `${dateKey}::${row.idCustomer || customerLabel}`;
    const currentGroup = groupMap.get(groupKey);

    if (currentGroup) {
      currentGroup.rows.push(row);
      currentGroup.totalBayar += Number(row.grandTotal || 0);
      return;
    }

    groupMap.set(groupKey, {
      key: groupKey,
      tanggalBayar: row.tanggalBayar || "",
      namaCustomer: customerLabel,
      rows: [row],
      totalBayar: Number(row.grandTotal || 0),
    });
  });

  return Array.from(groupMap.values());
}

export default function PembayaranAllCustomerPage() {
  const { locale, t } = useI18n();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [customerSearch, setCustomerSearch] = useState("");
  const [invoiceRows, setInvoiceRows] = useState<InvoiceItem[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;
    const { tanggalDari, tanggalSampai } = getMonthDateRange(selectedMonth);

    async function loadReportData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [paidInvoiceRows, customers] = await Promise.all([
          fetchInvoiceExportRows({
            ...defaultInvoiceFilter,
            isPaid: "true",
            tanggalBayarDari: tanggalDari,
            tanggalBayarSampai: tanggalSampai,
          }),
          fetchCustomerRows(),
        ]);

        if (isCancelled) {
          return;
        }

        setInvoiceRows(paidInvoiceRows);
        setCustomerRows(customers);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("pembayaranAllCustomer.loadError"));
        } else {
          setErrorMessage(t("pembayaranAllCustomer.loadError"));
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

  const customerLabelMap = useMemo(() => buildCustomerLabelMap(customerRows), [customerRows]);
  const customerNameOptions = useMemo(
    () =>
      customerRows
        .map((customer) => String(customer.nama || "").trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, locale === "en" ? "en" : "id", { sensitivity: "base" })),
    [customerRows, locale]
  );
  const reportGroups = useMemo(
    () => buildPaymentReportGroups(invoiceRows, customerLabelMap, customerSearch),
    [customerLabelMap, customerSearch, invoiceRows]
  );
  const totalRows = useMemo(
    () => reportGroups.reduce((total, group) => total + group.rows.length, 0),
    [reportGroups]
  );
  const totalPembayaran = useMemo(
    () => reportGroups.reduce((total, group) => total + group.totalBayar, 0),
    [reportGroups]
  );
  const emptyRowCount = Math.max(0, 12 - totalRows);
  const reportMonth = formatReportMonth(selectedMonth, locale);
  const totalLabel = t("pembayaranAllCustomer.totalLabel", {
    month: formatReportMonthName(selectedMonth, locale),
  });

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

      <main className="export-normal-weight mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 print:hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {t("brand.name")}
              </p>
              <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
                {t("nav.pembayaranAllCustomer")}
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                {t("pembayaranAllCustomer.page.description")}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[180px_minmax(240px,1fr)_auto_auto] lg:min-w-[680px]">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("field.bulan")}
                <AppDateInput
                  mode="month"
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                  className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("pembayaranAllCustomer.customerSearchLabel")}
                <input
                  type="search"
                  value={customerSearch}
                  list="payment-all-customer-options"
                  placeholder={t("pembayaranAllCustomer.customerSearchPlaceholder")}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <datalist id="payment-all-customer-options">
                  {customerNameOptions.map((customerName) => (
                    <option key={customerName} value={customerName} />
                  ))}
                </datalist>
              </label>

              <button
                type="button"
                onClick={() => setCustomerSearch("")}
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
          <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">
            {errorMessage}
          </section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <section className="mt-4 bg-white p-4 text-black shadow-sm print:mt-0 print:p-0 print:shadow-none">
            <div className="overflow-x-auto print:overflow-visible">
              <div className="min-w-[920px] print:min-w-0">
                <div className="grid grid-cols-[44px_1fr] gap-2 text-[16px] font-bold uppercase tracking-wide print:text-[18px]">
                  <span>A.</span>
                  <div>
                    <h2>{t("pembayaranAllCustomer.reportTitle")}</h2>
                    <p className="mt-5">{t("pembayaranAllCustomer.periodTitle", { month: reportMonth })}</p>
                  </div>
                </div>

                <table className="mt-9 w-full table-fixed border-collapse text-[13px]">
                  <colgroup>
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "18%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("field.tanggalBayar").toUpperCase()}
                      </th>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("field.namaCustomer").toUpperCase()}
                      </th>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("field.noInvoice").toUpperCase()}
                      </th>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("field.nilaiInvoice").toUpperCase()}
                      </th>
                      <th className="border border-black px-2 py-2 text-center text-[14px] font-medium">
                        {t("field.totalBayar").toUpperCase()}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportGroups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-black px-2 py-8 text-center text-sm">
                          {t("pembayaranAllCustomer.empty")}
                        </td>
                      </tr>
                    ) : (
                      reportGroups.map((group) =>
                        group.rows.map((row, rowIndex) => (
                          <tr key={`${group.key}-${row.id}`}>
                            <td className="border border-black px-2 py-2 text-center align-top">
                              {rowIndex === 0 ? formatPaymentDate(group.tanggalBayar, locale) : ""}
                            </td>
                            <td className="border border-black px-2 py-2 align-top">
                              {rowIndex === 0 ? group.namaCustomer : ""}
                            </td>
                            <td className="border border-black px-2 py-2 text-center align-top">
                              {row.noInvoice || "-"}
                            </td>
                            <td className="border border-black px-2 py-2 align-top">
                              <ExportCurrencyValue value={Number(row.grandTotal || 0)} locale={locale} />
                            </td>
                            <td className="border border-black px-2 py-2 align-top">
                              {rowIndex === 0 ? <ExportCurrencyValue value={group.totalBayar} locale={locale} /> : ""}
                            </td>
                          </tr>
                        ))
                      )
                    )}

                    {Array.from({ length: emptyRowCount }).map((_, index) => (
                      <tr key={`empty-payment-row-${index}`} className="h-9">
                        <td className="border border-black px-2 py-2" />
                        <td className="border border-black px-2 py-2" />
                        <td className="border border-black px-2 py-2" />
                        <td className="border border-black px-2 py-2" />
                        <td className="border border-black px-2 py-2" />
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="border border-black px-2 py-3 text-[15px] font-medium">
                        {totalLabel}
                      </td>
                      <td className="border border-black px-2 py-3 text-[15px] font-semibold">
                        <ExportCurrencyValue value={totalPembayaran} locale={locale} />
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <p className="mt-8 text-sm print:hidden">
                  {t("pembayaranAllCustomer.filteredSummary", {
                    rows: totalRows,
                    groups: reportGroups.length,
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
