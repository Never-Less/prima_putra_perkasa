"use client";

import { useMemo, useState } from "react";
import {
  defaultCustomerFilter,
  filterCustomerRows,
  type CustomerFilter,
  type CustomerItem,
} from "../_lib/customer";
import { useI18n } from "../../_i18n/provider";

type CustomerTableFilterProps = {
  rows: CustomerItem[];
  selectedId?: string;
  onSelectRow?: (row: CustomerItem) => void;
};

export function CustomerTableFilter({ rows, selectedId, onSelectRow }: CustomerTableFilterProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<CustomerFilter>(defaultCustomerFilter);

  const filteredRows = useMemo(() => filterCustomerRows(rows, filter), [filter, rows]);

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900">{t("customer.table.title")}</h2>
        <button
          onClick={() => setFilter(defaultCustomerFilter)}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
        >
          {t("common.resetFilter")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sky-800">{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-700">
            {t("field.Nama")}
            <input
              value={filter.Nama}
              onChange={(event) => setFilter((prev) => ({ ...prev, Nama: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.Alamat")}
            <input
              value={filter.Alamat}
              onChange={(event) => setFilter((prev) => ({ ...prev, Alamat: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.AtasNama")}
            <input
              value={filter.AtasNama}
              onChange={(event) => setFilter((prev) => ({ ...prev, AtasNama: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-sky-100 text-left text-sky-800">
            <tr>
              <th className="px-3 py-2 font-medium">{t("field.Nama")}</th>
              <th className="px-3 py-2 font-medium">{t("field.Alamat")}</th>
              <th className="px-3 py-2 font-medium">{t("field.AtasNama")}</th>
              <th className="px-3 py-2 font-medium">{t("common.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredRows.map((row, index) => {
              const isSelected = selectedId === row.id;

              return (
                <tr key={row.id} className={isSelected ? "bg-sky-100" : index % 2 ? "bg-sky-50/70" : undefined}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.Nama}</td>
                  <td className="px-3 py-2 text-slate-600">{row.Alamat}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.AtasNama}</td>
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
