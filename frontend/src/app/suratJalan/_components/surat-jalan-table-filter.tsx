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
    header: string;
    selectedRow: string;
    stripedRow: string;
    actionActive: string;
    actionInactive: string;
    resetButton: string;
  }
> = {
  slate: {
    section: "border-slate-200 bg-white",
    title: "text-slate-900",
    subtitle: "text-slate-700",
    header: "bg-slate-100 text-slate-600",
    selectedRow: "bg-slate-100",
    stripedRow: "bg-slate-50",
    actionActive: "bg-slate-900 text-white",
    actionInactive: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    resetButton: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
  sky: {
    section: "border-sky-200 bg-sky-50/40",
    title: "text-sky-900",
    subtitle: "text-sky-800",
    header: "bg-sky-100 text-sky-800",
    selectedRow: "bg-sky-100",
    stripedRow: "bg-sky-50/70",
    actionActive: "bg-sky-700 text-white",
    actionInactive: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
    resetButton: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
  },
  emerald: {
    section: "border-emerald-200 bg-emerald-50/40",
    title: "text-emerald-900",
    subtitle: "text-emerald-800",
    header: "bg-emerald-100 text-emerald-800",
    selectedRow: "bg-emerald-100",
    stripedRow: "bg-emerald-50/70",
    actionActive: "bg-emerald-700 text-white",
    actionInactive: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    resetButton: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
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

function truncateText(value: string, maxLength = 70) {
  const text = String(value || "");

  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= 3) {
    return ".".repeat(Math.max(0, maxLength));
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

export function SuratJalanTableFilter({
  rows,
  selectedId,
  onSelectRow,
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
          <label className="text-sm text-slate-700">
            {t("field.noSuratJalan")}
            <input
              value={filters.noSuratJalan}
              onChange={(event) => setFilters((prev) => ({ ...prev, noSuratJalan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.noPo")}
            <input
              value={filters.noPo}
              onChange={(event) => setFilters((prev) => ({ ...prev, noPo: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.namaCustomer")}
            <input
              value={filters.idCustomer}
              onChange={(event) => setFilters((prev) => ({ ...prev, idCustomer: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.kendaraan")}
            <input
              value={filters.kendaraan}
              onChange={(event) => setFilters((prev) => ({ ...prev, kendaraan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.tipe")}
            <select
              value={filters.tipe}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  tipe: event.target.value as SuratJalanFilter["tipe"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="partial">partial</option>
              <option value="non partial">non partial</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            {t("field.tanggalDari")}
            <input
              type="date"
              value={filters.tanggalDari}
              onChange={(event) => setFilters((prev) => ({ ...prev, tanggalDari: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.tanggalSampai")}
            <input
              type="date"
              value={filters.tanggalSampai}
              onChange={(event) => setFilters((prev) => ({ ...prev, tanggalSampai: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {groupedRows.map((group) => (
          <div key={group.noPo} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">
                {t("field.noPo")}: {group.noPo}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">
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

            <div className="overflow-x-auto">
              <table className={`min-w-full ${tableText}`}>
                <thead className={`${tone.header} text-left`}>
                  <tr>
                    <th className={`${cellPadding} font-medium`}>{t("field.noSuratJalan")}</th>
                    <th className={`${cellPadding} font-medium`}>{t("field.tanggal")}</th>
                    <th className={`${cellPadding} font-medium`}>{t("field.namaCustomer")}</th>
                    <th className={`${cellPadding} font-medium`}>{t("field.barang")}</th>
                    <th className={`${cellPadding} font-medium`}>{t("field.kendaraan")}</th>
                    <th className={`${cellPadding} font-medium`}>{t("field.tipe")}</th>
                    <th className={`${cellPadding} font-medium`}>{t("common.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {group.items.map((row, index) => {
                    const isSelected = selectedId === row.id;
                    const useStripedRow = tableStyle === "striped" && index % 2 === 1;
                    const customerLabel = resolveCustomerLabel?.(row.idCustomer) || row.idCustomer || "-";
                    const barangText = barangLabel(row.barang);
                    const truncatedBarangText = truncateText(barangText);
                    const rowClassName = isSelected
                      ? tone.selectedRow
                      : useStripedRow
                        ? tone.stripedRow
                        : undefined;

                    return (
                      <tr key={row.id} className={rowClassName}>
                        <td className={`whitespace-nowrap ${cellPadding} font-medium text-slate-800`}>
                          {row.noSuratJalan}
                        </td>
                        <td className={`whitespace-nowrap ${cellPadding} text-slate-600`}>
                          {formatTanggal(row.tanggal, locale)}
                        </td>
                        <td className={`whitespace-nowrap ${cellPadding} text-slate-600`}>{customerLabel}</td>
                        <td className={`${cellPadding} text-slate-600`} title={barangText}>
                          {truncatedBarangText}
                        </td>
                        <td className={`whitespace-nowrap ${cellPadding} text-slate-600`}>{row.kendaraan}</td>
                        <td className={`whitespace-nowrap ${cellPadding} text-slate-600`}>{row.tipe}</td>
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
                              onClick={() => exportRowsAsCsv([row], `surat-jalan-${row.noSuratJalan}`)}
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
        ))}
      </div>

      <p className="text-sm text-slate-500">{t("common.filterResult", { count: filteredRows.length })}</p>
    </section>
  );
}
