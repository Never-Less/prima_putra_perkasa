"use client";

import { usePageTitle } from "../../_hooks/use-page-title";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { ExportCurrencyValue } from "../../_components/export-currency-value";
import { ApiRequestError } from "../../_lib/api-client";
import {
  downloadJspreadsheetXlsxFile,
  sanitizeExcelFileName,
  type JspreadsheetExportWorksheet,
} from "../../_lib/jspreadsheet-xlsx-export";
import { printDocumentWhenFontsReady } from "../../_lib/print";
import { useI18n } from "../../_i18n/provider";
import { fetchCustomerRows, type CustomerItem } from "../../customer/_lib/customer";
import {
  defaultInvoiceFilter,
  fetchInvoiceExportRows,
  formatTanggal,
  sortInvoiceBarangByUrutan,
  type InvoiceFilter,
  type InvoiceItem,
} from "../_lib/invoice";

function toSearchFilter(searchParams: URLSearchParams): InvoiceFilter {
  return {
    ...defaultInvoiceFilter,
    noInvoice: String(searchParams.get("noInvoice") || "").trim(),
    noPo: String(searchParams.get("noPo") || "").trim(),
    noSuratJalan: String(searchParams.get("noSuratJalan") || "").trim(),
    namaBarang: String(searchParams.get("namaBarang") || "").trim(),
    idCustomer: String(searchParams.get("idCustomer") || "").trim(),
    isPpn:
      searchParams.get("isPpn") === "true" || searchParams.get("isPpn") === "false"
        ? (searchParams.get("isPpn") as InvoiceFilter["isPpn"])
        : "",
    isPaid:
      searchParams.get("isPaid") === "true" || searchParams.get("isPaid") === "false"
        ? (searchParams.get("isPaid") as InvoiceFilter["isPaid"])
        : "",
    tanggalBayarDari: String(searchParams.get("tanggalBayarDari") || "").trim(),
    tanggalBayarSampai: String(searchParams.get("tanggalBayarSampai") || "").trim(),
    tanggalDari: String(searchParams.get("tanggalDari") || "").trim(),
    tanggalSampai: String(searchParams.get("tanggalSampai") || "").trim(),
  };
}

