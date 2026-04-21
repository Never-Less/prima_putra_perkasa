"use client";

import { PaginationControls } from "../../_components/pagination-controls";
import { type ServerPaginationMeta } from "../../_lib/pagination";
import {
  formatInvoiceBarangLabel,
  formatRupiah,
  formatTanggal,
  invoiceNoSuratJalanListLabel,
  type InvoiceFilter,
  type InvoiceItem,
} from "../_lib/invoice";
import { useI18n } from "../../_i18n/provider";

type InvoiceTableFilterProps = {
  rows: InvoiceItem[];
  filter: InvoiceFilter;
  filteredCount: number;
  pagination: ServerPaginationMeta;
  selectedId?: string;
  canExport?: boolean;
  onSelectRow?: (row: InvoiceItem) => void;
  onExportRow?: (row: InvoiceItem) => void;
  onExportPage?: () => void;
  resolveCustomerLabel?: (customerId: string) => string;
  onFilterChange: <K extends keyof InvoiceFilter>(key: K, value: InvoiceFilter[K]) => void;
  onResetFilter: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const clampedCellClassName =
  "overflow-hidden break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

export function InvoiceTableFilter({
  rows,
  filter,
  filteredCount,
  pagination,
  selectedId,
  canExport = false,
  onSelectRow,
  onExportRow,
  onExportPage,
  resolveCustomerLabel,
  onFilterChange,
  onResetFilter,
  onPageChange,
  onPageSizeChange,
}: InvoiceTableFilterProps) {
  const { locale, t } = useI18n();
  const filterPlaceholder = (fieldKey: string) =>
    t("common.placeholder.filter", { field: t(fieldKey) });

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("invoice.table.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <button
              type="button"
              onClick={onExportPage}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
            >
              {t("invoice.exportPage.openButton")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onResetFilter}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
          >
            {t("common.resetFilter")}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sky-800 dark:text-sky-200">{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
            {t("field.noPo")}
            <input
              value={filter.noPo}
              onChange={(event) => onFilterChange("noPo", event.target.value)}
              placeholder={filterPlaceholder("field.noPo")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noSuratJalan")}
            <input
              value={filter.noSuratJalan}
              onChange={(event) => onFilterChange("noSuratJalan", event.target.value)}
              placeholder={filterPlaceholder("field.noSuratJalan")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaCustomer")}
            <input
              value={filter.idCustomer}
              onChange={(event) => onFilterChange("idCustomer", event.target.value)}
              placeholder={filterPlaceholder("field.namaCustomer")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.isPpn")}
            <select
              value={filter.isPpn}
              onChange={(event) =>
                onFilterChange("isPpn", event.target.value as InvoiceFilter["isPpn"])
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
              value={filter.tanggalDari}
              onChange={(event) => onFilterChange("tanggalDari", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalSampai")}
            <input
              type="date"
              value={filter.tanggalSampai}
              onChange={(event) => onFilterChange("tanggalSampai", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-sky-200 bg-white px-4 py-5 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : (
          rows.map((row) => {
            const isSelected = selectedId === row.id;
            const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";

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
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{row.noInvoice || "-"}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTanggal(row.tanggal, locale)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      isSelected ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950" : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {formatRupiah(row.grandTotal, locale)}
                  </span>
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.noPo")}</dt>
                      <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.noPo || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.namaCustomer")}</dt>
                      <dd className="mt-1 text-slate-700 dark:text-slate-200">{customerLabel}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.noSuratJalan")}</dt>
                    <dd className="mt-1 break-words text-slate-700 dark:text-slate-200">{invoiceNoSuratJalanListLabel(row.noSuratJalan)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.barang")}</dt>
                    <dd className="mt-1 break-words text-slate-700 dark:text-slate-200">
                      {row.barang
                        .map((barang) => formatInvoiceBarangLabel(barang.namaBarang, barang.spesifikasi))
                        .join(", ") || "-"}
                    </dd>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.subtotal")}</dt>
                      <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatRupiah(row.subtotal, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.ppnAmount")}</dt>
                      <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatRupiah(row.ppnAmount, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.grandTotal")}</dt>
                      <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatRupiah(row.grandTotal, locale)}</dd>
                    </div>
                  </div>
                </dl>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onSelectRow?.(row)}
                    className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${
                      isSelected
                        ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950"
                        : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {isSelected ? t("common.selected") : t("common.selectRow")}
                  </button>
                  {canExport ? (
                    <button
                      type="button"
                      onClick={() => onExportRow?.(row)}
                      className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                    >
                      {t("common.export")}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border border-sky-300 bg-white shadow-sm dark:border-sky-900/70 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[1490px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: "130px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "320px" }} />
                <col style={{ width: "240px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "160px" }} />
              </colgroup>
              <thead className="bg-sky-800 text-left text-white dark:bg-sky-950">
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
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const isSelected = selectedId === row.id;
                    const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
                    const barangText =
                      row.barang
                        .map((barang) => formatInvoiceBarangLabel(barang.namaBarang, barang.spesifikasi))
                        .join(", ") || "-";

                    return (
                      <tr key={row.id} className={isSelected ? "bg-sky-100 dark:bg-sky-950/40" : index % 2 ? "bg-sky-50/70 dark:bg-slate-950/40" : undefined}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{row.noInvoice}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggal, locale)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{row.noPo}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={invoiceNoSuratJalanListLabel(row.noSuratJalan)}>
                          <div className={clampedCellClassName}>{invoiceNoSuratJalanListLabel(row.noSuratJalan)}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={barangText}>
                          <div className={clampedCellClassName}>{barangText}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={customerLabel}>
                          <div className={clampedCellClassName}>{customerLabel}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatRupiah(row.subtotal, locale)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatRupiah(row.ppnAmount, locale)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{formatRupiah(row.grandTotal, locale)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
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
                            {canExport ? (
                              <button
                                type="button"
                                onClick={() => onExportRow?.(row)}
                                className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                              >
                                {t("common.export")}
                              </button>
                            ) : null}
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
      </div>

      <PaginationControls
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.limit}
        from={rows.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
        to={rows.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + rows.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.filterResult", { count: filteredCount })}</p>
    </section>
  );
}
