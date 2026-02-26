"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateInvoiceSummary,
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
import { sampleCustomerNameOptions } from "../../customer/_lib/customer";
import { useI18n } from "../../_i18n/provider";

type InvoiceEditFormProps = {
  item: InvoiceItem;
};

export function InvoiceEditForm({ item }: InvoiceEditFormProps) {
  const { locale, t } = useI18n();
  const [form, setForm] = useState<InvoiceFormState>(() => toInvoiceFormState(item));

  useEffect(() => {
    setForm(toInvoiceFormState(item));
  }, [item]);

  const barangList = useMemo(() => invoiceBarangRowsToList(form.BarangRows), [form.BarangRows]);
  const noSuratJalanList = useMemo(
    () => invoiceNoSuratJalanTextToList(form.NoSuratJalanText),
    [form.NoSuratJalanText]
  );

  const summary = useMemo(() => {
    const ppnRateNumber = Number(form.PpnRate || "0");
    const normalizedPpnRate = Number.isFinite(ppnRateNumber) ? ppnRateNumber : 0;

    return calculateInvoiceSummary(barangList, form.IsPpn, normalizedPpnRate);
  }, [barangList, form.IsPpn, form.PpnRate]);

  function updateBarangRow(index: number, field: keyof InvoiceBarangFormRow, value: string) {
    setForm((prev) => {
      const nextRows = prev.BarangRows.map((row, rowIndex) => {
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
        BarangRows: ensureTrailingEmptyInvoiceBarangRow(nextRows),
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
              {t("field.Tanggal")}
              <input
                type="date"
                value={form.Tanggal}
                onChange={(event) => setForm((prev) => ({ ...prev, Tanggal: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.NoInvoice")}
              <input
                value={form.NoInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, NoInvoice: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.NoPO")}
              <input
                value={form.NoPO}
                onChange={(event) => setForm((prev) => ({ ...prev, NoPO: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.NoSuratJalan")}
              <p className="mt-1 text-xs text-slate-500">{t("invoice.form.noSuratJalanHint")}</p>
              <textarea
                rows={3}
                value={form.NoSuratJalanText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, NoSuratJalanText: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700 sm:col-span-2">
              {t("field.NamaCustomer")}
              <select
                value={form.IdCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, IdCustomer: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                {sampleCustomerNameOptions.map((customerName) => (
                  <option key={customerName} value={customerName}>
                    {customerName}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.IsPpn")}
              <select
                value={String(form.IsPpn)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    IsPpn: event.target.value === "true",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.PpnRate")}
              <input
                type="number"
                min={0}
                max={100}
                value={form.PpnRate}
                onChange={(event) => setForm((prev) => ({ ...prev, PpnRate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <div className="text-sm text-slate-700 sm:col-span-2">
              <p>{t("invoice.form.items.title")}</p>
              <p className="text-xs text-slate-500">{t("invoice.form.items.hint")}</p>
              <div className="mt-2 space-y-2">
                {form.BarangRows.map((row, index) => {
                  const kuantitas = Number(row.Kuantitas || "0");
                  const hargaSatuan = Number(row.HargaSatuan || "0");
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
                        value={row.NamaBarang}
                        placeholder={t("invoice.form.items.placeholder.name")}
                        onChange={(event) => updateBarangRow(index, "NamaBarang", event.target.value)}
                        className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.Kuantitas}
                        placeholder={t("invoice.form.items.placeholder.qty")}
                        onChange={(event) => updateBarangRow(index, "Kuantitas", event.target.value)}
                        className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <input
                        type="text"
                        value={row.Unit}
                        placeholder={t("invoice.form.items.placeholder.unit")}
                        onChange={(event) => updateBarangRow(index, "Unit", event.target.value)}
                        className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.HargaSatuan}
                        placeholder={t("invoice.form.items.placeholder.price")}
                        onChange={(event) => updateBarangRow(index, "HargaSatuan", event.target.value)}
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
              onClick={() => setForm(toInvoiceFormState(item))}
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
              <span className="text-slate-500">{t("field.Tanggal")}:</span> {formatTanggal(form.Tanggal, locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NoInvoice")}:</span> {form.NoInvoice || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NoPO")}:</span> {form.NoPO || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NoSuratJalan")}:</span>{" "}
              {invoiceNoSuratJalanListLabel(noSuratJalanList)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NamaCustomer")}:</span> {form.IdCustomer || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.IsPpn")}:</span> {String(form.IsPpn)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.PpnRate")}:</span> {form.PpnRate || "0"}%
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-transparent bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              {t("field.Barang")}
            </p>
            {barangList.length > 0 ? (
              <ul className="space-y-1 text-sm text-slate-700">
                {barangList.map((barang, index) => (
                  <li key={`preview-barang-${index}`}>
                    {barang.NamaBarang}: {barang.Kuantitas} {barang.Unit} x{" "}
                    {formatRupiah(barang.HargaSatuan, locale)} = {formatRupiah(barang.Jumlah, locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t("common.noItems")}</p>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <p className="text-sm text-slate-700">
              <span className="text-slate-500">{t("field.Subtotal")}:</span> {formatRupiah(summary.Subtotal, locale)}
            </p>
            <p className="text-sm text-slate-700">
              <span className="text-slate-500">{t("field.PpnAmount")}:</span> {formatRupiah(summary.PpnAmount, locale)}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              <span className="text-slate-500">{t("field.GrandTotal")}:</span> {formatRupiah(summary.GrandTotal, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
