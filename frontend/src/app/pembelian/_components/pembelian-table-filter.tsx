"use client";

import { useMemo, useState } from "react";
import {
  defaultPembelianFilter,
  filterPembelianRows,
  formatRupiah,
  formatTanggal,
  type PembelianFilter,
  type PembelianItem,
} from "../_lib/pembelian";
import { sampleInvoiceRows } from "../../invoice/_lib/invoice";
import { useI18n } from "../../_i18n/provider";

type PembelianTableFilterProps = {
  rows: PembelianItem[];
  selectedId?: string;
  onSelectRow?: (row: PembelianItem) => void;
};

export function PembelianTableFilter({ rows, selectedId, onSelectRow }: PembelianTableFilterProps) {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<PembelianFilter>(defaultPembelianFilter);
  const noInvoiceOptions = useMemo(() => {
    return Array.from(new Set(sampleInvoiceRows.map((invoice) => invoice.NoInvoice)));
  }, []);

  const filteredRows = useMemo(() => filterPembelianRows(rows, filter), [filter, rows]);

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900">{t("pembelian.table.title")}</h2>
        <button
          onClick={() => setFilter(defaultPembelianFilter)}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
        >
          {t("common.resetFilter")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sky-800">{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            {t("field.NamaSupplier")}
            <input
              value={filter.NamaSupplier}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, NamaSupplier: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NoNpwp")}
            <input
              value={filter.NoNpwp}
              onChange={(event) => setFilter((prev) => ({ ...prev, NoNpwp: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NoInvoice")}
            <select
              value={filter.NoInvoice}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, NoInvoice: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              {noInvoiceOptions.map((noInvoice) => (
                <option key={noInvoice} value={noInvoice}>
                  {noInvoice}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            {t("field.Hutang")}
            <select
              value={filter.Hutang}
              onChange={(event) =>
                setFilter((prev) => ({
                  ...prev,
                  Hutang: event.target.value as PembelianFilter["Hutang"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            {t("field.Ppn")}
            <select
              value={filter.Ppn}
              onChange={(event) =>
                setFilter((prev) => ({
                  ...prev,
                  Ppn: event.target.value as PembelianFilter["Ppn"],
                }))
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
              value={filter.TanggalNotaDari}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, TanggalNotaDari: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.TanggalSampai")}
            <input
              type="date"
              value={filter.TanggalNotaSampai}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, TanggalNotaSampai: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.TanggalBayarDari")}
            <input
              type="date"
              value={filter.TanggalBayarDari}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, TanggalBayarDari: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.TanggalBayarSampai")}
            <input
              type="date"
              value={filter.TanggalBayarSampai}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, TanggalBayarSampai: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NilaiNotaMin")}
            <input
              type="number"
              min={0}
              value={filter.NilaiNotaMin}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, NilaiNotaMin: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NilaiNotaMax")}
            <input
              type="number"
              min={0}
              value={filter.NilaiNotaMax}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, NilaiNotaMax: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-sky-100 text-left text-sky-800">
            <tr>
              <th className="px-3 py-2 font-medium">{t("field.TanggalNota")}</th>
              <th className="px-3 py-2 font-medium">{t("field.NamaSupplier")}</th>
              <th className="px-3 py-2 font-medium">{t("field.NoNpwp")}</th>
              <th className="px-3 py-2 font-medium">{t("field.NoInvoice")}</th>
              <th className="px-3 py-2 font-medium">{t("field.Hutang")}</th>
              <th className="px-3 py-2 font-medium">{t("field.Ppn")}</th>
              <th className="px-3 py-2 font-medium">
                <span>{t("field.LamaHutang")}</span>
                <span className="block text-xs font-normal text-sky-700">{t("pembelian.lamaHutang.note")}</span>
              </th>
              <th className="px-3 py-2 font-medium">{t("field.NilaiNota")}</th>
              <th className="px-3 py-2 font-medium">{t("field.TanggalJatuhTempo")}</th>
              <th className="px-3 py-2 font-medium">{t("field.TanggalBayar")}</th>
              <th className="px-3 py-2 font-medium">{t("common.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredRows.map((row, index) => {
              const isSelected = selectedId === row.id;

              return (
                <tr key={row.id} className={isSelected ? "bg-sky-100" : index % 2 ? "bg-sky-50/70" : undefined}>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatTanggal(row.TanggalNota, locale)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.NamaSupplier}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.NoNpwp || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.NoInvoice || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {row.Hutang ? t("common.true") : t("common.false")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {row.Ppn ? t("common.true") : t("common.false")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.LamaHutang}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatRupiah(row.NilaiNota, locale)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatTanggal(row.TanggalJatuhTempo, locale)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatTanggal(row.TanggalBayar, locale)}
                  </td>
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
