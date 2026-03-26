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
            {t("field.nama")}
            <input
              value={filter.nama}
              onChange={(event) => setFilter((prev) => ({ ...prev, nama: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.alamat")}
            <input
              value={filter.alamat}
              onChange={(event) => setFilter((prev) => ({ ...prev, alamat: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.atasNama")}
            <input
              value={filter.atasNama}
              onChange={(event) => setFilter((prev) => ({ ...prev, atasNama: event.target.value }))}
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
                <th className="px-3 py-2 font-medium">{t("field.nama")}</th>
                <th className="px-3 py-2 font-medium">{t("field.alamat")}</th>
                <th className="px-3 py-2 font-medium">{t("field.atasNama")}</th>
                <th className="px-3 py-2 font-medium">{t("common.action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const isSelected = selectedId === row.id;

                  return (
                    <tr key={row.id} className={isSelected ? "bg-sky-100" : index % 2 ? "bg-sky-50/70" : undefined}>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.nama}</td>
                      <td className="px-3 py-2 text-slate-600">{row.alamat}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.atasNama}</td>
                      <td className="whitespace-nowrap px-3 py-2">
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
