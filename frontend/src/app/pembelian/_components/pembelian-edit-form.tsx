"use client";

import { useMemo, useState } from "react";
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
  const [form, setForm] = useState<PembelianFormState>(() =>
    item
      ? (() => {
          const mappedForm = toPembelianFormState(item);

          return {
            ...mappedForm,
            idInvoice: ensureValidIdInvoice(mappedForm.idInvoice, invoiceOptions),
          };
        })()
      : initialForm
        ? {
            ...initialForm,
            idInvoice: ensureValidIdInvoice(initialForm.idInvoice, invoiceOptions),
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

  const invoiceLabelMap = useMemo(() => {
    return new Map(normalizedInvoiceOptions.map((option) => [option.id, option.noInvoice]));
  }, [normalizedInvoiceOptions]);
  const previewInvoiceLabel = invoiceLabelMap.get(effectiveIdInvoice) || effectiveIdInvoice || "-";

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900">{t("pembelian.form.title")}</h2>
        <p className="text-sm text-sky-800">{t("pembelian.form.description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-transparent bg-slate-100/80 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              {t("field.tanggalNota")}
              <input
                type="date"
                value={form.tanggalNota}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggalNota: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.nilaiNota")}
              <input
                type="number"
                min={0}
                value={form.nilaiNota}
                onChange={(event) => setForm((prev) => ({ ...prev, nilaiNota: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700 sm:col-span-2">
              {t("field.namaSupplier")}
              <input
                value={form.namaSupplier}
                onChange={(event) => setForm((prev) => ({ ...prev, namaSupplier: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.noNpwp")}
              <input
                value={form.noNpwp}
                onChange={(event) => setForm((prev) => ({ ...prev, noNpwp: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.noInvoice")}
              <select
                value={effectiveIdInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, idInvoice: event.target.value }))}
                disabled={normalizedInvoiceOptions.length === 0}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
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

            <label className="text-sm text-slate-700">
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
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.ppn")}
              <select
                value={String(form.ppn)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    ppn: event.target.value === "true",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.lamaHutang")}
              <p className="mt-1 text-xs text-slate-500">{t("pembelian.lamaHutang.note")}</p>
              <input
                type="number"
                min={0}
                value={form.lamaHutang}
                disabled={!form.hutang}
                onChange={(event) => setForm((prev) => ({ ...prev, lamaHutang: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.tanggalJatuhTempo")}
              <p aria-hidden="true" className="mt-1 text-xs text-transparent select-none">
                {t("pembelian.lamaHutang.note")}
              </p>
              <input
                type="date"
                value={form.tanggalJatuhTempo}
                disabled={!form.hutang}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tanggalJatuhTempo: event.target.value }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.tanggalBayar")}
              <input
                type="date"
                value={form.tanggalBayar}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggalBayar: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSave?.({ ...form, idInvoice: effectiveIdInvoice }, item)}
              disabled={isSaving || isDeleting}
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                  });
                  return;
                }

                if (initialForm) {
                  setForm({
                    ...initialForm,
                    idInvoice: ensureValidIdInvoice(initialForm.idInvoice, invoiceOptions),
                  });
                  return;
                }

                setForm(createEmptyPembelianFormState(invoiceOptions));
              }}
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="rounded-xl border border-transparent bg-slate-100/70 p-4">
          <p className="text-sm font-semibold text-slate-900">{t("pembelian.preview.title")}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>
              <span className="text-slate-500">{t("field.tanggalNota")}:</span>{" "}
              {formatTanggal(form.tanggalNota, locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.namaSupplier")}:</span> {form.namaSupplier || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.noNpwp")}:</span> {form.noNpwp || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.noInvoice")}:</span> {previewInvoiceLabel}
            </p>
            <p>
              <span className="text-slate-500">{t("field.hutang")}:</span>{" "}
              {form.hutang ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500">{t("field.ppn")}:</span>{" "}
              {form.ppn ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500">{t("field.lamaHutang")}:</span>{" "}
              {form.hutang ? form.lamaHutang || "0" : "0"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.nilaiNota")}:</span>{" "}
              {formatRupiah(Number(form.nilaiNota || "0"), locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.tanggalJatuhTempo")}:</span>{" "}
              {formatTanggal(form.tanggalJatuhTempo || null, locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.tanggalBayar")}:</span>{" "}
              {formatTanggal(form.tanggalBayar || null, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