export default function InvoiceExportPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paidLabel = t("invoice.status.paid");
  const unpaidLabel = t("invoice.status.unpaid");
  const filter = useMemo(() => toSearchFilter(searchParams), [searchParams]);
  const [rows, setRows] = useState<InvoiceItem[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const activeFilterEntries = useMemo(() => {
    return [
      ["field.noInvoice", filter.noInvoice],
      ["field.noPo", filter.noPo],
      ["field.noSuratJalan", filter.noSuratJalan],
      ["field.namaCustomer", filter.idCustomer],
      [
        "field.isPpn",
        filter.isPpn === "true" ? t("common.true") : filter.isPpn === "false" ? t("common.false") : "",
      ],
      ["field.isPaid", filter.isPaid === "true" ? paidLabel : filter.isPaid === "false" ? unpaidLabel : ""],
      ["field.tanggalBayarDari", filter.tanggalBayarDari],
      ["field.tanggalBayarSampai", filter.tanggalBayarSampai],
      ["field.tanggalDari", filter.tanggalDari],
      ["field.tanggalSampai", filter.tanggalSampai],
    ].filter((entry) => Boolean(String(entry[1] || "").trim()));
  }, [filter, paidLabel, t, unpaidLabel]);
  const hasTanggalFilter = Boolean(filter.tanggalDari || filter.tanggalSampai);

  usePageTitle("invoice.exportPage.title");

  useEffect(() => {
    let isCancelled = false;

    async function loadExportData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [invoiceRows, customers] = await Promise.all([
          fetchInvoiceExportRows(filter),
          fetchCustomerRows(),
        ]);

        if (isCancelled) {
          return;
        }

        setRows(invoiceRows);
        setCustomerRows(customers);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("invoice.exportPage.loadError"));
        } else {
          setErrorMessage(t("invoice.exportPage.loadError"));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadExportData();

    return () => {
      isCancelled = true;
    };
  }, [filter, t]);

  const customerLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    customerRows.forEach((customer) => {
      const id = String(customer.id || "").trim();
      const nama = String(customer.nama || "").trim();

      if (!id) {
        return;
      }

      map.set(id, nama || id);
    });

    return map;
  }, [customerRows]);

  const totals = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.subtotal += Number(row.subtotal || 0);
        accumulator.ppnAmount += Number(row.ppnAmount || 0);
        accumulator.grandTotal += Number(row.grandTotal || 0);
        return accumulator;
      },
      {
        subtotal: 0,
        ppnAmount: 0,
        grandTotal: 0,
      }
    );
  }, [rows]);
  const factoryBillingRows = useMemo(() => {
    const groupedRows = new Map<string, { namaCustomer: string; totalInvoice: number }>();
    const billableRows = rows.filter((row) => !row.isPaid);

    for (const row of billableRows) {
      const customerLabel = customerLabelMap.get(row.idCustomer) || row.idCustomer || "-";
      const groupKey = row.idCustomer || customerLabel;
      const currentGroup = groupedRows.get(groupKey);

      if (currentGroup) {
        currentGroup.totalInvoice += Number(row.grandTotal || 0);
        continue;
      }

      groupedRows.set(groupKey, {
        namaCustomer: customerLabel,
        totalInvoice: Number(row.grandTotal || 0),
      });
    }

    return Array.from(groupedRows.values()).sort((left, right) =>
      left.namaCustomer.localeCompare(right.namaCustomer, locale === "en" ? "en" : "id", {
        sensitivity: "base",
      })
    );
  }, [customerLabelMap, locale, rows]);
  const factoryBillingGrandTotal = useMemo(() => {
    return factoryBillingRows.reduce((total, row) => total + row.totalInvoice, 0);
  }, [factoryBillingRows]);

  function handleClosePage() {
    window.close();

    window.setTimeout(() => {
      if (!document.hidden) {
        router.push("/invoice");
      }
    }, 150);
  }

  function handleExportExcel() {
    const detailRows = rows.flatMap((row) =>
      sortInvoiceBarangByUrutan(row.barang).map((barang) => [
        barang.namaBarang || "-",
        barang.spesifikasi || "-",
        barang.kuantitas,
        barang.hargaSatuan,
        barang.jumlah,
      ])
    );
    const worksheets: JspreadsheetExportWorksheet[] = [
      {
        name: "Detail Barang",
        rows: [
          [
            t("invoice.excel.column.namaBarang"),
            t("invoice.excel.column.spek"),
            t("invoice.excel.column.qty"),
            t("invoice.excel.column.hargaSatuan"),
            t("invoice.excel.column.hargaTotal"),
          ],
          ...detailRows,
        ],
      },
    ];
    const fileSuffix =
      sanitizeExcelFileName(filter.tanggalDari || filter.tanggalBayarDari || "", "") ||
      sanitizeExcelFileName(filter.tanggalSampai || filter.tanggalBayarSampai || "", "") ||
      "data";

    downloadJspreadsheetXlsxFile(`invoice-export-${fileSuffix}.xlsx`, worksheets);
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: letter portrait;
          margin: 8mm;
        }
      `}</style>

      <main className="export-normal-weight min-h-screen bg-slate-100 px-4 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[1200px] space-y-4 print:max-w-none">
          <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm print:hidden">
            <div>
              <h1 className="text-xl text-slate-900">{t("invoice.exportPage.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">{t("invoice.exportPage.description")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={rows.length === 0}
                className="rounded-lg border border-emerald-300 bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common.exportExcel")}
              </button>
              <button
                type="button"
                onClick={printDocumentWhenFontsReady}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm text-white hover:bg-sky-600"
              >
                {t("common.print")}
              </button>
              <button
                type="button"
                onClick={handleClosePage}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {t("common.close")}
              </button>
            </div>
          </header>

          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </section>
          ) : null}

          {!isLoading && !errorMessage ? (
            <section className="space-y-4 rounded-2xl bg-white p-4 tracking-[0.05em] shadow-sm print:rounded-none print:p-0 print:shadow-none">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base text-slate-900">
                    {t("invoice.exportPage.activeFilters")}
                  </h2>
                  <span className="text-sm text-slate-500">
                    {t("invoice.exportPage.totalRows", { count: rows.length })}
                  </span>
                </div>

                {activeFilterEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeFilterEntries.map(([fieldKey, value]) => (
                      <span
                        key={`${fieldKey}-${value}`}
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800"
                      >
                        {t(fieldKey)}: {value}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">{t("invoice.exportPage.allData")}</p>
                )}

                {hasTanggalFilter ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                        {t("field.tanggalDari")}
                      </p>
                      <p className="mt-1 text-slate-800">
                        {filter.tanggalDari ? formatTanggal(filter.tanggalDari, locale) : "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                        {t("field.tanggalSampai")}
                      </p>
                      <p className="mt-1 text-slate-800">
                        {filter.tanggalSampai ? formatTanggal(filter.tanggalSampai, locale) : "-"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {rows.length === 0 ? (
                <div className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  {t("invoice.exportPage.empty")}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto border border-slate-300 print:overflow-visible">
                    <table className="w-full table-fixed border-collapse text-sm text-slate-800 print:text-[9.5px]">
                      <colgroup>
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "24%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "9%" }} />
                      </colgroup>
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("field.tanggal")}
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("field.noInvoice")}
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("invoice.exportPage.customerFactoryLabel")}
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("invoice.exportPage.subtotalDppLabel")}
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("invoice.exportPage.ppnLabel")}
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("invoice.exportPage.totalInvoiceLabel")}
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("field.isPaid")}
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                            {t("field.tanggalBayar")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => {
                          const customerLabel =
                            customerLabelMap.get(row.idCustomer) || row.idCustomer || "-";

                          return (
                            <tr key={row.id} className={index % 2 ? "bg-slate-50" : "bg-white"}>
                              <td className="whitespace-nowrap border border-slate-300 px-3 py-2 print:px-1.5 print:py-1.5">
                                {formatTanggal(row.tanggal, locale)}
                              </td>
                              <td className="whitespace-nowrap border border-slate-300 px-3 py-2 print:px-1.5 print:py-1.5" title={row.noInvoice || "-"}>
                                {row.noInvoice || "-"}
                              </td>
                              <td className="break-words border border-slate-300 px-3 py-2 leading-snug print:px-1.5 print:py-1.5" title={customerLabel}>
                                {customerLabel}
                              </td>
                              <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5">
                                <ExportCurrencyValue value={row.subtotal} locale={locale} />
                              </td>
                              <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5">
                                <ExportCurrencyValue value={row.ppnAmount} locale={locale} />
                              </td>
                              <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5">
                                <ExportCurrencyValue value={row.grandTotal} locale={locale} />
                              </td>
                              <td
                                className={`whitespace-nowrap border border-slate-300 px-3 py-2 text-[11px] leading-tight print:px-1.5 print:py-1.5 print:text-[7.5px] ${
                                  row.isPaid
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-rose-100 text-rose-900"
                                }`}
                              >
                                {row.isPaid ? paidLabel : unpaidLabel}
                              </td>
                              <td className="whitespace-nowrap border border-slate-300 px-3 py-2 print:px-1.5 print:py-1.5">
                                {formatTanggal(row.tanggalBayar, locale)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100">
                        <tr>
                          <td
                            colSpan={3}
                            className="border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5"
                          >
                            {t("invoice.exportPage.grandTotalRowLabel")}
                          </td>
                          <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5">
                            <ExportCurrencyValue value={totals.subtotal} locale={locale} />
                          </td>
                          <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5">
                            <ExportCurrencyValue value={totals.ppnAmount} locale={locale} />
                          </td>
                          <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5">
                            <ExportCurrencyValue value={totals.grandTotal} locale={locale} />
                          </td>
                          <td className="border border-slate-300 px-3 py-2 print:px-2 print:py-1.5" />
                          <td className="border border-slate-300 px-3 py-2 print:px-2 print:py-1.5" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {!isLoading && !errorMessage && rows.length > 0 ? (
            <section className="space-y-4 rounded-2xl bg-white p-4 tracking-[0.05em] shadow-sm print:break-before-page print:rounded-none print:p-0 print:shadow-none">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg uppercase tracking-wide text-slate-900 print:text-[18px]">
                    {t("invoice.exportPage.factoryBillingTitle")}
                  </h2>
                  <span className="text-sm text-slate-500">
                    {t("invoice.exportPage.factoryBillingTotalCustomers", {
                      count: factoryBillingRows.length,
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {t("invoice.exportPage.factoryBillingDescription")}
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-300 print:overflow-visible">
                <table className="w-full table-fixed border-collapse text-sm text-slate-800 print:text-[10px]">
                  <colgroup>
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "64%" }} />
                    <col style={{ width: "28%" }} />
                  </colgroup>
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                        {t("invoice.export.table.no")}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">
                        {t("invoice.exportPage.factoryBillingCustomerColumn")}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right print:px-2 print:py-1.5">
                        {t("invoice.exportPage.factoryBillingAmountColumn")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {factoryBillingRows.map((row, index) => (
                      <tr key={`${row.namaCustomer}-${index}`} className={index % 2 ? "bg-slate-50" : "bg-white"}>
                        <td className="whitespace-nowrap border border-slate-300 px-3 py-2 align-top print:px-1.5 print:py-1.5">
                          {index + 1}
                        </td>
                        <td className="break-words border border-slate-300 px-3 py-2 align-top leading-snug print:px-1.5 print:py-1.5" title={row.namaCustomer}>
                          {row.namaCustomer}
                        </td>
                        <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right align-top print:px-1.5 print:py-1.5">
                          <ExportCurrencyValue value={row.totalInvoice} locale={locale} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100">
                      <td className="border border-slate-300 px-3 py-2 print:px-1.5 print:py-1.5" colSpan={2}>
                        {t("invoice.exportPage.factoryBillingGrandTotal")}
                      </td>
                      <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-right print:px-1.5 print:py-1.5">
                        <ExportCurrencyValue value={factoryBillingGrandTotal} locale={locale} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}

