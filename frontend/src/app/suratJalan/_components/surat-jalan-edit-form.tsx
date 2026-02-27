"use client";

import { useMemo, useState } from "react";
import type { SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";
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

function createEmptySuratJalanFormState(): SuratJalanFormState {
  return {
    noSuratJalan: "",
    noPo: "",
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
  const [form, setForm] = useState<SuratJalanFormState>(() =>
    item ? toFormState(item) : createEmptySuratJalanFormState()
  );
  const tone = toneStyles[colorTone];
  const style = formStyles[formStyle];
  const inputClassName = `mt-1 w-full rounded-lg px-3 py-2 text-sm ${style.input}`;
  const barangInputClassName = `w-full rounded-lg px-3 py-2 text-sm ${style.input}`;

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
                className={inputClassName}
              />
            </label>

            <label className={`text-sm ${tone.label}`}>
              {t("field.noPo")}
              <div className="mt-1">
                <CreatableSelect
                  inputId="surat-jalan-no-po-select"
                  value={selectedNoPoOption}
                  options={noPoSelectOptions}
                  isClearable={true}
                  isDisabled={isSaving || isDeleting}
                  placeholder={t("suratJalan.form.noPoSelectPlaceholder")}
                  noOptionsMessage={() => t("suratJalan.form.noPoNoOptions")}
                  formatCreateLabel={(inputValue) =>
                    t("suratJalan.form.noPoCreateLabel", {
                      value: inputValue,
                    })
                  }
                  onChange={handleNoPoChange}
                  onCreateOption={(inputValue) =>
                    setForm((prev) => ({
                      ...prev,
                      noPo: String(inputValue || "").trim(),
                      idCustomer:
                        normalizedNoPoCustomerMap.get(String(inputValue || "").trim()) ||
                        prev.idCustomer,
                    }))
                  }
                />
              </div>
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
                value={effectiveIdCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, idCustomer: event.target.value }))}
                disabled={isSaving || isDeleting || isCustomerLockedByNoPo}
                className={inputClassName}
              >
                <option value="">-</option>
                {normalizedCustomerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.nama}
                  </option>
                ))}
              </select>
              {isCustomerLockedByNoPo ? (
                <p className="mt-1 text-xs text-slate-500">
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
            <button
              type="button"
              onClick={() => void onSave?.({ ...form, idCustomer: effectiveIdCustomer }, item)}
              disabled={isSaving || isDeleting}
              className={`rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${tone.primaryButton}`}
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
              className={`rounded-lg px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${tone.resetButton}`}
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => setForm(item ? toFormState(item) : createEmptySuratJalanFormState())}
              className={`rounded-lg px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${tone.resetButton}`}
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <button
                type="button"
                onClick={() => void onDelete?.(item)}
                disabled={isSaving || isDeleting}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </button>
            ) : null}
          </div>
          {actionErrorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionErrorMessage}
            </p>
          ) : null}
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
                <span className="text-slate-500">{t("field.namaCustomer")}:</span> {previewCustomerLabel}
              </p>
              <p>
                <span className="text-slate-500">{t("field.kendaraan")}:</span> {form.kendaraan || "-"}
              </p>
              <p>
                <span className="text-slate-500">{t("field.tipe")}:</span> {form.tipe}
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
