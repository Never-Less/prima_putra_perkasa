"use client";

import { useMemo, useState } from "react";
import { AppDateInput } from "../../_components/app-date-input";
import {
  formatRupiah,
  formatTanggal,
  toPembelianFormState,
  type PembelianFormState,
  type PembelianInvoiceOption,
  type PembelianItem,
} from "../_lib/pembelian";
import { useI18n } from "../../_i18n/provider";

type PembelianEditFormProps = {
  item?: PembelianItem;
  initialForm?: PembelianFormState;
  invoiceOptions?: PembelianInvoiceOption[];
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onNewData?: () => void;
  onSave?: (form: PembelianFormState, selectedItem?: PembelianItem) => Promise<void> | void;
  onDelete?: (selectedItem: PembelianItem) => Promise<void> | void;
};

function ensureValidIdInvoice(value: string, options: PembelianInvoiceOption[]) {
  if (value && options.some((option) => option.id === value)) {
    return value;
  }

  return options[0]?.id || "";
}

function createEmptyPembelianFormState(invoiceOptions: PembelianInvoiceOption[]): PembelianFormState {
  return {
    tanggalNota: "",
    namaSupplier: "",
    noNpwp: "",
    idInvoice: ensureValidIdInvoice("", invoiceOptions),
    hutang: false,
    ppn: false,
    lamaHutang: "0",
    nilaiNota: "0",
    tanggalJatuhTempo: "",
    tanggalBayar: "",
  };
}

export function PembelianEditForm({
  item,
  initialForm,
  invoiceOptions = [],
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onNewData,
  onSave,
  onDelete,
}: PembelianEditFormProps) {
  const { locale, t } = useI18n();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const [form, setForm] = useState<PembelianFormState>(() =>
    item
      ? (() => {
          const mappedForm = toPembelianFormState(item);

          return {
            ...mappedForm,
            idInvoice: ensureValidIdInvoice(mappedForm.idInvoice, invoiceOptions),
            tanggalBayar: mappedForm.hutang ? "" : mappedForm.tanggalBayar,
          };
        })()
      : initialForm
        ? {
            ...initialForm,
            idInvoice: ensureValidIdInvoice(initialForm.idInvoice, invoiceOptions),
            tanggalBayar: initialForm.hutang ? "" : initialForm.tanggalBayar,
          }
        : createEmptyPembelianFormState(invoiceOptions)
  );

  const normalizedInvoiceOptions = useMemo(() => {
    const optionMap = new Map<string, string>();

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
  }, [form.idInvoice, invoiceOptions]);

  const effectiveIdInvoice = form.idInvoice || normalizedInvoiceOptions[0]?.id || "";
  const nilaiNota = Number(form.nilaiNota || 0);
  const normalizedNilaiNota = Number.isFinite(nilaiNota) ? nilaiNota : 0;

  const invoiceLabelMap = useMemo(() => {
    return new Map(normalizedInvoiceOptions.map((option) => [option.id, option.noInvoice]));
  }, [normalizedInvoiceOptions]);
  const previewInvoiceLabel = invoiceLabelMap.get(effectiveIdInvoice) || effectiveIdInvoice || "-";

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("pembelian.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">{t("pembelian.form.description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalNota")}
              <AppDateInput
                value={form.tanggalNota}
                onValueChange={(value) => setForm((prev) => ({ ...prev, tanggalNota: value }))}
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
              <input
                value={form.namaSupplier}
                onChange={(event) => setForm((prev) => ({ ...prev, namaSupplier: event.target.value }))}
                placeholder={inputPlaceholder("field.namaSupplier")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noNpwp")}
              <input
                value={form.noNpwp}
                onChange={(event) => setForm((prev) => ({ ...prev, noNpwp: event.target.value }))}
                placeholder={inputPlaceholder("field.noNpwp")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noInvoice")}
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
                    tanggalJatuhTempo: isHutang ? prev.tanggalJatuhTempo : "",
                    tanggalBayar: isHutang ? "" : prev.tanggalBayar,
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
                onChange={(event) => setForm((prev) => ({ ...prev, lamaHutang: event.target.value }))}
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
                onValueChange={(value) => setForm((prev) => ({ ...prev, tanggalJatuhTempo: value }))}
                className="mt-1 h-10 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalBayar")}
              <AppDateInput
                value={form.hutang ? "" : form.tanggalBayar}
                disabled={form.hutang}
                onValueChange={(value) => setForm((prev) => ({ ...prev, tanggalBayar: value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() =>
                void onSave?.(
                  {
                    ...form,
                    idInvoice: effectiveIdInvoice,
                  },
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
              onClick={() => {
                onNewData?.();
                setForm(createEmptyPembelianFormState(invoiceOptions));
              }}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => {
                if (item) {
                  const resetForm = toPembelianFormState(item);

                  setForm({
                    ...resetForm,
                    idInvoice: ensureValidIdInvoice(resetForm.idInvoice, invoiceOptions),
                    tanggalBayar: resetForm.hutang ? "" : resetForm.tanggalBayar,
                  });
                  return;
                }

                if (initialForm) {
                  setForm({
                    ...initialForm,
                    idInvoice: ensureValidIdInvoice(initialForm.idInvoice, invoiceOptions),
                    tanggalBayar: initialForm.hutang ? "" : initialForm.tanggalBayar,
                  });
                  return;
                }

                setForm(createEmptyPembelianFormState(invoiceOptions));
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
              <span className="text-slate-500 dark:text-slate-400">{t("field.noNpwp")}:</span> {form.noNpwp || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noInvoice")}:</span> {previewInvoiceLabel}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.hutang")}:</span>{" "}
              {form.hutang ? t("common.true") : t("common.false")}
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
              {formatTanggal(form.hutang ? null : form.tanggalBayar || null, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
