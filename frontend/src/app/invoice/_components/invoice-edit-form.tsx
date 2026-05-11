"use client";

import Select, { type MultiValue, type StylesConfig } from "react-select";
import { useMemo, useState } from "react";
import { AppDateInput } from "../../_components/app-date-input";
import {
  buildInvoiceBarangRowsFromSuratJalanSelection,
  calculateInvoiceSummary,
  createEmptyInvoiceBarangRow,
  ensureTrailingEmptyInvoiceBarangRow,
  formatInvoiceBarangLabel,
  formatRupiah,
  formatTanggal,
  invoiceNoSuratJalanListLabel,
  invoiceNoSuratJalanListToText,
  invoiceNoSuratJalanTextToList,
  invoiceBarangRowsToList,
  invoiceNoPoListLabel,
  toInvoiceFormState,
  type InvoiceBarangFormRow,
  type InvoiceFormState,
  type InvoiceItem,
  type InvoiceSuratJalanOption,
} from "../_lib/invoice";
import { useI18n } from "../../_i18n/provider";
import { useTheme } from "../../_theme/provider";

type SelectOption = {
  value: string;
  label: string;
  idCustomer?: string;
};

type InvoiceEditFormProps = {
  item?: InvoiceItem;
  initialForm?: InvoiceFormState;
  onNewData?: () => void;
  customerOptions?: Array<{ id: string; nama: string }>;
  suratJalanOptions?: InvoiceSuratJalanOption[];
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onSave?: (form: InvoiceFormState, selectedItem?: InvoiceItem) => Promise<void> | void;
  onDelete?: (selectedItem: InvoiceItem) => Promise<void> | void;
};

function createEmptyInvoiceFormState(): InvoiceFormState {
  return {
    tanggal: "",
    noInvoice: "",
    noPo: "",
    noPoList: [],
    noSuratJalanText: "",
    idCustomer: "",
    isPpn: true,
    isPaid: false,
    tanggalBayar: "",
    ppnRate: "11",
    barangRows: ensureTrailingEmptyInvoiceBarangRow([createEmptyInvoiceBarangRow()]),
  };
}

