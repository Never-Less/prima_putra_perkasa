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
import { useI18n } from "../../_i18n/provider";
import { useFilterDraft } from "../../_hooks/use-filter-draft";
import { MobileFilterPanel } from "../../_components/mobile-filter-panel";
import {
  formatRupiah,
  formatTanggal,
  type PurchaseOrderFilter,
  type PurchaseOrderItem,
  type SalesOrderWorkflowStatus,
} from "../_lib/purchase-order";

type PurchaseOrderTableFilterProps = {
  rows: PurchaseOrderItem[];
  filter: PurchaseOrderFilter;
  filteredCount: number;
  pagination: ServerPaginationMeta;
  selectedId?: string;
  canExport?: boolean;
  sortValue?: string;
  sortOptions?: Array<{ value: string; label: string }>;
  resolveCustomerLabel?: (customerId: string) => string;
  resolveInvoiceLabel?: (invoiceId: string) => string;
  onSelectRow?: (row: PurchaseOrderItem) => void;
  onExportPage?: () => void;
  onSortChange?: (value: string) => void;
  onFilterChange: <K extends keyof PurchaseOrderFilter>(key: K, value: PurchaseOrderFilter[K]) => void;
  onResetFilter: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const clampedCellClassName =
  "truncate";

const workflowStatusClasses: Record<SalesOrderWorkflowStatus, string> = {
  toDeliver: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  partlyDelivered: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  deliveredToBilled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  partlyBilled: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200",
  billed: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  paid: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
};

export function PurchaseOrderTableFilter({
  rows,
  filter,
  filteredCount,
  pagination,
  selectedId,
  canExport = false,
  sortValue,
  sortOptions = [],
  resolveCustomerLabel,
  resolveInvoiceLabel,
  onSelectRow,
  onExportPage,
  onSortChange,
  onFilterChange,
  onResetFilter,
  onPageChange,
  onPageSizeChange,
}: PurchaseOrderTableFilterProps) {
  const { locale, t } = useI18n();
  const { draftFilter, updateDraftFilter, applyDraftFilter, resetDraftFilter } =
    useFilterDraft(filter, onFilterChange, onResetFilter);
  const filterPlaceholder = (fieldKey: string) => t(fieldKey);
  const columns = useMemo(
    () => [
      { key: "noPo", label: t("field.noPo"), index: 1, locked: true },
      { key: "tanggalPo", label: t("field.tanggalPo"), index: 2 },
      { key: "namaCustomer", label: t("field.namaCustomer"), index: 3 },
      { key: "noSuratJalan", label: t("field.noSuratJalan"), index: 4 },
      { key: "tanggalSuratJalan", label: t("field.tanggalSuratJalan"), index: 5 },
      { key: "noInvoice", label: t("field.noInvoice"), index: 6 },
      { key: "tanggalInvoice", label: t("field.tanggalInvoice"), index: 7 },
      { key: "workflowStatus", label: t("field.workflowStatus"), index: 8 },
      { key: "nominalPo", label: t("field.nominalPo"), index: 9 },
    ],
    [t]
  );
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const hiddenColumnIndexes = columns
    .filter((column) => hiddenColumns.includes(column.key))
    .map((column) => column.index);
  const isColumnVisible = (key: string) => !hiddenColumns.includes(key);

  return (
    <section className="ppp-list-view ppp-sales-order-list space-y-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <HiddenColumnStyles scopeClassName="ppp-sales-order-list" hiddenColumnIndexes={hiddenColumnIndexes} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("purchaseOrder.table.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <button
              type="button"
              onClick={onExportPage}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {t("purchaseOrder.exportPage.openButton")}
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
        <MobileFilterPanel label={t("common.filterByField")} labelClassName="text-slate-500 dark:text-slate-400">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.workflowStatus")}
            <select
              value={draftFilter.workflowStatus}
              onChange={(event) =>
                updateDraftFilter(
                  "workflowStatus",
                  event.target.value as PurchaseOrderFilter["workflowStatus"]
                )
              }
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("purchaseOrder.workflowStatus.all")}</option>
              <option value="withoutSuratJalan">
                {t("purchaseOrder.workflowStatus.withoutSuratJalan")}
              </option>
              <option value="readyForInvoice">
                {t("purchaseOrder.workflowStatus.readyForInvoice")}
              </option>
            </select>
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
            {t("field.namaCustomer")}
            <DebouncedFilterInput
              value={draftFilter.namaCustomer}
              onValueChange={(value) => updateDraftFilter("namaCustomer", value)}
              placeholder={filterPlaceholder("field.namaCustomer")}
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
            {t("field.noInvoice")}
            <DebouncedFilterInput
              value={draftFilter.noInvoice}
              onValueChange={(value) => updateDraftFilter("noInvoice", value)}
              placeholder={filterPlaceholder("field.noInvoice")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalPoDari")}
            <AppDateInput
              value={draftFilter.tanggalPoDari}
              onValueChange={(value) => updateDraftFilter("tanggalPoDari", value)}
              placeholder={t("common.filter.after", { field: t("field.tanggalPo") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalPoSampai")}
            <AppDateInput
              value={draftFilter.tanggalPoSampai}
              onValueChange={(value) => updateDraftFilter("tanggalPoSampai", value)}
              placeholder={t("common.filter.before", { field: t("field.tanggalPo") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalInvoiceDari")}
            <AppDateInput
              value={draftFilter.tanggalInvoiceDari}
              onValueChange={(value) => updateDraftFilter("tanggalInvoiceDari", value)}
              placeholder={t("common.filter.after", { field: t("field.tanggalInvoice") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalInvoiceSampai")}
            <AppDateInput
              value={draftFilter.tanggalInvoiceSampai}
              onValueChange={(value) => updateDraftFilter("tanggalInvoiceSampai", value)}
              placeholder={t("common.filter.before", { field: t("field.tanggalInvoice") })}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.nominalPoMin")}
            <DebouncedFilterInput
              type="number"
              min={0}
              value={draftFilter.nominalPoMin}
              onValueChange={(value) => updateDraftFilter("nominalPoMin", value)}
              placeholder={filterPlaceholder("field.nominalPoMin")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.nominalPoMax")}
            <DebouncedFilterInput
              type="number"
              min={0}
              value={draftFilter.nominalPoMax}
              onValueChange={(value) => updateDraftFilter("nominalPoMax", value)}
              placeholder={filterPlaceholder("field.nominalPoMax")}
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
        </MobileFilterPanel>
      </form>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-sky-200 bg-white px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : null}

        {rows.map((row) => {
          const isSelected = selectedId === row.id;
          const customerLabel = resolveCustomerLabel?.(row.namaCustomer) || row.namaCustomer || "-";
          const suratJalanLabel = row.workflow?.suratJalan.map((item) => item.number).join(", ") || "-";
          const suratJalanDateLabel = row.workflow?.suratJalan.map((item) => formatTanggal(item.date, locale)).join(", ") || "-";
          const invoiceLabel = row.workflow?.invoices.map((item) => item.number).join(", ") || resolveInvoiceLabel?.(row.noInvoice) || row.noInvoice || "-";
          const invoiceDateLabel = row.workflow?.invoices.map((item) => formatTanggal(item.date, locale)).join(", ") || formatTanggal(row.tanggalInvoice, locale);
          const workflowStatus = row.workflow?.status || "toDeliver";

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
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{row.noPo || "-"}</p>
                    {isColumnVisible("tanggalPo") ? (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTanggal(row.tanggalPo, locale)}</p>
                    ) : null}
                  </div>
                {isColumnVisible("nominalPo") ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isSelected ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950" : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {formatRupiah(row.nominalPo, locale)}
                </span> : null}
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                {isColumnVisible("namaCustomer") ? <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.namaCustomer")}</dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-200">{customerLabel}</dd>
                </div> : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {isColumnVisible("noSuratJalan") ? <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.noSuratJalan")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{suratJalanLabel}</dd>
                  </div> : null}
                  {isColumnVisible("tanggalSuratJalan") ? <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.tanggalSuratJalan")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{suratJalanDateLabel}</dd>
                  </div> : null}
                  {isColumnVisible("noInvoice") ? <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.noInvoice")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{invoiceLabel}</dd>
                  </div> : null}
                  {isColumnVisible("tanggalInvoice") ? <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.tanggalInvoice")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{invoiceDateLabel}</dd>
                  </div> : null}
                </div>
                {isColumnVisible("workflowStatus") ? <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.workflowStatus")}</dt>
                  <dd className="mt-1"><span className={`rounded-full px-2 py-1 text-xs font-medium ${workflowStatusClasses[workflowStatus]}`}>{t(`salesOrderDashboard.status.${workflowStatus}`)}</span></dd>
                </div> : null}
              </dl>

              <button
                type="button"
                onClick={() => onSelectRow?.(row)}
                className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
              >
                {t("common.openDetails")}
              </button>
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-xl border border-sky-300 bg-white shadow-sm dark:border-sky-900/70 dark:bg-slate-900">
          <table className="w-full min-w-[1420px] table-fixed text-sm">
            <colgroup>
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "240px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "130px" }} />
            </colgroup>
            <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">{t("field.noPo")}</th>
                <th className="px-3 py-2 font-medium">
                  <SortableHeader
                    label={t("field.tanggalPo")}
                    sortValue={sortValue}
                    ascValue="dateAsc"
                    descValue="dateDesc"
                    onSortChange={onSortChange}
                  />
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortableHeader
                    label={t("field.namaCustomer")}
                    sortValue={sortValue}
                    ascValue="nameAsc"
                    descValue="nameDesc"
                    onSortChange={onSortChange}
                  />
                </th>
                <th className="px-3 py-2 font-medium">{t("field.noSuratJalan")}</th>
                <th className="px-3 py-2 font-medium">{t("field.tanggalSuratJalan")}</th>
                <th className="px-3 py-2 font-medium">{t("field.noInvoice")}</th>
                <th className="px-3 py-2 font-medium">{t("field.tanggalInvoice")}</th>
                <th className="px-3 py-2 font-medium">{t("field.workflowStatus")}</th>
                <th className="px-3 py-2 font-medium">
                  <SortableHeader
                    label={t("field.nominalPo")}
                    sortValue={sortValue}
                    ascValue="amountAsc"
                    descValue="amountDesc"
                    onSortChange={onSortChange}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => {
                const isSelected = selectedId === row.id;
                const customerLabel = resolveCustomerLabel?.(row.namaCustomer) || row.namaCustomer || "-";
                const suratJalanNumbers = row.workflow?.suratJalan.map((item) => item.number).join(", ") || "-";
                const suratJalanDates = row.workflow?.suratJalan.map((item) => formatTanggal(item.date, locale)).join(", ") || "-";
                const invoiceNumbers = row.workflow?.invoices.map((item) => item.number).join(", ") || resolveInvoiceLabel?.(row.noInvoice) || row.noInvoice || "-";
                const invoiceDates = row.workflow?.invoices.map((item) => formatTanggal(item.date, locale)).join(", ") || formatTanggal(row.tanggalInvoice, locale);
                const workflowStatus = row.workflow?.status || "toDeliver";

                return (
                  <tr
                    key={row.id}
                    className={isSelected ? "bg-sky-100 dark:bg-sky-950/40" : index % 2 ? "bg-sky-50/70 dark:bg-slate-950/40" : undefined}
                  >
                    <td className="truncate px-3 py-2 font-medium" title={row.noPo || "-"}>
                      <button
                        type="button"
                        onClick={() => onSelectRow?.(row)}
                        className="truncate text-left font-semibold text-blue-700 hover:underline dark:text-blue-300"
                      >
                        {row.noPo || "-"}
                      </button>
                    </td>
                    <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggalPo, locale)}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={customerLabel}>
                      <div className={clampedCellClassName}>{customerLabel}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={suratJalanNumbers}><div className={clampedCellClassName}>{suratJalanNumbers}</div></td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={suratJalanDates}><div className={clampedCellClassName}>{suratJalanDates}</div></td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={invoiceNumbers}><div className={clampedCellClassName}>{invoiceNumbers}</div></td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={invoiceDates}><div className={clampedCellClassName}>{invoiceDates}</div></td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-medium ${workflowStatusClasses[workflowStatus]}`}>{t(`salesOrderDashboard.status.${workflowStatus}`)}</span></td>
                    <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300">{formatRupiah(row.nominalPo, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
