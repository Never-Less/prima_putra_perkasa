"use client";

import { useMemo, useState } from "react";
import Select from "react-select";
import type { SingleValue, StylesConfig } from "react-select";
import { AppDateInput } from "../../_components/app-date-input";
import {
  barangRowsToList,
  createEmptyBarangRow,
  ensureTrailingEmptyBarangRow,
  formatTanggal,
  toFormState,
  type SuratJalanBarangFormRow,
  type SuratJalanFormState,
  type SuratJalanItem,
} from "../_lib/surat-jalan";
import { useI18n } from "../../_i18n/provider";
import { useTheme } from "../../_theme/provider";

type ColorTone = "slate" | "sky" | "emerald";
type FormStyle = "default" | "outlined" | "soft";
type NoPoSelectOption = {
  value: string;
  label: string;
};

type SuratJalanEditFormProps = {
  item?: SuratJalanItem;
  onNewData?: () => void;
  customerOptions?: Array<{ id: string; nama: string }>;
  noPoOptions?: string[];
  noPoCustomerMap?: Record<string, string>;
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onSave?: (form: SuratJalanFormState, selectedItem?: SuratJalanItem) => Promise<void> | void;
  onDelete?: (selectedItem: SuratJalanItem) => Promise<void> | void;
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
    section: "border-sky-200 bg-sky-50/40 dark:border-slate-800 dark:bg-slate-950/85",
    title: "text-sky-900 dark:text-slate-100",
    subtitle: "text-sky-800 dark:text-slate-300",
    primaryButton: "bg-sky-700 text-white hover:bg-sky-600 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400",
    resetButton: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
    label: "text-sky-800 dark:text-slate-200",
  },
  sky: {
    section: "border-sky-200 bg-sky-50/40 dark:border-sky-900/70 dark:bg-slate-950/85",
    title: "text-sky-900 dark:text-sky-100",
    subtitle: "text-sky-800 dark:text-sky-200",
    primaryButton: "bg-sky-700 text-white hover:bg-sky-600 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400",
    resetButton: "border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800",
    label: "text-sky-800 dark:text-sky-200",
  },
  emerald: {
    section: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-slate-950/85",
    title: "text-emerald-900 dark:text-emerald-100",
    subtitle: "text-emerald-800 dark:text-emerald-200",
    primaryButton: "bg-emerald-700 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400",
    resetButton: "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800",
    label: "text-emerald-800 dark:text-emerald-200",
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
    formCard: "rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70",
    previewCard: "rounded-xl border border-sky-100 bg-sky-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/60",
    previewBarangBox: "rounded-lg border border-sky-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900",
    input: "border border-sky-100 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
  },
  outlined: {
    formCard: "rounded-xl border-2 border-dashed border-sky-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70",
    previewCard: "rounded-xl border-2 border-dashed border-sky-200 bg-sky-100/45 p-4 dark:border-slate-700 dark:bg-slate-900/60",
    previewBarangBox: "rounded-lg border-2 border-dashed border-sky-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900",
    input: "border-2 border-sky-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
  },
  soft: {
    formCard: "rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70",
    previewCard: "rounded-xl border border-sky-100 bg-sky-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/60",
    previewBarangBox: "rounded-lg border border-sky-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800",
    input: "border border-sky-100 bg-white shadow-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
  },
};

function createEmptySuratJalanFormState(): SuratJalanFormState {
  return {
    noSuratJalan: "",
    noPo: "",
    kodeDepartemen: "",
    tanggal: "",
    idCustomer: "",
    kendaraan: "",
    tipe: "partial",
    barangRows: ensureTrailingEmptyBarangRow([createEmptyBarangRow()]),
  };
}

