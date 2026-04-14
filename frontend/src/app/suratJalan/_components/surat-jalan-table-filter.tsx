"use client";

import { useMemo, useState } from "react";
import {
  barangLabel,
  defaultSuratJalanFilter,
  filterSuratJalanRows,
  formatTanggal,
  type SuratJalanFilter,
  type SuratJalanItem,
} from "../_lib/surat-jalan";
import { useI18n } from "../../_i18n/provider";

type ColorTone = "slate" | "sky" | "emerald";
type TableStyle = "default" | "striped" | "compact";

type SuratJalanTableFilterProps = {
  rows: SuratJalanItem[];
  selectedId?: string;
  onSelectRow?: (row: SuratJalanItem) => void;
  onExportRow?: (row: SuratJalanItem) => void;
  resolveCustomerLabel?: (customerId: string) => string;
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

function escapeCsvValue(value: string) {
  const text = String(value || "");

  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, "\"\"")}"`;
}

function sanitizeFileName(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "surat-jalan-export";
}

const clampedCellClassName =
  "overflow-hidden break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

export function SuratJalanTableFilter({
  rows,
  selectedId,
  onSelectRow,
  onExportRow,
  resolveCustomerLabel,
  colorTone = "slate",
  tableStyle = "default",
}: SuratJalanTableFilterProps) {
  const { locale, t } = useI18n();
  const [filters, setFilters] = useState<SuratJalanFilter>(defaultSuratJalanFilter);
  const tone = toneStyles[colorTone];
  const cellPadding = tableStyle === "compact" ? "px-2 py-1.5" : "px-3 py-2";
  const tableText = tableStyle === "compact" ? "text-xs" : "text-sm";

  const filteredRows = useMemo(
    () => filterSuratJalanRows(rows, filters, resolveCustomerLabel),
    [filters, resolveCustomerLabel, rows]
  );
  const groupedRows = useMemo(() => {
    const groupMap = new Map<string, SuratJalanItem[]>();

    filteredRows.forEach((row) => {
      const key = row.noPo || "-";
      const existingRows = groupMap.get(key);

      if (existingRows) {
        existingRows.push(row);
        return;
      }

      groupMap.set(key, [row]);
    });

    return Array.from(groupMap.entries()).map(([noPo, items]) => ({
      noPo,
      items,
    }));
  }, [filteredRows]);

  function exportRowsAsCsv(items: SuratJalanItem[], fileNameBase: string) {
    if (typeof window === "undefined" || items.length === 0) {
      return;
    }

    const header = [
      "noSuratJalan",
      "noPo",
      "kodeDepartemen",
      "tanggal",
      "namaCustomer",
      "kendaraan",
      "tipe",
      "barang",
    ];
    const lines = [header.map(escapeCsvValue).join(",")];

    items.forEach((row) => {
      const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
      const csvRow = [
        row.noSuratJalan,
        row.noPo,
        row.kodeDepartemen,
        formatTanggal(row.tanggal, locale),
        customerLabel,
        row.kendaraan,
        row.tipe,
        barangLabel(row.barang),
      ];

      lines.push(csvRow.map(escapeCsvValue).join(","));
    });

    const csvContent = `\uFEFF${lines.join("\r\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = `${sanitizeFileName(fileNameBase)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
  }

  return (
    <section className={`space-y-4 rounded-2xl border p-5 shadow-sm ${tone.section}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-lg font-semibold ${tone.title}`}>{t("suratJalan.table.title")}</h2>
        <button
          type="button"
          onClick={() => setFilters(defaultSuratJalanFilter)}
          className={`rounded-lg px-3 py-2 text-sm ${tone.resetButton}`}
        >
          {t("common.resetFilter")}
        </button>
      </div>

      <div>
        <p className={`mb-2 text-sm font-medium ${tone.subtitle}`}>{t("common.filterByField")}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noSuratJalan")}
            <input
              value={filters.noSuratJalan}
              onChange={(event) => setFilters((prev) => ({ ...prev, noSuratJalan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.noPo")}
            <input
              value={filters.noPo}
              onChange={(event) => setFilters((prev) => ({ ...prev, noPo: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.kodeDepartemen")}
            <input
              value={filters.kodeDepartemen}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, kodeDepartemen: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaCustomer")}
            <input
              value={filters.idCustomer}
              onChange={(event) => setFilters((prev) => ({ ...prev, idCustomer: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.kendaraan")}
            <input
              value={filters.kendaraan}
              onChange={(event) => setFilters((prev) => ({ ...prev, kendaraan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tipe")}
            <select
              value={filters.tipe}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  tipe: event.target.value as SuratJalanFilter["tipe"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("common.all")}</option>
              <option value="partial">partial</option>
              <option value="non partial">non partial</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalDari")}
            <input
              type="date"
              value={filters.tanggalDari}
              onChange={(event) => setFilters((prev) => ({ ...prev, tanggalDari: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tanggalSampai")}
            <input
              type="date"
              value={filters.tanggalSampai}
              onChange={(event) => setFilters((prev) => ({ ...prev, tanggalSampai: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {groupedRows.map((group) => (
          <div key={group.noPo} className={`overflow-hidden rounded-xl border ${tone.groupCard}`}>
            <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${tone.groupHeader}`}>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("field.noPo")}: {group.noPo}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t("common.totalData", { count: group.items.length })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    exportRowsAsCsv(
                      rows.filter((row) => row.noPo === group.noPo),
                      `surat-jalan-${group.noPo}`
                    )
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tone.actionInactive}`}
                >
                  {t("suratJalan.table.exportNoPoButton")}
                </button>
              </div>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {group.items.map((row) => {
                const isSelected = selectedId === row.id;
                const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
                const barangText = barangLabel(row.barang);

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
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isSelected ? tone.actionActive : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {row.tipe}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
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

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onSelectRow?.(row)}
                        className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${
                          isSelected ? tone.actionActive : tone.actionInactive
                        }`}
                      >
                        {isSelected ? t("common.selected") : t("common.selectRow")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onExportRow?.(row)}
                        className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${tone.actionInactive}`}
                      >
                        {t("common.export")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className={`min-w-[1370px] table-fixed ${tableText}`}>
                  <colgroup>
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "230px" }} />
                    <col style={{ width: "340px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "180px" }} />
                  </colgroup>
                  <thead className={`${tone.header} text-left`}>
                    <tr>
                      <th className={`${cellPadding} font-medium`}>{t("field.noSuratJalan")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.tanggal")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.kodeDepartemen")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.namaCustomer")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.barang")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.kendaraan")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("field.tipe")}</th>
                      <th className={`${cellPadding} font-medium`}>{t("common.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {group.items.map((row, index) => {
                      const isSelected = selectedId === row.id;
                      const useStripedRow = tableStyle === "striped" && index % 2 === 1;
                      const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
                      const barangText = barangLabel(row.barang);
                      const rowClassName = isSelected
                        ? tone.selectedRow
                        : useStripedRow
                          ? tone.stripedRow
                          : undefined;

                      return (
                        <tr key={row.id} className={rowClassName}>
                          <td className={`whitespace-nowrap ${cellPadding} font-medium text-slate-800 dark:text-slate-100`}>
                            {row.noSuratJalan}
                          </td>
                          <td className={`whitespace-nowrap ${cellPadding} text-slate-600 dark:text-slate-300`}>
                            {formatTanggal(row.tanggal, locale)}
                          </td>
                          <td className={`whitespace-nowrap ${cellPadding} text-slate-600 dark:text-slate-300`}>
                            {row.kodeDepartemen || "-"}
                          </td>
                          <td className={`${cellPadding} text-slate-600 dark:text-slate-300`} title={customerLabel}>
                            <div className={clampedCellClassName}>{customerLabel}</div>
                          </td>
                          <td className={`${cellPadding} text-slate-600 dark:text-slate-300`} title={barangText}>
                            <div className={clampedCellClassName}>{barangText}</div>
                          </td>
                          <td className={`whitespace-nowrap ${cellPadding} text-slate-600 dark:text-slate-300`}>{row.kendaraan}</td>
                          <td className={`whitespace-nowrap ${cellPadding} text-slate-600 dark:text-slate-300`}>{row.tipe}</td>
                          <td className={`whitespace-nowrap ${cellPadding}`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectRow?.(row)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                  isSelected ? tone.actionActive : tone.actionInactive
                                }`}
                              >
                                {isSelected ? t("common.selected") : t("common.selectRow")}
                              </button>
                              <button
                                type="button"
                                onClick={() => onExportRow?.(row)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tone.actionInactive}`}
                              >
                                {t("common.export")}
                              </button>
                            </div>
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

      <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.filterResult", { count: filteredRows.length })}</p>
    </section>
  );
}
