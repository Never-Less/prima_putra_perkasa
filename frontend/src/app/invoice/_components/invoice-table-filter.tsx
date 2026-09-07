"use client";

import { useMemo, useState } from "react";
import {
  ColumnSettingsMenu,
  HiddenColumnStyles,
  ListSortControl,
  SortableHeader,
} from "../../_components/list-view-header";
import { PaginationControls } from "../../_components/pagination-controls";
import { DebouncedFilterInput } from "../../_components/debounced-filter-input";
import { AppDateInput } from "../../_components/app-date-input";
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
import { useFilterDraft } from "../../_hooks/use-filter-draft";

type InvoiceTableFilterProps = {
  rows: InvoiceItem[];
  filter: InvoiceFilter;
  filteredCount: number;
  pagination: ServerPaginationMeta;
  selectedId?: string;
  canExport?: boolean;
  sortValue?: string;
  sortOptions?: Array<{ value: string; label: string }>;
  onSelectRow?: (row: InvoiceItem) => void;
  onExportRow?: (row: InvoiceItem) => void;
  onExportPage?: () => void;
  onSortChange?: (value: string) => void;
  resolveCustomerLabel?: (customerId: string) => string;
  onFilterChange: <K extends keyof InvoiceFilter>(key: K, value: InvoiceFilter[K]) => void;
  onResetFilter: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const clampedCellClassName =
  "truncate";

function dueDateIndicatorClass(dueDate: string, isPaid: boolean) {
  if (isPaid || !dueDate) return "text-slate-700 dark:text-slate-200";
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return "text-slate-700 dark:text-slate-200";
  const today = new Date();
  const dueDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const overdueDays = Math.floor((todayDay - dueDay) / 86400000);
  if (overdueDays > 7) return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300";
  if (overdueDays > 3) return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
  if (overdueDays > 0) return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
}

export function InvoiceTableFilter({
  rows,
  filter,
  filteredCount,
  pagination,
  selectedId,
  canExport = false,
  sortValue,
  sortOptions = [],
  onSelectRow,
  onExportRow,
  onExportPage,
  onSortChange,
  resolveCustomerLabel,
  onFilterChange,
  onResetFilter,
  onPageChange,
  onPageSizeChange,
}: InvoiceTableFilterProps) {
  const { locale, t } = useI18n();
  const { draftFilter, updateDraftFilter, applyDraftFilter, resetDraftFilter } =
    useFilterDraft(filter, onFilterChange, onResetFilter);
  const filterPlaceholder = (fieldKey: string) => t(fieldKey);
  const paidLabel = t("invoice.status.paid");
  const unpaidLabel = t("invoice.status.unpaid");
  const columns = useMemo(
    () => [
      { key: "action", label: t("common.action"), index: 1, locked: true },
      { key: "noInvoice", label: t("field.noInvoice"), index: 2 },
      { key: "tanggal", label: t("field.tanggal"), index: 3 },
      { key: "dueDate", label: t("field.dueDate"), index: 4 },
      { key: "noPo", label: t("field.noPo"), index: 5 },
      { key: "noSuratJalan", label: t("field.noSuratJalan"), index: 6 },
      { key: "barang", label: t("field.barang"), index: 7 },
      { key: "namaCustomer", label: t("field.namaCustomer"), index: 8 },
      { key: "subtotal", label: t("field.subtotal"), index: 9 },
      { key: "ppnAmount", label: t("field.ppnAmount"), index: 10 },
      { key: "grandTotal", label: t("field.grandTotal"), index: 11 },
      { key: "isPaid", label: t("field.isPaid"), index: 12 },
      { key: "tanggalBayar", label: t("field.tanggalBayar"), index: 13 },
    ],
    [t]
  );
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([
    "noSuratJalan",
    "barang",
    "subtotal",
    "ppnAmount",
    "tanggalBayar",
  ]);
  const hiddenColumnIndexes = columns
    .filter((column) => hiddenColumns.includes(column.key))
    .map((column) => column.index);

  return (
    <section className="ppp-list-view ppp-invoice-list space-y-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <HiddenColumnStyles scopeClassName="ppp-invoice-list" hiddenColumnIndexes={hiddenColumnIndexes} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("invoice.table.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <button
              type="button"
              onClick={onExportPage}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {t("invoice.exportPage.openButton")}
            </button>
          ) : null}
          <ListSortControl sortValue={sortValue} sortOptions={sortOptions} onSortChange={onSortChange} />
          <ColumnSettingsMenu
            columns={columns}
            hiddenColumns={hiddenColumns}
            onHiddenColumnsChange={setHiddenColumns}
          />
        </div>
      </div>

      <form onSubmit={applyDraftFilter}>
        <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noInvoice")}
            <DebouncedFilterInput
              value={draftFilter.noInvoice}
              onValueChange={(value) => updateDraftFilter("noInvoice", value)}
              placeholder={filterPlaceholder("field.noInvoice")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noPo")}
            <DebouncedFilterInput
              value={draftFilter.noPo}
              onValueChange={(value) => updateDraftFilter("noPo", value)}
              placeholder={filterPlaceholder("field.noPo")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noSuratJalan")}
            <DebouncedFilterInput
              value={draftFilter.noSuratJalan}
              onValueChange={(value) => updateDraftFilter("noSuratJalan", value)}
              placeholder={filterPlaceholder("field.noSuratJalan")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaBarang")}
            <DebouncedFilterInput
              value={draftFilter.namaBarang}
              onValueChange={(value) => updateDraftFilter("namaBarang", value)}
              placeholder={filterPlaceholder("field.namaBarang")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaCustomer")}
            <DebouncedFilterInput
              value={draftFilter.idCustomer}
              onValueChange={(value) => updateDraftFilter("idCustomer", value)}
              placeholder={filterPlaceholder("field.namaCustomer")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.isPpn")}
            <select
              value={draftFilter.isPpn}
              onChange={(event) =>
                updateDraftFilter("isPpn", event.target.value as InvoiceFilter["isPpn"])
              }
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.isPaid")}
            <select
              value={draftFilter.isPaid}
              onChange={(event) =>
                updateDraftFilter("isPaid", event.target.value as InvoiceFilter["isPaid"])
              }
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{paidLabel}</option>
              <option value="false">{unpaidLabel}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalBayarDari")}
            <AppDateInput
              value={draftFilter.tanggalBayarDari}
              onValueChange={(value) => updateDraftFilter("tanggalBayarDari", value)}
              placeholder={t("common.filter.after", { field: t("field.tanggalBayar") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalBayarSampai")}
            <AppDateInput
              value={draftFilter.tanggalBayarSampai}
              onValueChange={(value) => updateDraftFilter("tanggalBayarSampai", value)}
              placeholder={t("common.filter.before", { field: t("field.tanggalBayar") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalDari")}
            <AppDateInput
              value={draftFilter.tanggalDari}
              onValueChange={(value) => updateDraftFilter("tanggalDari", value)}
              placeholder={t("common.filter.after", { field: t("field.tanggal") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalSampai")}
            <AppDateInput
              value={draftFilter.tanggalSampai}
              onValueChange={(value) => updateDraftFilter("tanggalSampai", value)}
              placeholder={t("common.filter.before", { field: t("field.tanggal") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={resetDraftFilter} className="border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {t("common.resetFilter")}
          </button>
          <button type="submit" className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 dark:bg-sky-500 dark:text-slate-950">
            {t("common.applyFilter")}
          </button>
        </div>
      </form>

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
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.dueDate")}</dt>
                      <dd className={`mt-1 rounded px-1.5 py-1 font-medium ${dueDateIndicatorClass(row.dueDate, row.isPaid)}`}>{formatTanggal(row.dueDate, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.isPaid")}</dt>
                      <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.isPaid ? paidLabel : unpaidLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.tanggalBayar")}</dt>
                      <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatTanggal(row.tanggalBayar, locale)}</dd>
                    </div>
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
                  >
                    {t("common.openDetails")}
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
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: "100px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "320px" }} />
                <col style={{ width: "240px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "120px" }} />
              </colgroup>
              <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("common.action")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.noInvoice")}</th>
                  <th className="px-3 py-2 font-medium">
                    <SortableHeader
                      label={t("field.tanggal")}
                      sortValue={sortValue}
                      ascValue="dateAsc"
                      descValue="dateDesc"
                      onSortChange={onSortChange}
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">{t("field.dueDate")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.noPo")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.noSuratJalan")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.barang")}</th>
                  <th className="px-3 py-2 font-medium">
                    <SortableHeader
                      label={t("field.namaCustomer")}
                      sortValue={sortValue}
                      ascValue="nameAsc"
                      descValue="nameDesc"
                      onSortChange={onSortChange}
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">{t("field.subtotal")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.ppnAmount")}</th>
                  <th className="px-3 py-2 font-medium">
                    <SortableHeader
                      label={t("field.grandTotal")}
                      sortValue={sortValue}
                      ascValue="amountAsc"
                      descValue="amountDesc"
                      onSortChange={onSortChange}
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">{t("field.isPaid")}</th>
                  <th className="px-3 py-2 font-medium">{t("field.tanggalBayar")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
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
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex flex-nowrap items-center gap-1.5">
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
                        <td className="truncate px-3 py-2 font-medium" title={row.noInvoice || "-"}>
                          <button
                            type="button"
                            onClick={() => onSelectRow?.(row)}
                            className="truncate text-left font-semibold text-blue-700 hover:underline dark:text-blue-300"
                          >
                            {row.noInvoice || "-"}
                          </button>
                        </td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggal, locale)}</td>
                        <td className={`truncate px-3 py-2 font-medium ${dueDateIndicatorClass(row.dueDate, row.isPaid)}`}>{formatTanggal(row.dueDate, locale)}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={row.noPo || "-"}>
                          <div className={clampedCellClassName}>{row.noPo || "-"}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={invoiceNoSuratJalanListLabel(row.noSuratJalan)}>
                          <div className={clampedCellClassName}>{invoiceNoSuratJalanListLabel(row.noSuratJalan)}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={barangText}>
                          <div className={clampedCellClassName}>{barangText}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={customerLabel}>
                          <div className={clampedCellClassName}>{customerLabel}</div>
                        </td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300">{formatRupiah(row.subtotal, locale)}</td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300">{formatRupiah(row.ppnAmount, locale)}</td>
                        <td className="truncate px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{formatRupiah(row.grandTotal, locale)}</td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300">{row.isPaid ? paidLabel : unpaidLabel}</td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggalBayar, locale)}</td>
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
