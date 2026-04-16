"use client";

import { PaginationControls } from "../../_components/pagination-controls";
import { type ServerPaginationMeta } from "../../_lib/pagination";
import {
  formatRupiah,
  formatTanggal,
  type PembelianFilter,
  type PembelianItem,
} from "../_lib/pembelian";
import { useI18n } from "../../_i18n/provider";

type PembelianTableFilterProps = {
  rows: PembelianItem[];
  filter: PembelianFilter;
  filteredCount: number;
  pagination: ServerPaginationMeta;
  selectedId?: string;
  onSelectRow?: (row: PembelianItem) => void;
  resolveInvoiceLabel?: (invoiceId: string) => string;
  onFilterChange: <K extends keyof PembelianFilter>(key: K, value: PembelianFilter[K]) => void;
  onResetFilter: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const clampedCellClassName =
  "overflow-hidden break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

export function PembelianTableFilter({
  rows,
  filter,
  filteredCount,
  pagination,
  selectedId,
  onSelectRow,
  resolveInvoiceLabel,
  onFilterChange,
  onResetFilter,
  onPageChange,
  onPageSizeChange,
}: PembelianTableFilterProps) {
  const { locale, t } = useI18n();
  const filterPlaceholder = (fieldKey: string) =>
    t("common.placeholder.filter", { field: t(fieldKey) });
  const groupedRows = (() => {
    const groupMap = new Map<string, PembelianItem[]>();

    rows.forEach((row) => {
      const key = resolveInvoiceLabel?.(row.idInvoice) || row.idInvoice || "-";
      const existingRows = groupMap.get(key);

      if (existingRows) {
        existingRows.push(row);
        return;
      }

      groupMap.set(key, [row]);
    });

    return Array.from(groupMap.entries()).map(([noInvoice, items]) => ({
      noInvoice,
      items,
    }));
  })();

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("pembelian.table.title")}</h2>
        <button
          type="button"
          onClick={onResetFilter}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
        >
          {t("common.resetFilter")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sky-800 dark:text-sky-200">{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaSupplier")}
            <input
              value={filter.namaSupplier}
              onChange={(event) => onFilterChange("namaSupplier", event.target.value)}
              placeholder={filterPlaceholder("field.namaSupplier")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noNpwp")}
            <input
              value={filter.noNpwp}
              onChange={(event) => onFilterChange("noNpwp", event.target.value)}
              placeholder={filterPlaceholder("field.noNpwp")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noInvoice")}
            <input
              value={filter.noInvoice}
              onChange={(event) => onFilterChange("noInvoice", event.target.value)}
              placeholder={filterPlaceholder("field.noInvoice")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.hutang")}
            <select
              value={filter.hutang}
              onChange={(event) =>
                onFilterChange("hutang", event.target.value as PembelianFilter["hutang"])
              }
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.ppn")}
            <select
              value={filter.ppn}
              onChange={(event) =>
                onFilterChange("ppn", event.target.value as PembelianFilter["ppn"])
              }
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalDari")}
            <input
              type="date"
              value={filter.tanggalNotaDari}
              onChange={(event) => onFilterChange("tanggalNotaDari", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalSampai")}
            <input
              type="date"
              value={filter.tanggalNotaSampai}
              onChange={(event) => onFilterChange("tanggalNotaSampai", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalBayarDari")}
            <input
              type="date"
              value={filter.tanggalBayarDari}
              onChange={(event) => onFilterChange("tanggalBayarDari", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalBayarSampai")}
            <input
              type="date"
              value={filter.tanggalBayarSampai}
              onChange={(event) => onFilterChange("tanggalBayarSampai", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.nilaiNotaMin")}
            <input
              type="number"
              min={0}
              value={filter.nilaiNotaMin}
              onChange={(event) => onFilterChange("nilaiNotaMin", event.target.value)}
              placeholder={filterPlaceholder("field.nilaiNotaMin")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.nilaiNotaMax")}
            <input
              type="number"
              min={0}
              value={filter.nilaiNotaMax}
              onChange={(event) => onFilterChange("nilaiNotaMax", event.target.value)}
              placeholder={filterPlaceholder("field.nilaiNotaMax")}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {groupedRows.length === 0 ? (
          <div className="rounded-xl border border-sky-200 bg-white px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : null}

        {groupedRows.map((group) => (
          <div key={group.noInvoice} className="overflow-hidden rounded-xl border border-sky-300 bg-white shadow-sm dark:border-sky-900/70 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 bg-sky-100/90 px-3 py-2 dark:border-sky-900/70 dark:bg-sky-950/40">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("field.noInvoice")}: {group.noInvoice}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t("common.totalData", { count: group.items.length })}
              </span>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {group.items.map((row) => {
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
                        <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{row.namaSupplier || "-"}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTanggal(row.tanggalNota, locale)}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isSelected ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950" : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {formatRupiah(row.nilaiNota, locale)}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.noNpwp")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.noNpwp || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.lamaHutang")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">
                            {row.lamaHutang} <span className="text-xs text-slate-500 dark:text-slate-400">{t("pembelian.lamaHutang.note")}</span>
                          </dd>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.hutang")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.hutang ? t("common.true") : t("common.false")}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.ppn")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.ppn ? t("common.true") : t("common.false")}</dd>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.tanggalJatuhTempo")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatTanggal(row.tanggalJatuhTempo, locale)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.tanggalBayar")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatTanggal(row.tanggalBayar, locale)}</dd>
                        </div>
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
              })}
            </div>

            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1240px] table-fixed text-sm">
                  <colgroup>
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "250px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "120px" }} />
                  </colgroup>
                  <thead className="bg-sky-800 text-left text-white dark:bg-sky-950">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("field.tanggalNota")}</th>
                      <th className="px-3 py-2 font-medium">{t("field.namaSupplier")}</th>
                      <th className="px-3 py-2 font-medium">{t("field.noNpwp")}</th>
                      <th className="px-3 py-2 font-medium">{t("field.hutang")}</th>
                      <th className="px-3 py-2 font-medium">{t("field.ppn")}</th>
                      <th className="px-3 py-2 font-medium">
                        <span>{t("field.lamaHutang")}</span>
                        <span className="block text-xs font-normal text-sky-100">{t("pembelian.lamaHutang.note")}</span>
                      </th>
                      <th className="px-3 py-2 font-medium">{t("field.nilaiNota")}</th>
                      <th className="px-3 py-2 font-medium">{t("field.tanggalJatuhTempo")}</th>
                      <th className="px-3 py-2 font-medium">{t("field.tanggalBayar")}</th>
                      <th className="px-3 py-2 font-medium">{t("common.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {group.items.map((row, index) => {
                      const isSelected = selectedId === row.id;

                      return (
                        <tr
                          key={row.id}
                          className={isSelected ? "bg-sky-100 dark:bg-sky-950/40" : index % 2 ? "bg-sky-50/70 dark:bg-slate-950/40" : undefined}
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {formatTanggal(row.tanggalNota, locale)}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100" title={row.namaSupplier || "-"}>
                            <div className={clampedCellClassName}>{row.namaSupplier || "-"}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{row.noNpwp || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {row.hutang ? t("common.true") : t("common.false")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {row.ppn ? t("common.true") : t("common.false")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{row.lamaHutang}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {formatRupiah(row.nilaiNota, locale)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {formatTanggal(row.tanggalJatuhTempo, locale)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {formatTanggal(row.tanggalBayar, locale)}
                          </td>
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PaginationControls
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.limit}
        from={groupedRows.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
        to={groupedRows.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + groupedRows.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[3, 5, 10, 20]}
      />

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("common.filterResultGrouped", {
          rows: filteredCount,
          groups: pagination.totalItems,
        })}
      </p>
    </section>
  );
}
