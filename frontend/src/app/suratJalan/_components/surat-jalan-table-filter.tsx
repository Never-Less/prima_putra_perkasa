"use client";

import { useMemo, useState } from "react";
import {
  ColumnSettingsMenu,
  HiddenColumnStyles,
  ListSortControl,
  SortableHeader,
} from "../../_components/list-view-header";
import { AppDateInput } from "../../_components/app-date-input";
import { DebouncedFilterInput } from "../../_components/debounced-filter-input";
import { PaginationControls } from "../../_components/pagination-controls";
import { isSuratJalanInvoiced } from "../../_lib/surat-jalan-invoice-status";
import { type ServerPaginationMeta } from "../../_lib/pagination";
import {
  barangLabel,
  formatTanggal,
  type SuratJalanFilter,
  type SuratJalanItem,
} from "../_lib/surat-jalan";
import { useI18n } from "../../_i18n/provider";
import { useFilterDraft } from "../../_hooks/use-filter-draft";

type ColorTone = "slate" | "sky" | "emerald";
type TableStyle = "default" | "striped" | "compact";

type SuratJalanTableFilterProps = {
  rows: SuratJalanItem[];
  filter: SuratJalanFilter;
  filteredCount: number;
  pagination: ServerPaginationMeta;
  selectedId?: string;
  canExport?: boolean;
  sortValue?: string;
  sortOptions?: Array<{ value: string; label: string }>;
  invoicedSuratJalanNumbers?: Set<string>;
  onSelectRow?: (row: SuratJalanItem) => void;
  onExportRow?: (row: SuratJalanItem) => void;
  onExportNoPo?: (noPo: string) => void;
  onSortChange?: (value: string) => void;
  resolveCustomerLabel?: (customerId: string) => string;
  onFilterChange: <K extends keyof SuratJalanFilter>(key: K, value: SuratJalanFilter[K]) => void;
  onResetFilter: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  colorTone?: ColorTone;
  tableStyle?: TableStyle;
};

const toneStyles: Record<
  ColorTone,
  {
    section: string;
    title: string;
    subtitle: string;
    groupCard: string;
    groupHeader: string;
    header: string;
    mobileCard: string;
    mobileCardSelected: string;
    selectedRow: string;
    stripedRow: string;
    actionActive: string;
    actionInactive: string;
    resetButton: string;
  }
> = {
  slate: {
    section: "border-sky-200 bg-sky-50/40 dark:border-slate-800 dark:bg-slate-950/85",
    title: "text-sky-900 dark:text-slate-100",
    subtitle: "text-sky-800 dark:text-slate-300",
    groupCard: "border-sky-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
    groupHeader: "border-sky-200 bg-sky-100/90 dark:border-slate-800 dark:bg-slate-950/50",
    header: "bg-sky-800 text-white dark:bg-slate-950",
    mobileCard: "border-sky-100 bg-white dark:border-slate-800 dark:bg-slate-900",
    mobileCardSelected: "border-sky-300 bg-sky-50/80 dark:border-slate-700 dark:bg-slate-800/70",
    selectedRow: "bg-sky-100 dark:bg-slate-800/70",
    stripedRow: "bg-sky-50/70 dark:bg-slate-950/40",
    actionActive: "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950",
    actionInactive: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
    resetButton: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  },
  sky: {
    section: "border-sky-200 bg-sky-50/40 dark:border-sky-900/70 dark:bg-slate-950/85",
    title: "text-sky-900 dark:text-sky-100",
    subtitle: "text-sky-800 dark:text-sky-200",
    groupCard: "border-sky-300 bg-white shadow-sm dark:border-sky-900/70 dark:bg-slate-900",
    groupHeader: "border-sky-200 bg-sky-100/90 dark:border-sky-900/70 dark:bg-sky-950/40",
    header: "bg-sky-800 text-white dark:bg-sky-950",
    mobileCard: "border-sky-100 bg-white dark:border-slate-800 dark:bg-slate-900",
    mobileCardSelected: "border-sky-300 bg-sky-50/80 dark:border-sky-700 dark:bg-sky-950/35",
    selectedRow: "bg-sky-100 dark:bg-sky-950/40",
    stripedRow: "bg-sky-50/70 dark:bg-slate-950/40",
    actionActive: "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950",
    actionInactive: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800",
    resetButton: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800",
  },
  emerald: {
    section: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-slate-950/85",
    title: "text-emerald-900 dark:text-emerald-100",
    subtitle: "text-emerald-800 dark:text-emerald-200",
    groupCard: "border-emerald-300 bg-white shadow-sm dark:border-emerald-900/70 dark:bg-slate-900",
    groupHeader: "border-emerald-200 bg-emerald-100/90 dark:border-emerald-900/70 dark:bg-emerald-950/35",
    header: "bg-emerald-800 text-white dark:bg-emerald-950",
    mobileCard: "border-sky-100 bg-white dark:border-slate-800 dark:bg-slate-900",
    mobileCardSelected: "border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-950/30",
    selectedRow: "bg-emerald-100 dark:bg-emerald-950/30",
    stripedRow: "bg-emerald-50/70 dark:bg-slate-950/40",
    actionActive: "bg-emerald-700 text-white dark:bg-emerald-500 dark:text-slate-950",
    actionInactive: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800",
    resetButton: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800",
  },
};

