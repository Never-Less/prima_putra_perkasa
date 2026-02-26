"use client";

import { useMemo, useState } from "react";
import {
  formatRupiah,
  formatTanggal,
  toPembelianFormState,
  type PembelianFormState,
  type PembelianItem,
} from "../_lib/pembelian";
import { sampleInvoiceRows } from "../../invoice/_lib/invoice";
import { useI18n } from "../../_i18n/provider";

type PembelianEditFormProps = {
  item: PembelianItem;
};

function ensureValidNoInvoice(value: string, options: string[]) {
  if (value && options.includes(value)) {
    return value;
  }

  return options[0] || "";
}

export function PembelianEditForm({ item }: PembelianEditFormProps) {
  const { locale, t } = useI18n();
  const noInvoiceOptions = useMemo(() => {
    return Array.from(new Set(sampleInvoiceRows.map((invoice) => invoice.noInvoice)));
  }, []);
  const [form, setForm] = useState<PembelianFormState>(() => {
    const initialForm = toPembelianFormState(item);

    return {
      ...initialForm,
      noInvoice: ensureValidNoInvoice(initialForm.noInvoice, noInvoiceOptions),
    };
  });

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
                value={form.noInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, noInvoice: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                {noInvoiceOptions.map((noInvoice) => (
                  <option key={noInvoice} value={noInvoice}>
                    {noInvoice}
                  </option>
                ))}
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
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.tanggalJatuhTempo")}
              <input
                type="date"
                value={form.tanggalJatuhTempo}
                disabled={!form.hutang}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tanggalJatuhTempo: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
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
            <button className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
              {t("common.saveChanges")}
            </button>
            <button
              onClick={() => {
                const resetForm = toPembelianFormState(item);

                setForm({
                  ...resetForm,
                  noInvoice: ensureValidNoInvoice(resetForm.noInvoice, noInvoiceOptions),
                });
              }}
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50"
            >
              {t("common.resetForm")}
            </button>
          </div>
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
              <span className="text-slate-500">{t("field.noInvoice")}:</span> {form.noInvoice || "-"}
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
