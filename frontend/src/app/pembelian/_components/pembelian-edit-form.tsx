"use client";

import { useId, useMemo, useState } from "react";
import type { SingleValue, StylesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";
import { AppDateInput } from "../../_components/app-date-input";
import {
  requestUnsavedChangesConfirmation,
  serializeUnsavedChangesValue,
  useUnsavedChangesWarning,
} from "../../_hooks/use-unsaved-changes-warning";
import {
  formatRupiah,
  formatTanggal,
  pembelianStockInvoiceId,
  toPembelianFormState,
  type PembelianFormState,
  type PembelianInvoiceOption,
  type PembelianItem,
} from "../_lib/pembelian";
import { type SupplierItem } from "../../supplier/_lib/supplier";
import { useI18n } from "../../_i18n/provider";
import { DocumentAuditLog } from "../../_components/document-audit-log";
import { useTheme } from "../../_theme/provider";

type SupplierSelectOption = {
  value: string;
  label: string;
  supplier?: SupplierItem;
};

type PembelianEditFormProps = {
  item?: PembelianItem;
  initialForm?: PembelianFormState;
  invoiceOptions?: PembelianInvoiceOption[];
  supplierOptions?: SupplierItem[];
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onSave?: (form: PembelianFormState, selectedItem?: PembelianItem) => Promise<void> | void;
  onNewData?: () => void;
  onDelete?: (selectedItem: PembelianItem) => Promise<void> | void;
};

function resolveInitialIdInvoice(value: string, options: PembelianInvoiceOption[]) {
  const idInvoice = String(value || "").trim();

  if (idInvoice) {
    return idInvoice;
  }

  return options[0]?.id || pembelianStockInvoiceId;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateTanggalJatuhTempo(tanggalNota: string, lamaHutang: string, hutang: boolean) {
  if (!hutang) {
    return "";
  }

  const tanggalNotaValue = String(tanggalNota || "").trim();
  const lamaHutangValue = Math.trunc(Number(lamaHutang || "0"));

  if (!tanggalNotaValue || !Number.isFinite(lamaHutangValue) || lamaHutangValue <= 0) {
    return "";
  }

  const isoDateMatch = tanggalNotaValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tanggalNotaDate = isoDateMatch
    ? new Date(Number(isoDateMatch[1]), Number(isoDateMatch[2]) - 1, Number(isoDateMatch[3]))
    : new Date(tanggalNotaValue);

  if (Number.isNaN(tanggalNotaDate.getTime())) {
    return "";
  }

  tanggalNotaDate.setDate(tanggalNotaDate.getDate() + lamaHutangValue);
  return formatDateInputValue(tanggalNotaDate);
}

function withCalculatedTanggalJatuhTempo(form: PembelianFormState): PembelianFormState {
  return {
    ...form,
    tanggalJatuhTempo: calculateTanggalJatuhTempo(
      form.tanggalNota,
      form.lamaHutang,
      form.hutang
    ),
  };
}

function createEmptyPembelianFormState(invoiceOptions: PembelianInvoiceOption[]): PembelianFormState {
  return {
    tanggalNota: "",
    namaSupplier: "",
    idSupplier: "",
    noNota: "",
    note: "",
    idInvoice: resolveInitialIdInvoice("", invoiceOptions),
    hutang: false,
    ppn: false,
    lamaHutang: "0",
    nilaiNota: "0",
    tanggalJatuhTempo: "",
    tanggalBayar: "",
  };
}

function createInitialPembelianFormState({
  item,
  initialForm,
  invoiceOptions,
}: {
  item?: PembelianItem;
  initialForm?: PembelianFormState;
  invoiceOptions: PembelianInvoiceOption[];
}) {
  if (item) {
    const mappedForm = toPembelianFormState(item);

    return withCalculatedTanggalJatuhTempo({
      ...mappedForm,
      idInvoice: resolveInitialIdInvoice(mappedForm.idInvoice, invoiceOptions),
    });
  }

  if (initialForm) {
    return withCalculatedTanggalJatuhTempo({
      ...initialForm,
      idInvoice: resolveInitialIdInvoice(initialForm.idInvoice, invoiceOptions),
    });
  }

  return createEmptyPembelianFormState(invoiceOptions);
}

export function PembelianEditForm({
  item,
  initialForm,
  invoiceOptions = [],
  supplierOptions = [],
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onSave,
  onNewData,
  onDelete,
}: PembelianEditFormProps) {
  const { locale, t } = useI18n();
  const { theme } = useTheme();
  const supplierSelectId = useId();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const selectPlaceholder = (fieldKey: string) =>
    t("common.placeholder.select", { field: t(fieldKey) });
  const stockInvoiceLabel = t("pembelian.stockInvoiceLabel");
  const [supplierInputValue, setSupplierInputValue] = useState("");
  const baselineForm = useMemo(
    () => createInitialPembelianFormState({ item, initialForm, invoiceOptions }),
    [initialForm, invoiceOptions, item]
  );
  const [form, setForm] = useState<PembelianFormState>(() => baselineForm);
  const isDirty =
    serializeUnsavedChangesValue({ form, supplierInputValue }) !==
    serializeUnsavedChangesValue({ form: baselineForm, supplierInputValue: "" });

  useUnsavedChangesWarning(
    isDirty && !isSaving && !isDeleting,
    t("common.unsavedChangesWarning")
  );

  const handleNewData = async () => {
    const canLeave = await requestUnsavedChangesConfirmation(t("common.unsavedChangesWarning"));

    if (!canLeave) {
      return;
    }

    setSupplierInputValue("");
    setForm(createEmptyPembelianFormState(invoiceOptions));
    onNewData?.();
  };

  const normalizedInvoiceOptions = useMemo(() => {
    const optionMap = new Map<string, string>([
      [pembelianStockInvoiceId, stockInvoiceLabel],
    ]);

    invoiceOptions.forEach((option) => {
      const id = String(option.id || "").trim();
      const noInvoice = String(option.noInvoice || "").trim();

      if (!id) {
        return;
      }

      optionMap.set(id, noInvoice || id);
    });

    if (form.idInvoice && !optionMap.has(form.idInvoice)) {
      optionMap.set(form.idInvoice, form.idInvoice);
    }

    return Array.from(optionMap.entries()).map(([id, noInvoice]) => ({
      id,
      noInvoice,
    }));
  }, [form.idInvoice, invoiceOptions, stockInvoiceLabel]);

  const normalizedSupplierOptions = useMemo(() => {
    const supplierMap = new Map<string, SupplierItem>();

    supplierOptions.forEach((supplier) => {
      const id = String(supplier.id || "").trim();
      const namaSupplier = String(supplier.namaSupplier || "").trim();

      if (!id || !namaSupplier) {
        return;
      }

      supplierMap.set(id, {
        ...supplier,
        namaSupplier,
      });
    });

    if (form.idSupplier && form.namaSupplier && !supplierMap.has(form.idSupplier)) {
      supplierMap.set(form.idSupplier, {
        id: form.idSupplier,
        namaSupplier: form.namaSupplier,
        legalCompanyName: "", supplierType: "", supplierTypeOther: "",
        hutang: form.hutang,
        lamaHutang: form.hutang ? Number(form.lamaHutang || 0) : null,
        alamat: "", npwp: "", picName: "", phone: "", whatsapp: "", email: "",
        productBrands: [], onboarding: { status: "notGenerated" },
        productCategories: [], notes: "", documentLinks: [], documents: [], isActive: true,
        createdAt: "",
        updatedAt: "",
      });
    }

    return Array.from(supplierMap.values());
  }, [form.hutang, form.idSupplier, form.lamaHutang, form.namaSupplier, supplierOptions]);

  const supplierSelectOptions = useMemo<SupplierSelectOption[]>(() => {
    return normalizedSupplierOptions.map((supplier) => ({
      value: supplier.id,
      label: supplier.namaSupplier,
      supplier,
    }));
  }, [normalizedSupplierOptions]);

  const selectedSupplierOption = useMemo<SupplierSelectOption | null>(() => {
    const idSupplier = String(form.idSupplier || "").trim();
    const namaSupplier = String(form.namaSupplier || "").trim();
    const normalizedNamaSupplier = namaSupplier.toLowerCase();

    if (idSupplier) {
      const optionById = supplierSelectOptions.find((option) => option.value === idSupplier);

      if (optionById) {
        return optionById;
      }
    }

    if (normalizedNamaSupplier) {
      const optionByName = supplierSelectOptions.find(
        (option) => option.label.trim().toLowerCase() === normalizedNamaSupplier
      );

      if (optionByName) {
        return optionByName;
      }

      return {
        value: idSupplier || `current:${namaSupplier}`,
        label: namaSupplier,
      };
    }

    return null;
  }, [form.idSupplier, form.namaSupplier, supplierSelectOptions]);

  const effectiveIdInvoice = form.idInvoice || pembelianStockInvoiceId;
  const nilaiNota = Number(form.nilaiNota || 0);
  const normalizedNilaiNota = Number.isFinite(nilaiNota) ? nilaiNota : 0;

  const invoiceLabelMap = useMemo(() => {
    return new Map(normalizedInvoiceOptions.map((option) => [option.id, option.noInvoice]));
  }, [normalizedInvoiceOptions]);
  const previewInvoiceLabel = invoiceLabelMap.get(effectiveIdInvoice) || effectiveIdInvoice || "-";
  const isDark = theme === "dark";
  const selectStyles = useMemo<StylesConfig<SupplierSelectOption, false>>(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 42,
        borderRadius: 8,
        borderColor: state.isFocused ? (isDark ? "#38bdf8" : "#7dd3fc") : isDark ? "#334155" : "#bae6fd",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        boxShadow: state.isFocused ? `0 0 0 1px ${isDark ? "#38bdf8" : "#0ea5e9"}` : "none",
        "&:hover": {
          borderColor: isDark ? "#38bdf8" : "#0ea5e9",
        },
      }),
      menu: (base) => ({
        ...base,
        zIndex: 20,
        borderRadius: 8,
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
    }),
    [isDark]
  );

  function handleSupplierChange(option: SingleValue<SupplierSelectOption>) {
    setSupplierInputValue("");

    if (!option) {
      setForm((prev) => ({
        ...prev,
        idSupplier: "",
        namaSupplier: "",
        hutang: false,
        lamaHutang: "0",
        tanggalJatuhTempo: "",
      }));
      return;
    }

    const selectedSupplier = option.supplier;

    if (!selectedSupplier) {
      setForm((prev) => ({
        ...prev,
        idSupplier: "",
        namaSupplier: option.label,
      }));
      return;
    }

    const nextHutang = Boolean(selectedSupplier.hutang);
    const nextLamaHutang = nextHutang ? String(selectedSupplier.lamaHutang || "") : "0";

    setForm((prev) => ({
      ...prev,
      idSupplier: selectedSupplier.id,
      namaSupplier: selectedSupplier.namaSupplier,
      hutang: nextHutang,
      lamaHutang: nextLamaHutang,
      tanggalJatuhTempo: calculateTanggalJatuhTempo(prev.tanggalNota, nextLamaHutang, nextHutang),
    }));
  }

  function applyManualSupplierName(namaSupplier: string) {
    const nextNamaSupplier = String(namaSupplier || "").trim();

    if (!nextNamaSupplier) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      idSupplier: "",
      namaSupplier: nextNamaSupplier,
    }));
  }

  function handleSupplierCreate(namaSupplier: string) {
    applyManualSupplierName(namaSupplier);
    setSupplierInputValue("");
  }

  function buildSaveForm() {
    const manualSupplierName = supplierInputValue.trim();

    return {
      ...form,
      idSupplier: manualSupplierName ? "" : selectedSupplierOption?.supplier?.id || form.idSupplier,
      namaSupplier: manualSupplierName || form.namaSupplier,
      idInvoice: effectiveIdInvoice,
    };
  }

  return (
    <section className="ppp-form-view rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("pembelian.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">{t("pembelian.form.description")}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalNota")}
              <AppDateInput
                value={form.tanggalNota}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    tanggalNota: value,
                    tanggalJatuhTempo: calculateTanggalJatuhTempo(value, prev.lamaHutang, prev.hutang),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.nilaiNota")}
              <input
                type="number"
                min={0}
                value={form.nilaiNota}
                onChange={(event) => setForm((prev) => ({ ...prev, nilaiNota: event.target.value }))}
                placeholder={inputPlaceholder("field.nilaiNota")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.namaSupplier")}
              <CreatableSelect<SupplierSelectOption, false>
                inputId={supplierSelectId}
                instanceId="pembelian-supplier-select"
                value={selectedSupplierOption}
                inputValue={supplierInputValue}
                options={supplierSelectOptions}
                onChange={handleSupplierChange}
                onCreateOption={handleSupplierCreate}
                onInputChange={(value, actionMeta) => {
                  if (actionMeta.action === "input-change") {
                    setSupplierInputValue(value);
                  }
                }}
                onBlur={() => {
                  applyManualSupplierName(supplierInputValue);
                  setSupplierInputValue("");
                }}
                formatCreateLabel={(value) =>
                  t("pembelian.form.createSupplierOption", { namaSupplier: value })
                }
                isValidNewOption={(value) => Boolean(value.trim())}
                placeholder={selectPlaceholder("field.namaSupplier")}
                noOptionsMessage={() => t("common.noData")}
                isClearable
                styles={selectStyles}
                className="mt-1"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noNota")}
              <input
                value={form.noNota}
                onChange={(event) => setForm((prev) => ({ ...prev, noNota: event.target.value }))}
                placeholder={inputPlaceholder("field.noNota")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.note")}
              <textarea
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder={inputPlaceholder("field.note")}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("pembelian.form.noInvoiceLabel")}
              <select
                value={effectiveIdInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, idInvoice: event.target.value }))}
                disabled={normalizedInvoiceOptions.length === 0}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {normalizedInvoiceOptions.length === 0 ? (
                  <option value="">{t("common.noData")}</option>
                ) : (
                  normalizedInvoiceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.noInvoice}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.hutang")}
              <select
                value={String(form.hutang)}
                onChange={(event) => {
                  const isHutang = event.target.value === "true";

                  setForm((prev) => ({
                    ...prev,
                    hutang: isHutang,
                    lamaHutang: isHutang ? prev.lamaHutang : "0",
                    tanggalJatuhTempo: calculateTanggalJatuhTempo(prev.tanggalNota, prev.lamaHutang, isHutang),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.ppn")}
              <select
                value={String(form.ppn)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    ppn: event.target.value === "true",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.lamaHutang")}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("pembelian.lamaHutang.note")}</p>
              <input
                type="number"
                min={0}
                value={form.lamaHutang}
                disabled={!form.hutang}
                onChange={(event) => {
                  const lamaHutang = event.target.value;

                  setForm((prev) => ({
                    ...prev,
                    lamaHutang,
                    tanggalJatuhTempo: calculateTanggalJatuhTempo(prev.tanggalNota, lamaHutang, prev.hutang),
                  }));
                }}
                placeholder={inputPlaceholder("field.lamaHutang")}
                className="mt-1 h-10 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalJatuhTempo")}
              <p aria-hidden="true" className="mt-1 text-xs text-transparent select-none">
                {t("pembelian.lamaHutang.note")}
              </p>
              <AppDateInput
                value={form.tanggalJatuhTempo}
                disabled={!form.hutang}
                readOnly={form.hutang}
                onValueChange={() => undefined}
                className="mt-1 h-10 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalBayar")}
              <AppDateInput
                value={form.tanggalBayar}
                onValueChange={(value) => setForm((prev) => ({ ...prev, tanggalBayar: value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() =>
                void onSave?.(
                  buildSaveForm(),
                  item
                )
              }
              disabled={isSaving || isDeleting}
              className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto"
            >
              {isSaving ? t("common.loading") : t("common.saveChanges")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => void handleNewData()}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => {
                setSupplierInputValue("");
                setForm(baselineForm);
              }}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
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

        <div className="rounded-xl border border-sky-100 bg-sky-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("pembelian.preview.title")}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalNota")}:</span>{" "}
              {formatTanggal(form.tanggalNota, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.namaSupplier")}:</span> {form.namaSupplier || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noNota")}:</span> {form.noNota || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.note")}:</span> {form.note || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noInvoice")}:</span> {previewInvoiceLabel}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.hutang")}:</span>{" "}
              {form.hutang ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.statusPembayaran")}:</span>{" "}
              <span className={`font-medium ${!form.hutang || form.tanggalBayar ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                {t(!form.hutang || form.tanggalBayar ? "pembelian.status.paid" : "pembelian.status.unpaid")}
              </span>
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.ppn")}:</span>{" "}
              {form.ppn ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.lamaHutang")}:</span>{" "}
              {form.hutang ? form.lamaHutang || "0" : "0"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.nilaiNota")}:</span>{" "}
              {formatRupiah(normalizedNilaiNota, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalJatuhTempo")}:</span>{" "}
              {formatTanggal(form.tanggalJatuhTempo || null, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalBayar")}:</span>{" "}
              {formatTanggal(form.tanggalBayar || null, locale)}
            </p>
          </div>
        </div>
      </div>
      {item ? <DocumentAuditLog entityType="pembelian" entityId={item.id} /> : null}
    </section>
  );
}
