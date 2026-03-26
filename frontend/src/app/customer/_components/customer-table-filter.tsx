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
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("customer.table.title")}</h2>
        <button
          onClick={() => setFilter(defaultCustomerFilter)}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
        >
          {t("common.resetFilter")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sky-800 dark:text-sky-200">{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.nama")}
            <input
              value={filter.nama}
              onChange={(event) => setFilter((prev) => ({ ...prev, nama: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.alamat")}
            <input
              value={filter.alamat}
              onChange={(event) => setFilter((prev) => ({ ...prev, alamat: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.atasNama")}
            <input
              value={filter.atasNama}
              onChange={(event) => setFilter((prev) => ({ ...prev, atasNama: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-sky-200 bg-white px-4 py-5 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : (
          filteredRows.map((row) => {
            const isSelected = selectedId === row.id;

            return (
              <article
                key={row.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  isSelected
                    ? "border-sky-300 bg-sky-50/80 dark:border-sky-700 dark:bg-sky-950/35"
                    : "border-sky-100 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{row.nama || "-"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("nav.customer")}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      isSelected ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950" : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {isSelected ? t("common.selected") : t("common.action")}
                  </span>
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.alamat")}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-200">{row.alamat || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.atasNama")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.atasNama || "-"}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => onSelectRow?.(row)}
                    className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium ${
                      isSelected
                        ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950"
                        : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {isSelected ? t("common.selected") : t("common.selectRow")}
                </button>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border border-sky-300 bg-white shadow-sm dark:border-sky-900/70 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-sky-800 text-left text-white dark:bg-sky-950">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("field.nama")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.alamat")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.atasNama")}</th>
                  <th className="px-3 py-2 font-medium">{t("common.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    const isSelected = selectedId === row.id;

                    return (
                      <tr key={row.id} className={isSelected ? "bg-sky-100 dark:bg-sky-950/40" : index % 2 ? "bg-sky-50/70 dark:bg-slate-950/40" : undefined}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{row.nama}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.alamat}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{row.atasNama}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <button
                            type="button"
                            onClick={() => onSelectRow?.(row)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              isSelected
                                ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950"
                                : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
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
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.filterResult", { count: filteredRows.length })}</p>
    </section>
  );
}
