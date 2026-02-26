"use client";

import { useEffect, useMemo, useState } from "react";
import {
  barangRowsToList,
  ensureTrailingEmptyBarangRow,
  formatTanggal,
  toFormState,
  type SuratJalanBarangFormRow,
  type SuratJalanFormState,
  type SuratJalanItem,
} from "../_lib/surat-jalan";
import { customerNameOptions } from "../../customer/_lib/customer";
import { useI18n } from "../../_i18n/provider";

type ColorTone = "slate" | "sky" | "emerald";
type FormStyle = "default" | "outlined" | "soft";

type SuratJalanEditFormProps = {
  item: SuratJalanItem;
  title: string;
  description: string;
  showPreview: boolean;
  colorTone?: ColorTone;
  formStyle?: FormStyle;
};

const toneStyles: Record<
  ColorTone,
  {
    section: string;
    title: string;
    subtitle: string;
    primaryButton: string;
    resetButton: string;
    label: string;
  }
> = {
  slate: {
    section: "border-slate-200 bg-white",
    title: "text-slate-900",
    subtitle: "text-slate-600",
    primaryButton: "bg-slate-900 text-white hover:bg-slate-700",
    resetButton: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
    label: "text-slate-700",
  },
  sky: {
    section: "border-sky-200 bg-sky-50/40",
    title: "text-sky-900",
    subtitle: "text-sky-800",
    primaryButton: "bg-sky-700 text-white hover:bg-sky-600",
    resetButton: "border border-sky-300 bg-white text-sky-700 hover:bg-sky-50",
    label: "text-sky-800",
  },
  emerald: {
    section: "border-emerald-200 bg-emerald-50/40",
    title: "text-emerald-900",
    subtitle: "text-emerald-800",
    primaryButton: "bg-emerald-700 text-white hover:bg-emerald-600",
    resetButton: "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
    label: "text-emerald-800",
  },
};

const formStyles: Record<
  FormStyle,
  {
    formCard: string;
    previewCard: string;
    previewBarangBox: string;
    input: string;
  }
> = {
  default: {
    formCard: "rounded-xl border border-slate-200 bg-slate-50 p-4",
    previewCard: "rounded-xl border border-slate-200 bg-white p-4",
    previewBarangBox: "rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3",
    input: "border border-slate-300 bg-white",
  },
  outlined: {
    formCard: "rounded-xl border-2 border-dashed border-slate-300 bg-white p-4",
    previewCard: "rounded-xl border-2 border-dashed border-slate-300 bg-white p-4",
    previewBarangBox: "rounded-lg border-2 border-dashed border-slate-300 bg-white p-3",
    input: "border-2 border-slate-300 bg-white",
  },
  soft: {
    formCard: "rounded-xl border border-transparent bg-slate-100/80 p-4",
    previewCard: "rounded-xl border border-transparent bg-slate-100/70 p-4",
    previewBarangBox: "rounded-lg border border-transparent bg-white p-3 shadow-sm",
    input: "border border-transparent bg-white shadow-sm",
  },
};

