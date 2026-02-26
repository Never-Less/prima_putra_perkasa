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

export function SuratJalanTableFilter({
  rows,
  selectedId,
  onSelectRow,
  colorTone = "slate",
  tableStyle = "default",
}: SuratJalanTableFilterProps) {
  const { locale, t } = useI18n();
  const [filters, setFilters] = useState<SuratJalanFilter>(defaultSuratJalanFilter);
  const tone = toneStyles[colorTone];
  const cellPadding = tableStyle === "compact" ? "px-2 py-1.5" : "px-3 py-2";
  const tableText = tableStyle === "compact" ? "text-xs" : "text-sm";

  const filteredRows = useMemo(() => filterSuratJalanRows(rows, filters), [filters, rows]);
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

  return (
    <section className={`space-y-4 rounded-2xl border p-5 shadow-sm ${tone.section}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-lg font-semibold ${tone.title}`}>{t("suratJalan.table.title")}</h2>
        <button
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
            {t("field.sudahSelesai")}
            <select
              value={filters.sudahSelesai}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  sudahSelesai: event.target.value as SuratJalanFilter["sudahSelesai"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
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
              <span className="text-xs text-slate-500">{t("common.totalData", { count: group.items.length })}</span>
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
                    <th className={`${cellPadding} font-medium`}>{t("field.sudahSelesai")}</th>
                    <th className={`${cellPadding} font-medium`}>{t("common.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {group.items.map((row, index) => {
                    const isSelected = selectedId === row.id;
                    const useStripedRow = tableStyle === "striped" && index % 2 === 1;
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
                        <td className={`whitespace-nowrap ${cellPadding} text-slate-600`}>{row.idCustomer}</td>
                        <td className={`${cellPadding} text-slate-600`}>{barangLabel(row.barang)}</td>
                        <td className={`whitespace-nowrap ${cellPadding} text-slate-600`}>{row.kendaraan}</td>
                        <td className={`whitespace-nowrap ${cellPadding} text-slate-600`}>{row.tipe}</td>
                        <td className={`whitespace-nowrap ${cellPadding}`}>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              row.sudahSelesai ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {row.sudahSelesai ? t("common.true") : t("common.false")}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap ${cellPadding}`}>
                          <button
                            onClick={() => onSelectRow?.(row)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              isSelected ? tone.actionActive : tone.actionInactive
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
        ))}
      </div>

      <p className="text-sm text-slate-500">{t("common.filterResult", { count: filteredRows.length })}</p>
    </section>
  );
}
