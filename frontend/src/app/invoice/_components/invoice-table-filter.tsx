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
};

export function InvoiceTableFilter({ rows, selectedId, onSelectRow }: InvoiceTableFilterProps) {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<InvoiceFilter>(defaultInvoiceFilter);

  const filteredRows = useMemo(() => filterInvoiceRows(rows, filter), [filter, rows]);

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
            {t("field.NoInvoice")}
            <input
              value={filter.NoInvoice}
              onChange={(event) => setFilter((prev) => ({ ...prev, NoInvoice: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NoPO")}
            <input
              value={filter.NoPO}
              onChange={(event) => setFilter((prev) => ({ ...prev, NoPO: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NoSuratJalan")}
            <input
              value={filter.NoSuratJalan}
              onChange={(event) => setFilter((prev) => ({ ...prev, NoSuratJalan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NamaCustomer")}
            <input
              value={filter.IdCustomer}
              onChange={(event) => setFilter((prev) => ({ ...prev, IdCustomer: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.IsPpn")}
            <select
              value={filter.IsPpn}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, IsPpn: event.target.value as InvoiceFilter["IsPpn"] }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            {t("field.TanggalDari")}
            <input
              type="date"
              value={filter.TanggalDari}
              onChange={(event) => setFilter((prev) => ({ ...prev, TanggalDari: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.TanggalSampai")}
            <input
              type="date"
              value={filter.TanggalSampai}
              onChange={(event) => setFilter((prev) => ({ ...prev, TanggalSampai: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-sky-100 text-left text-sky-800">
            <tr>
              <th className="px-3 py-2 font-medium">{t("field.NoInvoice")}</th>
              <th className="px-3 py-2 font-medium">{t("field.Tanggal")}</th>
              <th className="px-3 py-2 font-medium">{t("field.NoPO")}</th>
              <th className="px-3 py-2 font-medium">{t("field.NoSuratJalan")}</th>
              <th className="px-3 py-2 font-medium">{t("field.NamaCustomer")}</th>
              <th className="px-3 py-2 font-medium">{t("field.Subtotal")}</th>
              <th className="px-3 py-2 font-medium">{t("field.PpnAmount")}</th>
              <th className="px-3 py-2 font-medium">{t("field.GrandTotal")}</th>
              <th className="px-3 py-2 font-medium">{t("common.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredRows.map((row, index) => {
              const isSelected = selectedId === row.id;

              return (
                <tr key={row.id} className={isSelected ? "bg-sky-100" : index % 2 ? "bg-sky-50/70" : undefined}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.NoInvoice}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatTanggal(row.Tanggal, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.NoPO}</td>
                  <td className="px-3 py-2 text-slate-600">{invoiceNoSuratJalanListLabel(row.NoSuratJalan)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.IdCustomer}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatRupiah(row.Subtotal, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatRupiah(row.PpnAmount, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{formatRupiah(row.GrandTotal, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      onClick={() => onSelectRow?.(row)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        isSelected
                          ? "bg-sky-700 text-white"
                          : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                      }`}
                    >
                      {isSelected ? t("common.selected") : t("common.selectRow")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-500">{t("common.filterResult", { count: filteredRows.length })}</p>
    </section>
  );
}