const clampedCellClassName =
  "truncate";

export function SuratJalanTableFilter({
  rows,
  filter,
  filteredCount,
  pagination,
  selectedId,
  canExport = false,
  sortValue,
  sortOptions = [],
  invoicedSuratJalanNumbers = new Set(),
  onSelectRow,
  onExportRow,
  onExportNoPo,
  onSortChange,
  resolveCustomerLabel,
  onFilterChange,
  onResetFilter,
  onPageChange,
  onPageSizeChange,
  colorTone = "slate",
  tableStyle = "default",
}: SuratJalanTableFilterProps) {
  const { locale, t } = useI18n();
  const { draftFilter, updateDraftFilter, applyDraftFilter, resetDraftFilter } =
    useFilterDraft(filter, onFilterChange, onResetFilter);
  const filterPlaceholder = (fieldKey: string) => t(fieldKey);
  const tone = toneStyles[colorTone];
  const cellPadding = tableStyle === "compact" ? "px-2 py-1.5" : "px-3 py-2";
  const tableText = tableStyle === "compact" ? "text-xs" : "text-sm";
  const columns = useMemo(
    () => [
      { key: "action", label: t("common.action"), index: 1, locked: true },
      { key: "noPo", label: t("field.noPo"), index: 2 },
      { key: "noSuratJalan", label: t("field.noSuratJalan"), index: 3 },
      { key: "tanggal", label: t("field.tanggal"), index: 4 },
      { key: "kodeDepartemen", label: t("field.kodeDepartemen"), index: 5 },
      { key: "namaCustomer", label: t("field.namaCustomer"), index: 6 },
      { key: "barang", label: t("field.barang"), index: 7 },
      { key: "kendaraan", label: t("field.kendaraan"), index: 8 },
      { key: "statusInvoice", label: t("field.statusInvoice"), index: 9 },
      { key: "deliveryStatus", label: t("field.deliveryStatus"), index: 10 },
    ],
    [t]
  );
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([
    "kodeDepartemen",
    "barang",
    "kendaraan",
  ]);
  const hiddenColumnIndexes = columns
    .filter((column) => hiddenColumns.includes(column.key))
    .map((column) => column.index);
  const getInvoiceStatus = (row: SuratJalanItem) => {

    if (isSuratJalanInvoiced(row, invoicedSuratJalanNumbers)) {
      return {
        label: t("suratJalan.invoiceStatus.invoiced"),
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
      };
    }

    return {
      label: t("suratJalan.invoiceStatus.pending"),
      className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
    };
  };
  return (
    <section className={`ppp-list-view ppp-surat-jalan-list space-y-4 rounded-2xl border p-5 shadow-sm ${tone.section}`}>
      <HiddenColumnStyles scopeClassName="ppp-surat-jalan-list" hiddenColumnIndexes={hiddenColumnIndexes} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-lg font-semibold ${tone.title}`}>{t("suratJalan.table.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ListSortControl sortValue={sortValue} sortOptions={sortOptions} onSortChange={onSortChange} />
          <ColumnSettingsMenu
            columns={columns}
            hiddenColumns={hiddenColumns}
            onHiddenColumnsChange={setHiddenColumns}
          />
        </div>
      </div>

      <form onSubmit={applyDraftFilter}>
        <p className={`mb-2 text-sm font-medium ${tone.subtitle}`}>{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noPo")}
            <DebouncedFilterInput
              value={draftFilter.noPo}
              onValueChange={(value) => updateDraftFilter("noPo", value)}
              placeholder={filterPlaceholder("field.noPo")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noSuratJalan")}
            <DebouncedFilterInput
              value={draftFilter.noSuratJalan}
              onValueChange={(value) => updateDraftFilter("noSuratJalan", value)}
              placeholder={filterPlaceholder("field.noSuratJalan")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaBarang")}
            <DebouncedFilterInput
              value={draftFilter.namaBarang}
              onValueChange={(value) => updateDraftFilter("namaBarang", value)}
              placeholder={filterPlaceholder("field.namaBarang")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.kodeDepartemen")}
            <DebouncedFilterInput
              value={draftFilter.kodeDepartemen}
              onValueChange={(value) => updateDraftFilter("kodeDepartemen", value)}
              placeholder={filterPlaceholder("field.kodeDepartemen")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaCustomer")}
            <DebouncedFilterInput
              value={draftFilter.idCustomer}
              onValueChange={(value) => updateDraftFilter("idCustomer", value)}
              placeholder={filterPlaceholder("field.namaCustomer")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.kendaraan")}
            <DebouncedFilterInput
              value={draftFilter.kendaraan}
              onValueChange={(value) => updateDraftFilter("kendaraan", value)}
              placeholder={filterPlaceholder("field.kendaraan")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>


          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalDari")}
            <AppDateInput
              value={draftFilter.tanggalDari}
              onValueChange={(value) => updateDraftFilter("tanggalDari", value)}
              placeholder={t("common.filter.after", { field: t("field.tanggal") })}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalSampai")}
            <AppDateInput
              value={draftFilter.tanggalSampai}
              onValueChange={(value) => updateDraftFilter("tanggalSampai", value)}
              placeholder={t("common.filter.before", { field: t("field.tanggal") })}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={resetDraftFilter} className={`border px-4 py-2 text-sm ${tone.resetButton}`}>
            {t("common.resetFilter")}
          </button>
          <button type="submit" className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 dark:bg-sky-500 dark:text-slate-950">
            {t("common.applyFilter")}
          </button>
        </div>
      </form>

      <div>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-sky-200 bg-white px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rows.map((row) => {
                const isSelected = selectedId === row.id;
                const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
                const barangText = barangLabel(row.barang);
                const invoiceStatus = getInvoiceStatus(row);

                return (
                  <article
                    key={row.id}
                    className={`rounded-xl border p-4 shadow-sm ${
                      isSelected ? tone.mobileCardSelected : tone.mobileCard
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{row.noSuratJalan || "-"}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTanggal(row.tanggal, locale)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${invoiceStatus.className}`}>
                          {invoiceStatus.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {t(`suratJalan.deliveryStatus.${row.deliveryStatus || "notDelivered"}`)}
                        </span>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.noPo")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.noPo || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.kodeDepartemen")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.kodeDepartemen || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.namaCustomer")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{customerLabel}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.kendaraan")}</dt>
                          <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.kendaraan || "-"}</dd>
                        </div>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.barang")}</dt>
                        <dd className="mt-1 break-words text-slate-700 dark:text-slate-200">{barangText || "-"}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => onSelectRow?.(row)}
                        className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${tone.actionInactive}`}
                      >
                        {t("common.openDetails")}
                      </button>
                      {canExport ? (
                        <button
                          type="button"
                          onClick={() => onExportRow?.(row)}
                          className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${tone.actionInactive}`}
                        >
                          {t("common.export")}
                        </button>
                      ) : null}
                      {canExport && row.noPo ? (
                        <button
                          type="button"
                          onClick={() => onExportNoPo?.(row.noPo)}
                          className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${tone.actionInactive}`}
                        >
                          {t("suratJalan.table.exportNoPoButton")}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={`hidden overflow-hidden rounded-xl border md:block ${tone.groupCard}`}>
              <div className="overflow-x-auto">
                <table className={`w-full min-w-[1080px] table-fixed ${tableText}`}>
                  <colgroup>
                    <col style={{ width: "190px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "230px" }} />
                    <col style={{ width: "340px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "130px" }} />
                  </colgroup>
                  <thead className={`${tone.header} text-left`}>
                    <tr>
                      <th className={`${cellPadding} font-medium`}>{t("common.action")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.noPo")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.noSuratJalan")}</th>
                      <th className={`${cellPadding} font-medium`}>
                        <SortableHeader
                          label={t("field.tanggal")}
                          sortValue={sortValue}
                          ascValue="dateAsc"
                          descValue="dateDesc"
                          onSortChange={onSortChange}
                        />
                      </th>
                      <th className={`${cellPadding} font-medium`}>{t("field.kodeDepartemen")}</th>
                      <th className={`${cellPadding} font-medium`}>
                        <SortableHeader
                          label={t("field.namaCustomer")}
                          sortValue={sortValue}
                          ascValue="nameAsc"
                          descValue="nameDesc"
                          onSortChange={onSortChange}
                        />
                      </th>
                      <th className={`${cellPadding} font-medium`}>{t("field.barang")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.kendaraan")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.statusInvoice")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.deliveryStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {rows.map((row, index) => {
                      const isSelected = selectedId === row.id;
                      const useStripedRow = tableStyle === "striped" && index % 2 === 1;
                      const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
                      const barangText = barangLabel(row.barang);
                      const invoiceStatus = getInvoiceStatus(row);
                      const rowClassName = isSelected
                        ? tone.selectedRow
                        : useStripedRow
                          ? tone.stripedRow
                          : undefined;

                      return (
                        <tr key={row.id} className={rowClassName}>
                          <td className={`whitespace-nowrap ${cellPadding}`}>
                            <div className="flex flex-nowrap items-center gap-1.5">
                              {canExport ? (
                                <button
                                  type="button"
                                  onClick={() => onExportRow?.(row)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tone.actionInactive}`}
                                >
                                  {t("common.export")}
                                </button>
                              ) : null}
                              {canExport && row.noPo ? (
                                <button
                                  type="button"
                                  onClick={() => onExportNoPo?.(row.noPo)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tone.actionInactive}`}
                                >
                                  {t("suratJalan.table.exportNoPoButton")}
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className={`truncate ${cellPadding} font-medium text-slate-800 dark:text-slate-100`} title={row.noPo || "-"}>
                            {row.noPo || "-"}
                          </td>
                          <td className={`truncate ${cellPadding} font-medium`} title={row.noSuratJalan || "-"}>
                            <button
                              type="button"
                              onClick={() => onSelectRow?.(row)}
                              className="truncate text-left font-semibold text-blue-700 hover:underline dark:text-blue-300"
                            >
                              {row.noSuratJalan || "-"}
                            </button>
                          </td>
                          <td className={`truncate ${cellPadding} text-slate-600 dark:text-slate-300`}>
                            {formatTanggal(row.tanggal, locale)}
                          </td>
                          <td className={`truncate ${cellPadding} text-slate-600 dark:text-slate-300`} title={row.kodeDepartemen || "-"}>
                            {row.kodeDepartemen || "-"}
                          </td>
                          <td className={`${cellPadding} text-slate-600 dark:text-slate-300`} title={customerLabel}>
                            <div className={clampedCellClassName}>{customerLabel}</div>
                          </td>
                          <td className={`${cellPadding} text-slate-600 dark:text-slate-300`} title={barangText}>
                            <div className={clampedCellClassName}>{barangText}</div>
                          </td>
                          <td className={`truncate ${cellPadding} text-slate-600 dark:text-slate-300`} title={row.kendaraan || "-"}>{row.kendaraan}</td>
                          <td className={`whitespace-nowrap ${cellPadding}`}>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${invoiceStatus.className}`}>
                              {invoiceStatus.label}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap ${cellPadding}`}>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {t(`suratJalan.deliveryStatus.${row.deliveryStatus || "notDelivered"}`)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
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

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("common.filterResult", { count: filteredCount })}
      </p>
    </section>
  );
}