export function SuratJalanEditForm({
  item,
  onNewData,
  customerOptions = [],
  noPoOptions = [],
  noPoCustomerMap = {},
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onSave,
  onDelete,
  title,
  description,
  showPreview,
  colorTone = "slate",
  formStyle = "default",
}: SuratJalanEditFormProps) {
  const { locale, t } = useI18n();
  const { theme } = useTheme();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const selectPlaceholder = (fieldKey: string) =>
    t("common.placeholder.select", { field: t(fieldKey) });
  const [form, setForm] = useState<SuratJalanFormState>(() =>
    item ? toFormState(item) : createEmptySuratJalanFormState()
  );
  const tone = toneStyles[colorTone];
  const style = formStyles[formStyle];
  const inputClassName = `mt-1 w-full rounded-lg px-3 py-2 text-sm ${style.input}`;
  const barangInputClassName = `w-full rounded-lg px-3 py-2 text-sm ${style.input}`;
  const noPoSelectStyles = useMemo<StylesConfig<NoPoSelectOption, false>>(() => {
    const isDark = theme === "dark";

    return {
      control: (base, state) => ({
        ...base,
        minHeight: 42,
        borderRadius: 10,
        borderColor: state.isFocused
          ? isDark
            ? "#38bdf8"
            : "#0ea5e9"
          : isDark
            ? "#334155"
            : "#cbd5e1",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        boxShadow: state.isFocused
          ? `0 0 0 1px ${isDark ? "#38bdf8" : "#0ea5e9"}`
          : "none",
        "&:hover": {
          borderColor: isDark ? "#38bdf8" : "#0ea5e9",
        },
      }),
      menu: (base) => ({
        ...base,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
      }),
      menuList: (base) => ({
        ...base,
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? isDark
            ? "#38bdf8"
            : "#0ea5e9"
          : state.isFocused
            ? isDark
              ? "#1e293b"
              : "#e0f2fe"
            : isDark
              ? "#0f172a"
              : "#ffffff",
        color: state.isSelected ? (isDark ? "#020617" : "#ffffff") : isDark ? "#e2e8f0" : "#0f172a",
      }),
      input: (base) => ({
        ...base,
        color: isDark ? "#e2e8f0" : "#0f172a",
      }),
      singleValue: (base) => ({
        ...base,
        color: isDark ? "#e2e8f0" : "#0f172a",
      }),
      placeholder: (base) => ({
        ...base,
        color: isDark ? "#94a3b8" : "#64748b",
      }),
    };
  }, [theme]);

  const previewBarang = useMemo(() => barangRowsToList(form.barangRows), [form.barangRows]);
  const normalizedNoPoOptions = useMemo(() => {
    const noPoSet = new Set<string>();

    noPoOptions.forEach((option) => {
      const normalizedOption = String(option || "").trim();

      if (!normalizedOption) {
        return;
      }

      noPoSet.add(normalizedOption);
    });

    if (form.noPo) {
      noPoSet.add(form.noPo);
    }

    return Array.from(noPoSet.values());
  }, [form.noPo, noPoOptions]);
  const normalizedNoPoCustomerMap = useMemo(() => {
    const map = new Map<string, string>();

    Object.entries(noPoCustomerMap).forEach(([noPo, idCustomer]) => {
      const noPoKey = String(noPo || "").trim();
      const idCustomerValue = String(idCustomer || "").trim();

      if (!noPoKey || !idCustomerValue) {
        return;
      }

      map.set(noPoKey, idCustomerValue);
    });

    return map;
  }, [noPoCustomerMap]);
  const noPoSelectOptions = useMemo(() => {
    return normalizedNoPoOptions.map((noPoOption) => ({
      value: noPoOption,
      label: noPoOption,
    }));
  }, [normalizedNoPoOptions]);
  const selectedNoPoOption = useMemo<NoPoSelectOption | null>(() => {
    const noPoValue = String(form.noPo || "").trim();

    if (!noPoValue) {
      return null;
    }

    const existingOption = noPoSelectOptions.find((option) => option.value === noPoValue);
    return existingOption || { value: noPoValue, label: noPoValue };
  }, [form.noPo, noPoSelectOptions]);
  const selectedNoPoCustomerId = useMemo(() => {
    const selectedNoPo = String(form.noPo || "").trim();

    if (!selectedNoPo) {
      return "";
    }

    return normalizedNoPoCustomerMap.get(selectedNoPo) || "";
  }, [form.noPo, normalizedNoPoCustomerMap]);
  const effectiveIdCustomer = selectedNoPoCustomerId || form.idCustomer;
  const isCustomerLockedByNoPo = Boolean(selectedNoPoCustomerId);
  const normalizedCustomerOptions = useMemo(() => {
    const customerMap = new Map<string, string>();

    customerOptions.forEach((customer) => {
      const id = String(customer.id || "").trim();
      const nama = String(customer.nama || "").trim();

      if (!id) {
        return;
      }

      customerMap.set(id, nama || id);
    });

    if (effectiveIdCustomer && !customerMap.has(effectiveIdCustomer)) {
      customerMap.set(effectiveIdCustomer, effectiveIdCustomer);
    }

    return Array.from(customerMap.entries()).map(([id, nama]) => ({
      id,
      nama,
    }));
  }, [customerOptions, effectiveIdCustomer]);
  const customerLabelMap = useMemo(() => {
    return new Map(normalizedCustomerOptions.map((customer) => [customer.id, customer.nama]));
  }, [normalizedCustomerOptions]);
  const previewCustomerLabel =
    customerLabelMap.get(effectiveIdCustomer) || effectiveIdCustomer || "-";

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

  function handleNoPoChange(option: SingleValue<NoPoSelectOption>) {
    const noPo = String(option?.value || "").trim();
    const mappedCustomerId = normalizedNoPoCustomerMap.get(noPo) || "";

    setForm((prev) => ({
      ...prev,
      noPo: noPo,
      idCustomer: mappedCustomerId || prev.idCustomer,
    }));
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
                placeholder={inputPlaceholder("field.noSuratJalan")}
                className={inputClassName}
              />
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.noPo")}
              <div className="mt-1">
                <Select
                  inputId="surat-jalan-no-po-select"
                  value={selectedNoPoOption}
                  options={noPoSelectOptions}
                  isClearable={true}
                  isDisabled={isSaving || isDeleting}
                  placeholder={t("suratJalan.form.noPoSelectPlaceholder")}
                  noOptionsMessage={() => t("suratJalan.form.noPoNoOptions")}
                  styles={noPoSelectStyles}
                  onChange={handleNoPoChange}
                />
              </div>
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.tanggal")}
                <AppDateInput
                  value={form.tanggal}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, tanggal: value }))}
                  className={inputClassName}
                />
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.kodeDepartemen")}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("common.optional")}
              </p>
              <input
                value={form.kodeDepartemen}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, kodeDepartemen: event.target.value }))
                }
                placeholder={inputPlaceholder("field.kodeDepartemen")}
                className={inputClassName}
              />
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.kendaraan")}
              <input
                value={form.kendaraan}
                onChange={(event) => setForm((prev) => ({ ...prev, kendaraan: event.target.value }))}
                placeholder={inputPlaceholder("field.kendaraan")}
                className={inputClassName}
              />
            </label>

            <label className={`text-sm sm:col-span-2 ${tone.label}`}>
              {t("field.namaCustomer")}
              <select
                value={effectiveIdCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, idCustomer: event.target.value }))}
                disabled={isSaving || isDeleting || isCustomerLockedByNoPo}
                className={inputClassName}
              >
                <option value="">{selectPlaceholder("field.namaCustomer")}</option>
                {normalizedCustomerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.nama}
                  </option>
                ))}
              </select>
              {isCustomerLockedByNoPo ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("suratJalan.form.customerLockedByNoPo")}
                </p>
              ) : null}
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

            <div className={`text-sm sm:col-span-2 ${tone.label}`}>
              <p>{t("suratJalan.form.items.title")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("suratJalan.form.items.hint")}</p>
              <div className="mt-2 space-y-2">
                {form.barangRows.map((row, index) => (
                  <div key={`barang-row-${index}`} className="grid gap-2 sm:grid-cols-4">
                    <input
                      type="text"
                      value={row.nama}
                      placeholder={t("suratJalan.form.items.placeholder.name")}
                      onChange={(event) => updateBarangRow(index, "nama", event.target.value)}
                      className={barangInputClassName}
                    />
                    <input
                      type="text"
                      value={row.spesifikasi}
                      placeholder={t("suratJalan.form.items.placeholder.spec")}
                      onChange={(event) => updateBarangRow(index, "spesifikasi", event.target.value)}
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
                    <input
                      type="text"
                      value={row.unit}
                      placeholder={t("suratJalan.form.items.placeholder.unit")}
                      onChange={(event) => updateBarangRow(index, "unit", event.target.value)}
                      className={barangInputClassName}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onSave?.({ ...form, idCustomer: effectiveIdCustomer }, item)}
              disabled={isSaving || isDeleting}
              className={`w-full rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${tone.primaryButton}`}
            >
              {isSaving ? t("common.loading") : t("common.saveChanges")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => {
                onNewData?.();
                setForm(createEmptySuratJalanFormState());
              }}
              className={`w-full rounded-lg px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${tone.resetButton}`}
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => setForm(item ? toFormState(item) : createEmptySuratJalanFormState())}
              className={`w-full rounded-lg px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${tone.resetButton}`}
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <button
                type="button"
                onClick={() => void onDelete?.(item)}
                disabled={isSaving || isDeleting}
                className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </button>
            ) : null}
          </div>
          {actionErrorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {actionErrorMessage}
            </p>
          ) : null}
        </div>

        {showPreview ? (
          <div className={style.previewCard}>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("suratJalan.preview.title")}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("field.noSuratJalan")}:</span> {form.noSuratJalan || "-"}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("field.noPo")}:</span> {form.noPo || "-"}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("field.tanggal")}:</span> {formatTanggal(form.tanggal, locale)}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("field.kodeDepartemen")}:</span>{" "}
                {form.kodeDepartemen || "-"}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("field.namaCustomer")}:</span> {previewCustomerLabel}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("field.kendaraan")}:</span> {form.kendaraan || "-"}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("field.tipe")}:</span> {form.tipe}
              </p>
            </div>

            <div className={`mt-3 ${style.previewBarangBox}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                {t("field.barang")}
              </p>
              {previewBarang.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  {previewBarang.map((barang) => (
                    <li key={`${barang.nama}-${barang.spesifikasi || "-"}-${barang.jumlah}-${barang.unit || "-"}`}>
                      {barang.spesifikasi ? `${barang.nama} (${barang.spesifikasi})` : barang.nama}: {barang.jumlah}{" "}
                      {barang.unit || "-"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.noItems")}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
