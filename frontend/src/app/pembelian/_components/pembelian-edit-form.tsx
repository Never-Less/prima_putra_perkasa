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
    return Array.from(new Set(sampleInvoiceRows.map((invoice) => invoice.NoInvoice)));
  }, []);
  const [form, setForm] = useState<PembelianFormState>(() => {
    const initialForm = toPembelianFormState(item);

    return {
      ...initialForm,
      NoInvoice: ensureValidNoInvoice(initialForm.NoInvoice, noInvoiceOptions),
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
              {t("field.TanggalNota")}
              <input
                type="date"
                value={form.TanggalNota}
                onChange={(event) => setForm((prev) => ({ ...prev, TanggalNota: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.NilaiNota")}
              <input
                type="number"
                min={0}
                value={form.NilaiNota}
                onChange={(event) => setForm((prev) => ({ ...prev, NilaiNota: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700 sm:col-span-2">
              {t("field.NamaSupplier")}
              <input
                value={form.NamaSupplier}
                onChange={(event) => setForm((prev) => ({ ...prev, NamaSupplier: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.NoNpwp")}
              <input
                value={form.NoNpwp}
                onChange={(event) => setForm((prev) => ({ ...prev, NoNpwp: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.NoInvoice")}
              <select
                value={form.NoInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, NoInvoice: event.target.value }))}
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
              {t("field.Hutang")}
              <select
                value={String(form.Hutang)}
                onChange={(event) => {
                  const isHutang = event.target.value === "true";

                  setForm((prev) => ({
                    ...prev,
                    Hutang: isHutang,
                    LamaHutang: isHutang ? prev.LamaHutang : "0",
                    TanggalJatuhTempo: isHutang ? prev.TanggalJatuhTempo : "",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.Ppn")}
              <select
                value={String(form.Ppn)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    Ppn: event.target.value === "true",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              {t("field.LamaHutang")}
              <p className="mt-1 text-xs text-slate-500">{t("pembelian.lamaHutang.note")}</p>
              <input
                type="number"
                min={0}
                value={form.LamaHutang}
                disabled={!form.Hutang}
                onChange={(event) => setForm((prev) => ({ ...prev, LamaHutang: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.TanggalJatuhTempo")}
              <input
                type="date"
                value={form.TanggalJatuhTempo}
                disabled={!form.Hutang}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, TanggalJatuhTempo: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.TanggalBayar")}
              <input
                type="date"
                value={form.TanggalBayar}
                onChange={(event) => setForm((prev) => ({ ...prev, TanggalBayar: event.target.value }))}
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
                  NoInvoice: ensureValidNoInvoice(resetForm.NoInvoice, noInvoiceOptions),
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
              <span className="text-slate-500">{t("field.TanggalNota")}:</span>{" "}
              {formatTanggal(form.TanggalNota, locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NamaSupplier")}:</span> {form.NamaSupplier || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NoNpwp")}:</span> {form.NoNpwp || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NoInvoice")}:</span> {form.NoInvoice || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.Hutang")}:</span>{" "}
              {form.Hutang ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500">{t("field.Ppn")}:</span>{" "}
              {form.Ppn ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500">{t("field.LamaHutang")}:</span>{" "}
              {form.Hutang ? form.LamaHutang || "0" : "0"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.NilaiNota")}:</span>{" "}
              {formatRupiah(Number(form.NilaiNota || "0"), locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.TanggalJatuhTempo")}:</span>{" "}
              {formatTanggal(form.TanggalJatuhTempo || null, locale)}
            </p>
            <p>
              <span className="text-slate-500">{t("field.TanggalBayar")}:</span>{" "}
              {formatTanggal(form.TanggalBayar || null, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
