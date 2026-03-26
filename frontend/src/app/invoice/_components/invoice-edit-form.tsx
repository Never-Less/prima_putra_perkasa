"use client";

import { useMemo, useState } from "react";
import {
  calculateInvoiceSummary,
  createEmptyInvoiceBarangRow,
  ensureTrailingEmptyInvoiceBarangRow,
  formatRupiah,
  formatTanggal,
  invoiceNoSuratJalanListLabel,
  invoiceNoSuratJalanTextToList,
  invoiceBarangRowsToList,
  toInvoiceFormState,
  type InvoiceBarangFormRow,
  type InvoiceFormState,
  type InvoiceItem,
} from "../_lib/invoice";
import { useI18n } from "../../_i18n/provider";

type InvoiceEditFormProps = {
  item?: InvoiceItem;
  initialForm?: InvoiceFormState;
  onNewData?: () => void;
  customerOptions?: Array<{ id: string; nama: string }>;
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
    noSuratJalanText: "",
    idCustomer: "",
    isPpn: true,
    ppnRate: "11",
    barangRows: ensureTrailingEmptyInvoiceBarangRow([createEmptyInvoiceBarangRow()]),
  };
}

export function InvoiceEditForm({
  item,
  initialForm,
  onNewData,
  customerOptions = [],
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onSave,
  onDelete,
}: InvoiceEditFormProps) {
  const { locale, t } = useI18n();
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

  const summary = useMemo(() => {
    const ppnRateNumber = Number(form.ppnRate || "0");
    const normalizedPpnRate = Number.isFinite(ppnRateNumber) ? ppnRateNumber : 0;

    return calculateInvoiceSummary(barangList, form.isPpn, normalizedPpnRate);
  }, [barangList, form.isPpn, form.ppnRate]);

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

    if (form.idCustomer && !customerMap.has(form.idCustomer)) {
      customerMap.set(form.idCustomer, form.idCustomer);
    }

    return Array.from(customerMap.entries()).map(([id, nama]) => ({
      id,
      nama,
    }));
  }, [customerOptions, form.idCustomer]);
  const customerLabelMap = useMemo(() => {
    return new Map(normalizedCustomerOptions.map((customer) => [customer.id, customer.nama]));
  }, [normalizedCustomerOptions]);
  const previewCustomerLabel = customerLabelMap.get(form.idCustomer) || form.idCustomer || "-";

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
              <input
                type="date"
                value={form.tanggal}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggal: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noInvoice")}
              <input
                value={form.noInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, noInvoice: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noPo")}
              <input
                value={form.noPo}
                onChange={(event) => setForm((prev) => ({ ...prev, noPo: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noSuratJalan")}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("invoice.form.noSuratJalanHint")}</p>
              <textarea
                rows={3}
                value={form.noSuratJalanText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, noSuratJalanText: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.namaCustomer")}
              <select
                value={form.idCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, idCustomer: event.target.value }))}
                disabled={isSaving || isDeleting}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">-</option>
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
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                      className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_1fr]"
                    >
                      <input
                        type="text"
                        value={row.namaBarang}
                        placeholder={t("invoice.form.items.placeholder.name")}
                        onChange={(event) => updateBarangRow(index, "namaBarang", event.target.value)}
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
              onClick={() => void onSave?.(form, item)}
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
              <span className="text-slate-500 dark:text-slate-400">{t("field.noPo")}:</span> {form.noPo || "-"}
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
                    {barang.namaBarang}: {barang.kuantitas} {barang.unit} x{" "}
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
