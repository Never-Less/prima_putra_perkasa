"use client";

import { useMemo, useState } from "react";
import {
  defaultInvoiceFilter,
  filterInvoiceRows,
  formatRupiah,
  formatTanggal,
  type InvoiceFilter,
  type InvoiceItem,
} from "../_lib/invoice";

type InvoiceTableFilterProps = {
  rows: InvoiceItem[];
  selectedId?: string;
  onSelectRow?: (row: InvoiceItem) => void;
};

export function InvoiceTableFilter({ rows, selectedId, onSelectRow }: InvoiceTableFilterProps) {
  const [filter, setFilter] = useState<InvoiceFilter>(defaultInvoiceFilter);

  const filteredRows = useMemo(() => filterInvoiceRows(rows, filter), [filter, rows]);

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900">Tabel Invoice</h2>
        <button
          onClick={() => setFilter(defaultInvoiceFilter)}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
        >
          Reset Filter
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sky-800">Filter Berdasarkan Field</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            NoInvoice
            <input
              value={filter.NoInvoice}
              onChange={(event) => setFilter((prev) => ({ ...prev, NoInvoice: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            NoPO
            <input
              value={filter.NoPO}
              onChange={(event) => setFilter((prev) => ({ ...prev, NoPO: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            NoSuratJalan
            <input
              value={filter.NoSuratJalan}
              onChange={(event) => setFilter((prev) => ({ ...prev, NoSuratJalan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            IdCustomer
            <input
              value={filter.IdCustomer}
              onChange={(event) => setFilter((prev) => ({ ...prev, IdCustomer: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            IsPpn
            <select
              value={filter.IsPpn}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, IsPpn: event.target.value as InvoiceFilter["IsPpn"] }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Semua</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Tanggal Dari
            <input
              type="date"
              value={filter.TanggalDari}
              onChange={(event) => setFilter((prev) => ({ ...prev, TanggalDari: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Tanggal Sampai
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
              <th className="px-3 py-2 font-medium">NoInvoice</th>
              <th className="px-3 py-2 font-medium">Tanggal</th>
              <th className="px-3 py-2 font-medium">NoPO</th>
              <th className="px-3 py-2 font-medium">NoSuratJalan</th>
              <th className="px-3 py-2 font-medium">IdCustomer</th>
              <th className="px-3 py-2 font-medium">Subtotal</th>
              <th className="px-3 py-2 font-medium">PpnAmount</th>
              <th className="px-3 py-2 font-medium">GrandTotal</th>
              <th className="px-3 py-2 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredRows.map((row, index) => {
              const isSelected = selectedId === row.id;

              return (
                <tr key={row.id} className={isSelected ? "bg-sky-100" : index % 2 ? "bg-sky-50/70" : undefined}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.NoInvoice}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatTanggal(row.Tanggal)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.NoPO}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.NoSuratJalan}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.IdCustomer}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatRupiah(row.Subtotal)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatRupiah(row.PpnAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{formatRupiah(row.GrandTotal)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      onClick={() => onSelectRow?.(row)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        isSelected
                          ? "bg-sky-700 text-white"
                          : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                      }`}
                    >
                      {isSelected ? "Terpilih" : "Pilih Row"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-500">Hasil filter: {filteredRows.length} data</p>
    </section>
  );
}