export function SuratJalanEditForm({
  item,
  title,
  description,
  showPreview,
  colorTone = "slate",
  formStyle = "default",
}: SuratJalanEditFormProps) {
  const { locale, t } = useI18n();
  const [form, setForm] = useState<SuratJalanFormState>(() => toFormState(item));
  const tone = toneStyles[colorTone];
  const style = formStyles[formStyle];
  const inputClassName = `mt-1 w-full rounded-lg px-3 py-2 text-sm ${style.input}`;
  const barangInputClassName = `w-full rounded-lg px-3 py-2 text-sm ${style.input}`;

  useEffect(() => {
    setForm(toFormState(item));
  }, [item]);

  const previewBarang = useMemo(() => barangRowsToList(form.barangRows), [form.barangRows]);
  const customerOptions = useMemo(() => {
    const options = customerNameOptions.filter(Boolean);

    if (form.idCustomer && !options.includes(form.idCustomer)) {
      return [form.idCustomer, ...options];
    }

    return options;
  }, [form.idCustomer]);

  function updateBarangRow(index: number, field: keyof SuratJalanBarangFormRow, value: string) {
    setForm((prev) => {
      const nextRows = prev.barangRows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      });

      return {
        ...prev,
        barangRows: ensureTrailingEmptyBarangRow(nextRows),
      };
    });
  }

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${tone.section}`}>
      <div className="mb-3">
        <h2 className={`text-lg font-semibold ${tone.title}`}>{title}</h2>
        <p className={`text-sm ${tone.subtitle}`}>{description}</p>
      </div>

      <div className={showPreview ? "grid gap-4 lg:grid-cols-2" : "block"}>
        <div className={style.formCard}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`text-sm ${tone.label}`}>
              {t("field.noSuratJalan")}
              <input
                value={form.noSuratJalan}
                onChange={(event) => setForm((prev) => ({ ...prev, noSuratJalan: event.target.value }))}
                className={inputClassName}
              />
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.noPo")}
              <input
                value={form.noPo}
                onChange={(event) => setForm((prev) => ({ ...prev, noPo: event.target.value }))}
                className={inputClassName}
              />
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.tanggal")}
              <input
                type="date"
                value={form.tanggal}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggal: event.target.value }))}
                className={inputClassName}
              />
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.kendaraan")}
              <input
                value={form.kendaraan}
                onChange={(event) => setForm((prev) => ({ ...prev, kendaraan: event.target.value }))}
                className={inputClassName}
              />
            </label>

            <label className={`text-sm sm:col-span-2 ${tone.label}`}>
              {t("field.namaCustomer")}
              <select
                value={form.idCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, idCustomer: event.target.value }))}
                className={inputClassName}
              >
                {customerOptions.map((customerName) => (
                  <option key={customerName} value={customerName}>
                    {customerName}
                  </option>
                ))}
              </select>
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.tipe")}
              <select
                value={form.tipe}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    tipe: event.target.value as SuratJalanFormState["tipe"],
                  }))
                }
                className={inputClassName}
              >
                <option value="partial">partial</option>
                <option value="non partial">non partial</option>
              </select>
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.sudahSelesai")}
              <select
                value={String(form.sudahSelesai)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sudahSelesai: event.target.value === "true",
                  }))
                }
                className={inputClassName}
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <div className={`text-sm sm:col-span-2 ${tone.label}`}>
              <p>{t("suratJalan.form.items.title")}</p>
              <p className="text-xs text-slate-500">{t("suratJalan.form.items.hint")}</p>
              <div className="mt-2 space-y-2">
                {form.barangRows.map((row, index) => (
                  <div key={`barang-row-${index}`} className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
                    <input
                      type="text"
                      value={row.nama}
                      placeholder={t("suratJalan.form.items.placeholder.name")}
                      onChange={(event) => updateBarangRow(index, "nama", event.target.value)}
                      className={barangInputClassName}
                    />
                    <input
                      type="number"
                      min={0}
                      value={row.jumlah}
                      placeholder={t("suratJalan.form.items.placeholder.qty")}
                      onChange={(event) => updateBarangRow(index, "jumlah", event.target.value)}
                      className={barangInputClassName}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button className={`rounded-lg px-4 py-2 text-sm font-medium ${tone.primaryButton}`}>
              {t("common.saveChanges")}
            </button>
            <button
              onClick={() => setForm(toFormState(item))}
              className={`rounded-lg px-4 py-2 text-sm ${tone.resetButton}`}
            >
              {t("common.resetForm")}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className={style.previewCard}>
            <p className="text-sm font-semibold text-slate-900">{t("suratJalan.preview.title")}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>
                <span className="text-slate-500">{t("field.noSuratJalan")}:</span> {form.noSuratJalan || "-"}
              </p>
              <p>
                <span className="text-slate-500">{t("field.noPo")}:</span> {form.noPo || "-"}
              </p>
              <p>
                <span className="text-slate-500">{t("field.tanggal")}:</span> {formatTanggal(form.tanggal, locale)}
              </p>
              <p>
                <span className="text-slate-500">{t("field.namaCustomer")}:</span> {form.idCustomer || "-"}
              </p>
              <p>
                <span className="text-slate-500">{t("field.kendaraan")}:</span> {form.kendaraan || "-"}
              </p>
              <p>
                <span className="text-slate-500">{t("field.tipe")}:</span> {form.tipe}
              </p>
              <p>
                <span className="text-slate-500">{t("field.sudahSelesai")}:</span> {String(form.sudahSelesai)}
              </p>
            </div>

            <div className={`mt-3 ${style.previewBarangBox}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                {t("field.barang")}
              </p>
              {previewBarang.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-700">
                  {previewBarang.map((barang) => (
                    <li key={`${barang.nama}-${barang.jumlah}`}>{barang.nama}: {barang.jumlah}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">{t("common.noItems")}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