export function InvoiceEditForm({
  item,
  initialForm,
  onNewData,
  customerOptions = [],
  suratJalanOptions = [],
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onSave,
  onDelete,
}: InvoiceEditFormProps) {
  const { locale, t } = useI18n();
  const { theme } = useTheme();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const selectPlaceholder = (fieldKey: string) =>
    t("common.placeholder.select", { field: t(fieldKey) });
  const paidLabel = t("invoice.status.paid");
  const unpaidLabel = t("invoice.status.unpaid");
  const [form, setForm] = useState<InvoiceFormState>(() =>
    item
      ? toInvoiceFormState(item)
      : initialForm
        ? {
            ...initialForm,
            barangRows: ensureTrailingEmptyInvoiceBarangRow(initialForm.barangRows),
          }
        : createEmptyInvoiceFormState()
  );

  const barangList = useMemo(() => invoiceBarangRowsToList(form.barangRows), [form.barangRows]);
  const noSuratJalanList = useMemo(
    () => invoiceNoSuratJalanTextToList(form.noSuratJalanText),
    [form.noSuratJalanText]
  );
  const isDark = theme === "dark";
  const selectStyles = useMemo<StylesConfig<SelectOption, boolean>>(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 42,
        borderRadius: 10,
        borderColor: state.isFocused ? (isDark ? "#38bdf8" : "#7dd3fc") : isDark ? "#334155" : "#bae6fd",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        boxShadow: state.isFocused ? `0 0 0 1px ${isDark ? "#38bdf8" : "#0ea5e9"}` : "none",
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
      multiValue: (base) => ({
        ...base,
        backgroundColor: isDark ? "#334155" : "#e0f2fe",
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: isDark ? "#e2e8f0" : "#0c4a6e",
      }),
      multiValueRemove: (base) => ({
        ...base,
        color: isDark ? "#cbd5e1" : "#0369a1",
        ":hover": {
          backgroundColor: isDark ? "#475569" : "#bae6fd",
          color: isDark ? "#ffffff" : "#0c4a6e",
        },
      }),
    }),
    [isDark]
  );

  const summary = useMemo(() => {
    const ppnRateNumber = Number(form.ppnRate || "0");
    const normalizedPpnRate = Number.isFinite(ppnRateNumber) ? ppnRateNumber : 0;

    return calculateInvoiceSummary(barangList, form.isPpn, normalizedPpnRate);
  }, [barangList, form.isPpn, form.ppnRate]);
  const normalizedSuratJalanOptions = useMemo(() => {
    const optionMap = new Map<string, InvoiceSuratJalanOption>();

    suratJalanOptions.forEach((option) => {
      const noPo = String(option.noPo || "").trim();
      const idCustomer = String(option.idCustomer || "").trim();
      const noSuratJalanValues = Array.isArray(option.noSuratJalan)
        ? option.noSuratJalan
            .map((item) => ({
              noSuratJalan: String(item.noSuratJalan || "").trim(),
              barang: Array.isArray(item.barang) ? item.barang : [],
            }))
            .filter((item) => item.noSuratJalan)
        : [];

      if (!noPo || noSuratJalanValues.length === 0) {
        return;
      }

      const existingOption = optionMap.get(noPo);

      if (!existingOption) {
        optionMap.set(noPo, {
          noPo,
          idCustomer,
          noSuratJalan: noSuratJalanValues,
        });
        return;
      }

      const rowMap = new Map(
        existingOption.noSuratJalan.map((item) => [item.noSuratJalan, item] as const)
      );

      noSuratJalanValues.forEach((value) => {
        rowMap.set(value.noSuratJalan, value);
      });

      optionMap.set(noPo, {
        noPo,
        idCustomer: existingOption.idCustomer || idCustomer,
        noSuratJalan: Array.from(rowMap.values()),
      });
    });

    form.noPoList.forEach((selectedNoPo, index) => {
      const existingOption = optionMap.get(selectedNoPo);

      if (!existingOption) {
        optionMap.set(selectedNoPo, {
          noPo: selectedNoPo,
          idCustomer: form.idCustomer,
          noSuratJalan:
            index === 0
              ? noSuratJalanList.map((value) => ({
                  noSuratJalan: value,
                  barang: [],
                }))
              : [],
        });
        return;
      }

      if (index === 0) {
        const rowMap = new Map(existingOption.noSuratJalan.map((item) => [item.noSuratJalan, item] as const));

        noSuratJalanList.forEach((value) => {
          if (!rowMap.has(value)) {
            rowMap.set(value, {
              noSuratJalan: value,
              barang: [],
            });
          }
        });

        optionMap.set(selectedNoPo, {
          noPo: existingOption.noPo,
          idCustomer: existingOption.idCustomer || form.idCustomer,
          noSuratJalan: Array.from(rowMap.values()),
        });
      }
    });

    return Array.from(optionMap.entries())
      .map(([, option]) => ({
        ...option,
        noSuratJalan: [...option.noSuratJalan].sort((left, right) =>
          left.noSuratJalan.localeCompare(right.noSuratJalan)
        ),
      }))
      .sort((left, right) => left.noPo.localeCompare(right.noPo));
  }, [form.idCustomer, form.noPoList, noSuratJalanList, suratJalanOptions]);
  const selectedNoPoDataList = useMemo(() => {
    const selectedNoPoSet = new Set(form.noPoList);

    return normalizedSuratJalanOptions.filter((option) => selectedNoPoSet.has(option.noPo));
  }, [form.noPoList, normalizedSuratJalanOptions]);
  const selectedNoPoCustomerIds = useMemo(() => {
    return Array.from(
      new Set(
        selectedNoPoDataList
          .map((option) => String(option.idCustomer || "").trim())
          .filter(Boolean)
      )
    );
  }, [selectedNoPoDataList]);
  const autoSelectedIdCustomer = selectedNoPoCustomerIds.length === 1 ? selectedNoPoCustomerIds[0] : "";
  const effectiveIdCustomer = autoSelectedIdCustomer || form.idCustomer;
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
  const previewCustomerLabel = customerLabelMap.get(effectiveIdCustomer) || effectiveIdCustomer || "-";
  const noPoSelectOptions = useMemo<SelectOption[]>(() => {
    return normalizedSuratJalanOptions.map((option) => ({
      value: option.noPo,
      label: option.noPo,
      idCustomer: option.idCustomer,
    }));
  }, [normalizedSuratJalanOptions]);
  const selectedNoPoOptions = useMemo<SelectOption[]>(() => {
    return form.noPoList.map((noPo) => {
      return (
        noPoSelectOptions.find((option) => option.value === noPo) || {
          value: noPo,
          label: noPo,
          idCustomer: form.idCustomer,
        }
      );
    });
  }, [form.idCustomer, form.noPoList, noPoSelectOptions]);
  const availableNoSuratJalanOptions = useMemo<SelectOption[]>(() => {
    const optionMap = new Map<string, SelectOption>();

    selectedNoPoDataList.forEach((option) => {
      option.noSuratJalan.forEach((value) => {
        if (optionMap.has(value.noSuratJalan)) {
          return;
        }

        optionMap.set(value.noSuratJalan, {
          value: value.noSuratJalan,
          label:
            form.noPoList.length > 1
              ? `${value.noSuratJalan} - ${option.noPo}`
              : value.noSuratJalan,
        });
      });
    });

    return Array.from(optionMap.values());
  }, [form.noPoList.length, selectedNoPoDataList]);
  const selectedNoSuratJalanOptions = useMemo<SelectOption[]>(() => {
    return noSuratJalanList.map((value) => ({
      value,
      label: value,
    }));
  }, [noSuratJalanList]);
  const isCustomerAutoSelected = Boolean(form.noPoList.length > 0 && autoSelectedIdCustomer);

  function updateBarangRow(index: number, field: keyof InvoiceBarangFormRow, value: string) {
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
        barangRows: ensureTrailingEmptyInvoiceBarangRow(nextRows),
      };
    });
  }

  function handleNoPoChange(options: MultiValue<SelectOption>) {
    const nextNoPoList = Array.from(
      new Set(options.map((option) => String(option.value || "").trim()).filter(Boolean))
    );

    setForm((prev) => {
      const selectedOptions = normalizedSuratJalanOptions.filter((item) =>
        nextNoPoList.includes(item.noPo)
      );
      const selectedCustomerIds = Array.from(
        new Set(
          selectedOptions
            .map((option) => String(option.idCustomer || "").trim())
            .filter(Boolean)
        )
      );
      const nextNoSuratJalan = selectedOptions.flatMap((option) =>
        option.noSuratJalan.map((item) => item.noSuratJalan)
      );
      const nextIdCustomer = selectedCustomerIds.length === 1 ? selectedCustomerIds[0] : "";

      return {
        ...prev,
        noPo: invoiceNoPoListLabel(nextNoPoList),
        noPoList: nextNoPoList,
        noSuratJalanText: invoiceNoSuratJalanListToText(nextNoSuratJalan),
        idCustomer: nextNoPoList.length > 0 ? nextIdCustomer : "",
        barangRows: buildInvoiceBarangRowsFromSuratJalanSelection(
          normalizedSuratJalanOptions,
          nextNoPoList,
          nextNoSuratJalan,
          prev.barangRows
        ),
      };
    });
  }

  function handleNoSuratJalanChange(options: MultiValue<SelectOption>) {
    const nextValueMap = new Map<string, string>();

    options.forEach((option) => {
      const value = String(option.value || "").trim();
      const key = value.toLowerCase();

      if (value && !nextValueMap.has(key)) {
        nextValueMap.set(key, value);
      }
    });

    const nextValues = Array.from(nextValueMap.values());

    setForm((prev) => ({
      ...prev,
      noSuratJalanText: invoiceNoSuratJalanListToText(nextValues),
      barangRows: buildInvoiceBarangRowsFromSuratJalanSelection(
        normalizedSuratJalanOptions,
        prev.noPoList,
        nextValues,
        prev.barangRows
      ),
    }));
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("invoice.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">
          {t("invoice.form.description")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggal")}
                <AppDateInput
                  value={form.tanggal}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, tanggal: value }))}
                  className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noInvoice")}
              <input
                value={form.noInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, noInvoice: event.target.value }))}
                placeholder={inputPlaceholder("field.noInvoice")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noPo")}
              <div className="mt-1">
                <Select<SelectOption, true>
                  inputId="invoice-no-po-select"
                  isMulti={true}
                  value={selectedNoPoOptions}
                  options={noPoSelectOptions}
                  isClearable={true}
                  closeMenuOnSelect={false}
                  isDisabled={isSaving || isDeleting}
                  isOptionDisabled={(option) =>
                    Boolean(autoSelectedIdCustomer && option.idCustomer && option.idCustomer !== autoSelectedIdCustomer)
                  }
                  placeholder={t("invoice.form.noPoSelectPlaceholder")}
                  noOptionsMessage={() => t("invoice.form.noPoNoOptions")}
                  styles={selectStyles}
                  onChange={handleNoPoChange}
                />
              </div>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noSuratJalan")}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("invoice.form.noSuratJalanHint")}</p>
              <div className="mt-1">
                <Select<SelectOption, true>
                  inputId="invoice-no-surat-jalan-select"
                  isMulti={true}
                  value={selectedNoSuratJalanOptions}
                  options={availableNoSuratJalanOptions}
                  isDisabled={isSaving || isDeleting || form.noPoList.length === 0}
                  placeholder={
                    form.noPoList.length > 0
                      ? t("invoice.form.noSuratJalanSelectPlaceholder")
                      : t("invoice.form.noSuratJalanDisabledHint")
                  }
                  noOptionsMessage={() => t("invoice.form.noSuratJalanNoOptions")}
                  styles={selectStyles}
                  onChange={handleNoSuratJalanChange}
                />
              </div>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.namaCustomer")}
              {isCustomerAutoSelected ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("invoice.form.customerAutoHint")}
                </p>
              ) : null}
              <select
                value={effectiveIdCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, idCustomer: event.target.value }))}
                disabled={isSaving || isDeleting || isCustomerAutoSelected}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              >
                <option value="">{selectPlaceholder("field.namaCustomer")}</option>
                {normalizedCustomerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.nama}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.isPpn")}
              <select
                value={String(form.isPpn)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPpn: event.target.value === "true",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.ppnRate")}
              <input
                type="number"
                min={0}
                max={100}
                value={form.ppnRate}
                onChange={(event) => setForm((prev) => ({ ...prev, ppnRate: event.target.value }))}
                placeholder={inputPlaceholder("field.ppnRate")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.isPaid")}
              <select
                value={String(form.isPaid)}
                onChange={(event) => {
                  const isPaid = event.target.value === "true";

                  setForm((prev) => ({
                    ...prev,
                    isPaid,
                    tanggalBayar: isPaid ? prev.tanggalBayar : "",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="true">{paidLabel}</option>
                <option value="false">{unpaidLabel}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalBayar")}
              <AppDateInput
                value={form.isPaid ? form.tanggalBayar : ""}
                onValueChange={(value) => setForm((prev) => ({ ...prev, tanggalBayar: value }))}
                disabled={!form.isPaid}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              />
            </label>

            <div className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              <p>{t("invoice.form.items.title")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("invoice.form.items.hint")}</p>
              <div className="mt-2 space-y-2">
                {form.barangRows.map((row, index) => {
                  const kuantitas = Number(row.kuantitas || "0");
                  const hargaSatuan = Number(row.hargaSatuan || "0");
                  const jumlah = Number.isFinite(kuantitas) && Number.isFinite(hargaSatuan)
                    ? kuantitas * hargaSatuan
                    : 0;

                  return (
                    <div
                      key={`invoice-barang-row-${index}`}
                      className="grid gap-2 sm:grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_1fr_1fr]"
                    >
                      <input
                        type="text"
                        value={row.namaBarang}
                        placeholder={t("invoice.form.items.placeholder.name")}
                        onChange={(event) => updateBarangRow(index, "namaBarang", event.target.value)}
                        className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={row.spesifikasi}
                        placeholder={t("invoice.form.items.placeholder.spec")}
                        onChange={(event) => updateBarangRow(index, "spesifikasi", event.target.value)}
                        className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.kuantitas}
                        placeholder={t("invoice.form.items.placeholder.qty")}
                        onChange={(event) => updateBarangRow(index, "kuantitas", event.target.value)}
                        className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={row.unit}
                        placeholder={t("invoice.form.items.placeholder.unit")}
                        onChange={(event) => updateBarangRow(index, "unit", event.target.value)}
                        className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.hargaSatuan}
                        placeholder={t("invoice.form.items.placeholder.price")}
                        onChange={(event) => updateBarangRow(index, "hargaSatuan", event.target.value)}
                        className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={Number.isFinite(jumlah) ? formatRupiah(jumlah, locale) : formatRupiah(0, locale)}
                        readOnly
                        className="w-full rounded-lg border border-sky-100 bg-sky-100/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() =>
                void onSave?.(
                  effectiveIdCustomer !== form.idCustomer
                    ? {
                        ...form,
                        idCustomer: effectiveIdCustomer,
                      }
                    : form,
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
              onClick={() => {
                onNewData?.();
                setForm(createEmptyInvoiceFormState());
              }}
              disabled={isSaving || isDeleting}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              onClick={() => setForm(item ? toInvoiceFormState(item) : createEmptyInvoiceFormState())}
              disabled={isSaving || isDeleting}
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
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("invoice.preview.title")}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggal")}:</span> {formatTanggal(form.tanggal, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noInvoice")}:</span> {form.noInvoice || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noPo")}:</span>{" "}
              {invoiceNoPoListLabel(form.noPoList) || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noSuratJalan")}:</span>{" "}
              {invoiceNoSuratJalanListLabel(noSuratJalanList)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.namaCustomer")}:</span> {previewCustomerLabel}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.isPpn")}:</span> {String(form.isPpn)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.isPaid")}:</span>{" "}
              {form.isPaid ? paidLabel : unpaidLabel}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalBayar")}:</span>{" "}
              {formatTanggal(form.isPaid ? form.tanggalBayar || null : null, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.ppnRate")}:</span> {form.ppnRate || "0"}%
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-sky-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {t("field.barang")}
            </p>
            {barangList.length > 0 ? (
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                {barangList.map((barang, index) => (
                  <li key={`preview-barang-${index}`}>
                    {formatInvoiceBarangLabel(barang.namaBarang, barang.spesifikasi)}: {barang.kuantitas} {barang.unit} x{" "}
                    {formatRupiah(barang.hargaSatuan, locale)} = {formatRupiah(barang.jumlah, locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.noItems")}</p>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-dashed border-sky-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              <span className="text-slate-500 dark:text-slate-400">{t("field.subtotal")}:</span> {formatRupiah(summary.subtotal, locale)}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              <span className="text-slate-500 dark:text-slate-400">{t("field.ppnAmount")}:</span> {formatRupiah(summary.ppnAmount, locale)}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              <span className="text-slate-500 dark:text-slate-400">{t("field.grandTotal")}:</span> {formatRupiah(summary.grandTotal, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
