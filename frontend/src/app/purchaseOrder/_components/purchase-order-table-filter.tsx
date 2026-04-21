"use client";

import { PaginationControls } from "../../_components/pagination-controls";
import { type ServerPaginationMeta } from "../../_lib/pagination";
import { useI18n } from "../../_i18n/provider";
import {
  formatRupiah,
  formatTanggal,
  type PurchaseOrderFilter,
  type PurchaseOrderItem,
} from "../_lib/purchase-order";

type PurchaseOrderTableFilterProps = {
  rows: PurchaseOrderItem[];
  filter: PurchaseOrderFilter;
  filteredCount: number;
  pagination: ServerPaginationMeta;
  selectedId?: string;
  canExport?: boolean;
  resolveCustomerLabel?: (customerId: string) => string;
  resolveInvoiceLabel?: (invoiceId: string) => string;
  onSelectRow?: (row: PurchaseOrderItem) => void;
  onExportPage?: () => void;
  onFilterChange: <K extends keyof PurchaseOrderFilter>(key: K, value: PurchaseOrderFilter[K]) => void;
  onResetFilter: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const clampedCellClassName =
  "overflow-hidden break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

export function PurchaseOrderTableFilter({
  rows,
  filter,
  filteredCount,
  pagination,
  selectedId,
  canExport = false,
  resolveCustomerLabel,
  resolveInvoiceLabel,
  onSelectRow,
  onExportPage,
  onFilterChange,
  onResetFilter,
  onPageChange,
  onPageSizeChange,
}: PurchaseOrderTableFilterProps) {
  const { locale, t } = useI18n();
  const filterPlaceholder = (fieldKey: string) =>
    t("common.placeholder.filter", { field: t(fieldKey) });
  const paidLabel = t("purchaseOrder.status.paid");
  const unpaidLabel = t("purchaseOrder.status.unpaid");

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("purchaseOrder.table.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <button
              type="button"
              onClick={onExportPage}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
            >
              {t("purchaseOrder.exportPage.openButton")}
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
            {t("field.noPo")}
            <input
              value={filter.noPo}
              onChange={(event) => onFilterChange("noPo", event.target.value)}
              placeholder={filterPlaceholder("field.noPo")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaCustomer")}
            <input
              value={filter.namaCustomer}
              onChange={(event) => onFilterChange("namaCustomer", event.target.value)}
              placeholder={filterPlaceholder("field.namaCustomer")}
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
            {t("field.isPaid")}
            <select
              value={filter.isPaid}
              onChange={(event) => onFilterChange("isPaid", event.target.value as PurchaseOrderFilter["isPaid"])}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{paidLabel}</option>
              <option value="false">{unpaidLabel}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalPoDari")}
            <input
              type="date"
              value={filter.tanggalPoDari}
              onChange={(event) => onFilterChange("tanggalPoDari", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalPoSampai")}
            <input
              type="date"
              value={filter.tanggalPoSampai}
              onChange={(event) => onFilterChange("tanggalPoSampai", event.target.value)}
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
            {t("field.tanggalKirimDari")}
            <input
              type="date"
              value={filter.tanggalKirimDari}
              onChange={(event) => onFilterChange("tanggalKirimDari", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalKirimSampai")}
            <input
              type="date"
              value={filter.tanggalKirimSampai}
              onChange={(event) => onFilterChange("tanggalKirimSampai", event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.nominalPoMin")}
            <input
              type="number"
              min={0}
              value={filter.nominalPoMin}
              onChange={(event) => onFilterChange("nominalPoMin", event.target.value)}
              placeholder={filterPlaceholder("field.nominalPoMin")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.nominalPoMax")}
            <input
              type="number"
              min={0}
              value={filter.nominalPoMax}
              onChange={(event) => onFilterChange("nominalPoMax", event.target.value)}
              placeholder={filterPlaceholder("field.nominalPoMax")}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-sky-200 bg-white px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : null}

        {rows.map((row) => {
          const isSelected = selectedId === row.id;
          const customerLabel = resolveCustomerLabel?.(row.namaCustomer) || row.namaCustomer || "-";
          const invoiceLabel = resolveInvoiceLabel?.(row.noInvoice) || row.noInvoice || "-";

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
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTanggal(row.tanggalPo, locale)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isSelected ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950" : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {formatRupiah(row.nominalPo, locale)}
                </span>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.namaCustomer")}</dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-200">{customerLabel}</dd>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.isPaid")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{row.isPaid ? paidLabel : unpaidLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.noInvoice")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{invoiceLabel}</dd>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.tanggalBayar")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatTanggal(row.tanggalBayar, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{t("field.tanggalKirim")}</dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatTanggal(row.tanggalKirim, locale)}</dd>
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
        <div className="overflow-x-auto rounded-xl border border-sky-300 bg-white shadow-sm dark:border-sky-900/70 dark:bg-slate-900">
          <table className="min-w-[1100px] table-fixed text-sm">
            <colgroup>
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "240px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "110px" }} />
            </colgroup>
            <thead className="bg-sky-800 text-left text-white dark:bg-sky-950">
              <tr>
                <th className="px-3 py-2 font-medium">{t("field.noPo")}</th>
                <th className="px-3 py-2 font-medium">{t("field.tanggalPo")}</th>
                <th className="px-3 py-2 font-medium">{t("field.namaCustomer")}</th>
                <th className="px-3 py-2 font-medium">{t("field.nominalPo")}</th>
                <th className="px-3 py-2 font-medium">{t("field.isPaid")}</th>
                <th className="px-3 py-2 font-medium">{t("field.tanggalBayar")}</th>
                <th className="px-3 py-2 font-medium">{t("field.tanggalKirim")}</th>
                <th className="px-3 py-2 font-medium">{t("field.noInvoice")}</th>
                <th className="px-3 py-2 font-medium">{t("common.action")}</th>
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
                const invoiceLabel = resolveInvoiceLabel?.(row.noInvoice) || row.noInvoice || "-";

                return (
                  <tr
                    key={row.id}
                    className={isSelected ? "bg-sky-100 dark:bg-sky-950/40" : index % 2 ? "bg-sky-50/70 dark:bg-slate-950/40" : undefined}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{row.noPo || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggalPo, locale)}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={customerLabel}>
                      <div className={clampedCellClassName}>{customerLabel}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatRupiah(row.nominalPo, locale)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{row.isPaid ? paidLabel : unpaidLabel}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggalBayar, locale)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggalKirim, locale)}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300" title={invoiceLabel}>
                      <div className={clampedCellClassName}>{invoiceLabel}</div>
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
