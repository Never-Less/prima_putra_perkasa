"use client";

import { useMemo, useState } from "react";
import {
  defaultInvoiceFilter,
  filterInvoiceRows,
  formatRupiah,
  formatTanggal,
  invoiceNoSuratJalanListLabel,
  type InvoiceFilter,
  type InvoiceItem,
} from "../_lib/invoice";
import { useI18n } from "../../_i18n/provider";

type InvoiceTableFilterProps = {
  rows: InvoiceItem[];
  selectedId?: string;
  onSelectRow?: (row: InvoiceItem) => void;
  resolveCustomerLabel?: (customerId: string) => string;
};

function escapeCsvValue(value: string) {
  const text = String(value || "");

  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, "\"\"")}"`;
}

function sanitizeFileName(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "invoice-export";
}

export function InvoiceTableFilter({
  rows,
  selectedId,
  onSelectRow,
  resolveCustomerLabel,
}: InvoiceTableFilterProps) {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<InvoiceFilter>(defaultInvoiceFilter);

  const filteredRows = useMemo(
    () => filterInvoiceRows(rows, filter, resolveCustomerLabel),
    [filter, resolveCustomerLabel, rows]
  );

  function exportInvoiceRowAsCsv(row: InvoiceItem) {
    if (typeof window === "undefined") {
      return;
    }

    const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
    const barangText = row.barang
      .map((barang) =>
        [
          barang.namaBarang,
          barang.kuantitas,
          barang.unit,
          barang.hargaSatuan,
          barang.jumlah,
        ].join("|")
      )
      .join(";");

    const header = [
      "noInvoice",
      "tanggal",
      "noPo",
      "noSuratJalan",
      "namaCustomer",
      "isPpn",
      "ppnRate",
      "subtotal",
      "ppnAmount",
      "grandTotal",
      "barang",
    ];
    const bodyRow = [
      row.noInvoice,
      formatTanggal(row.tanggal, locale),
      row.noPo,
      invoiceNoSuratJalanListLabel(row.noSuratJalan),
      customerLabel,
      String(row.isPpn),
      String(row.ppnRate),
      String(row.subtotal),
      String(row.ppnAmount),
      String(row.grandTotal),
      barangText,
    ];
    const csvContent = `\uFEFF${header.map(escapeCsvValue).join(",")}\r\n${bodyRow
      .map(escapeCsvValue)
      .join(",")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = `${sanitizeFileName(`invoice-${row.noInvoice}`)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900">{t("invoice.table.title")}</h2>
        <button
          onClick={() => setFilter(defaultInvoiceFilter)}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
        >
          {t("common.resetFilter")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sky-800">{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            {t("field.noInvoice")}
            <input
              value={filter.noInvoice}
              onChange={(event) => setFilter((prev) => ({ ...prev, noInvoice: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.noPo")}
            <input
              value={filter.noPo}
              onChange={(event) => setFilter((prev) => ({ ...prev, noPo: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.noSuratJalan")}
            <input
              value={filter.noSuratJalan}
              onChange={(event) => setFilter((prev) => ({ ...prev, noSuratJalan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.namaCustomer")}
            <input
              value={filter.idCustomer}
              onChange={(event) => setFilter((prev) => ({ ...prev, idCustomer: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.isPpn")}
            <select
              value={filter.isPpn}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, isPpn: event.target.value as InvoiceFilter["isPpn"] }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            {t("field.tanggalDari")}
            <input
              type="date"
              value={filter.tanggalDari}
              onChange={(event) => setFilter((prev) => ({ ...prev, tanggalDari: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.tanggalSampai")}
            <input
              type="date"
              value={filter.tanggalSampai}
              onChange={(event) => setFilter((prev) => ({ ...prev, tanggalSampai: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-sky-300 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-sky-800 text-left text-white">
              <tr>
                <th className="px-3 py-2 font-medium">{t("field.noInvoice")}</th>
                <th className="px-3 py-2 font-medium">{t("field.tanggal")}</th>
                <th className="px-3 py-2 font-medium">{t("field.noPo")}</th>
                <th className="px-3 py-2 font-medium">{t("field.noSuratJalan")}</th>
                <th className="px-3 py-2 font-medium">{t("field.barang")}</th>
                <th className="px-3 py-2 font-medium">{t("field.namaCustomer")}</th>
                <th className="px-3 py-2 font-medium">{t("field.subtotal")}</th>
                <th className="px-3 py-2 font-medium">{t("field.ppnAmount")}</th>
                <th className="px-3 py-2 font-medium">{t("field.grandTotal")}</th>
                <th className="px-3 py-2 font-medium">{t("common.action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-4 text-center text-slate-500">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const isSelected = selectedId === row.id;
                  const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";

                  return (
                    <tr key={row.id} className={isSelected ? "bg-sky-100" : index % 2 ? "bg-sky-50/70" : undefined}>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.noInvoice}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatTanggal(row.tanggal, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.noPo}</td>
                      <td className="px-3 py-2 text-slate-600">{invoiceNoSuratJalanListLabel(row.noSuratJalan)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.barang.map((barang) => barang.namaBarang).join(", ") || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{customerLabel}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatRupiah(row.subtotal, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatRupiah(row.ppnAmount, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{formatRupiah(row.grandTotal, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectRow?.(row)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              isSelected
                                ? "bg-sky-700 text-white"
                                : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                            }`}
                          >
                            {isSelected ? t("common.selected") : t("common.selectRow")}
                          </button>
                          <button
                            type="button"
                            onClick={() => exportInvoiceRowAsCsv(row)}
                            className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                          >
                            {t("common.export")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-slate-500">{t("common.filterResult", { count: filteredRows.length })}</p>
    </section>
  );
}
