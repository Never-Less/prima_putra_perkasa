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
import { customerNameOptions } from "../../customer/_lib/customer";
import { useI18n } from "../../_i18n/provider";

type InvoiceEditFormProps = {
  item?: InvoiceItem;
  initialForm?: InvoiceFormState;
  onNewData?: () => void;
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

export function InvoiceEditForm({ item, initialForm, onNewData }: InvoiceEditFormProps) {
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

  const customerOptions = useMemo(() => {
    const options = customerNameOptions.filter(Boolean);

    if (form.idCustomer && !options.includes(form.idCustomer)) {
      return [form.idCustomer, ...options];
    }

    return options;
  }, [form.idCustomer]);

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
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900">{t("invoice.form.title")}</h2>
        <p className="text-sm text-sky-800">
          {t("invoice.form.description")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-transparent bg-slate-100/80 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              {t("field.tanggal")}
              <input
                type="date"
                value={form.tanggal}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggal: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.noInvoice")}
              <input
                value={form.noInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, noInvoice: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.noPo")}
              <input
                value={form.noPo}
                onChange={(event) => setForm((prev) => ({ ...prev, noPo: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.noSuratJalan")}
              <p className="mt-1 text-xs text-slate-500">{t("invoice.form.noSuratJalanHint")}</p>
              <textarea
                rows={3}
                value={form.noSuratJalanText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, noSuratJalanText: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700 sm:col-span-2">
              {t("field.namaCustomer")}
              <select
                value={form.idCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, idCustomer: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="">-</option>
                {customerOptions.map((customerName) => (
                  <option key={customerName} value={customerName}>
                    {customerName}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.isPpn")}
              <select
                value={String(form.isPpn)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPpn: event.target.value === "true",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.ppnRate")}
              <input
                type="number"
                min={0}
                max={100}
                value={form.ppnRate}
                onChange={(event) => setForm((prev) => ({ ...prev, ppnRate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <div className="text-sm text-slate-700 sm:col-span-2">
              <p>{t("invoice.form.items.title")}</p>
              <p className="text-xs text-slate-500">{t("invoice.form.items.hint")}</p>
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
                        className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.kuantitas}
                        placeholder={t("invoice.form.items.placeholder.qty")}
                        onChange={(event) => updateBarangRow(index, "kuantitas", event.target.value)}
                        className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <input
                        type="text"
                        value={row.unit}
                        placeholder={t("invoice.form.items.placeholder.unit")}
                        onChange={(event) => updateBarangRow(index, "unit", event.target.value)}
                        className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.hargaSatuan}
                        placeholder={t("invoice.form.items.placeholder.price")}
                        onChange={(event) => updateBarangRow(index, "hargaSatuan", event.target.value)}
                        className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <input
                        type="text"
                        value={Number.isFinite(jumlah) ? formatRupiah(jumlah, locale) : formatRupiah(0, locale)}
                        readOnly
                        className="w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
              {t("common.saveChanges")}
            </button>
            <button
              onClick={() => {
                onNewData?.();
                setForm(createEmptyInvoiceFormState());
              }}
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50"
            >
              {t("common.newData")}
            </button>
            <button
              onClick={() => setForm(item ? toInvoiceFormState(item) : createEmptyInvoiceFormState())}
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50"
            >
              {t("common.resetForm")}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-transparent bg-slate-100/70 p-4">
          <p className="text-sm font-semibold text-slate-900">{t("invoice.preview.title")}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>
              <span className="text-slate-500">{t("field.tanggal")}:</span> {formatTanggal(form.tanggal, locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.noInvoice")}:</span> {form.noInvoice || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.noPo")}:</span> {form.noPo || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.noSuratJalan")}:</span>{" "}
              {invoiceNoSuratJalanListLabel(noSuratJalanList)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.namaCustomer")}:</span> {form.idCustomer || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.isPpn")}:</span> {String(form.isPpn)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.ppnRate")}:</span> {form.ppnRate || "0"}%
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-transparent bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              {t("field.barang")}
            </p>
            {barangList.length > 0 ? (
              <ul className="space-y-1 text-sm text-slate-700">
                {barangList.map((barang, index) => (
                  <li key={`preview-barang-${index}`}>
                    {barang.namaBarang}: {barang.kuantitas} {barang.unit} x{" "}
                    {formatRupiah(barang.hargaSatuan, locale)} = {formatRupiah(barang.jumlah, locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t("common.noItems")}</p>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <p className="text-sm text-slate-700">
              <span className="text-slate-500">{t("field.subtotal")}:</span> {formatRupiah(summary.subtotal, locale)}
            </p>
            <p className="text-sm text-slate-700">
              <span className="text-slate-500">{t("field.ppnAmount")}:</span> {formatRupiah(summary.ppnAmount, locale)}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              <span className="text-slate-500">{t("field.grandTotal")}:</span> {formatRupiah(summary.grandTotal, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
